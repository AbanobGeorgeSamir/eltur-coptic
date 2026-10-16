const mongoose = require('mongoose');
const { gradeIds, gradeAdminRoles } = require('../config/grades');
const { roleLabelFor } = require('../utils/roleLabels');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 7,
        maxlength: 160,
    },
    username: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true, maxlength: 160 },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        index: true,
        sparse: true,
        match: /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.com$/i,
    },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    interests: { type: String, trim: true, maxlength: 500 },
    grade: { type: String, enum: [...gradeIds], default: null, index: true },
    meetingGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingGroup', default: null, index: true },
    fatherName: { type: String, trim: true, maxlength: 120 },
    confessionFather: { type: String, trim: true, maxlength: 160 },
    guardianPhone: { type: String, trim: true, maxlength: 20 },
    address: { type: String, trim: true, maxlength: 500 },
    picture: { type: String, trim: true, maxlength: 2048 },
    birthDate: { type: Date },
    gender: { type: String, enum: ['male', 'female'] },
    nationalId: { type: String, trim: true, select: false },
    isDeacon: { type: Boolean, default: false },
    whatsappNumber: { type: String, trim: true, maxlength: 20 },
    privacyAcceptedAt: { type: Date },
    assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    parentApprovedStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    password: {
        type: String,
        required: true,
        select: false,
    },
    role: {
        type: String,
        enum: ['student', 'parent', 'admin', ...gradeAdminRoles],
        default: 'student',
    },
}, {
    timestamps: true,
});

userSchema.index({ role: 1, assignedAdmin: 1 });
userSchema.index({ role: 1, grade: 1, meetingGroup: 1 });
userSchema.virtual('roleLabel').get(function getRoleLabel() {
    return roleLabelFor(this.role, this.grade);
});

module.exports = mongoose.model('User', userSchema);
