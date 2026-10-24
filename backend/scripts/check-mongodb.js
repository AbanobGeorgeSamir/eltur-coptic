require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const { connectDB, testConnection, DEFAULT_DB_NAME } = require('../config/db');

const run = async () => {
    try {
        await connectDB();
        await testConnection();
        console.log(`MongoDB connection to ${DEFAULT_DB_NAME} is healthy.`);
    } finally {
        await mongoose.disconnect();
    }
};

run().catch(() => {
    console.error('MongoDB connection test failed. Check local configuration without sharing secrets.');
    process.exitCode = 1;
});
