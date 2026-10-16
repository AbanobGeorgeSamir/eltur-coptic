const mongoose = require('mongoose');
const { gradeIds } = require('../config/grades');

const meetingGroupSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    grade: { type: String, enum: [...gradeIds], required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

meetingGroupSchema.index({ grade: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('MeetingGroup', meetingGroupSchema);
