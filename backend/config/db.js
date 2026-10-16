const mongoose = require('mongoose');
const User = require('../models/User');
const { grades } = require('./grades');

const DEFAULT_DB_NAME = String(process.env.DB_NAME || 'eltor_coptic').trim();
const legacyAdminRolesByGrade = new Map([
    ['primary_1_3', 'admin_primary_1_3'],
    ['primary_4_6', 'admin_primary_4_6'],
    ['preparatory', 'admin_preparatory'],
    ['secondary', 'admin_secondary'],
    ['university', 'admin_university'],
    ['expatriates', 'admin_expatriates'],
]);
const legacyGlobalAdminRoleLabels = [
    'مسؤول الخدمة (الالهي)',
    'مسؤول الخدمة (الإلهي)',
    'مسؤول خدمة (أمين عام)',
];

const getMongoUri = () => String(process.env.MONGODB_URI || '').trim();
let gradeAdminRoleMigration;
let globalAdminRoleMigration;

const migrateLegacyGlobalAdminRoleLabels = () => {
    if (!globalAdminRoleMigration) {
        globalAdminRoleMigration = User.collection.updateMany(
            { role: { $in: legacyGlobalAdminRoleLabels } },
            { $set: { role: 'admin' } },
        ).catch((error) => {
            globalAdminRoleMigration = null;
            throw error;
        });
    }
    return globalAdminRoleMigration;
};

const migrateGradeAdminRoles = () => {
    if (!gradeAdminRoleMigration) {
        gradeAdminRoleMigration = Promise.all(grades.map(({ id, adminRole }) => User.collection.updateMany(
            { role: { $in: ['grade_admin', legacyAdminRolesByGrade.get(id)].filter(Boolean) }, grade: id },
            { $set: { role: adminRole } },
        ))).catch((error) => {
            gradeAdminRoleMigration = null;
            throw error;
        });
    }
    return gradeAdminRoleMigration;
};

const normalizeMongoUri = (uri) => {
    const value = String(uri || '').trim();
    if (!value) {
        return '';
    }

    const parsed = new URL(value);
    if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) {
        throw new Error('MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme.');
    }
    const tlsOption = parsed.searchParams.get('tls') ?? parsed.searchParams.get('ssl') ?? '';
    const tlsDisabled = ['false', '0'].includes(tlsOption.toLowerCase());
    const enablesTls = parsed.protocol === 'mongodb+srv:'
        ? !tlsDisabled
        : ['true', '1'].includes(tlsOption.toLowerCase());
    if ((process.env.NODE_ENV === 'production' || process.env.VERCEL) && !enablesTls) {
        throw new Error('MONGODB_URI must enable TLS in production.');
    }
    parsed.pathname = `/${DEFAULT_DB_NAME}`;
    return parsed.toString();
};

const connectDB = async () => {
    const uri = normalizeMongoUri(getMongoUri());

    if (!uri) {
        throw new Error('MONGODB_URI is not configured.');
    }

    if (mongoose.connection.readyState === 1) {
        await Promise.all([
            migrateGradeAdminRoles(),
            migrateLegacyGlobalAdminRoleLabels(),
        ]);
        return mongoose.connection;
    }

    await mongoose.connect(uri, {
        dbName: DEFAULT_DB_NAME,
        serverSelectionTimeoutMS: 10000,
    });
    await Promise.all([
        migrateGradeAdminRoles(),
        migrateLegacyGlobalAdminRoleLabels(),
    ]);

    return mongoose.connection;
};

const testConnection = async () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        throw new Error('MongoDB is not connected.');
    }

    await mongoose.connection.db.admin().ping();
};

module.exports = { connectDB, testConnection, normalizeMongoUri, DEFAULT_DB_NAME };
