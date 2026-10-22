const mongoose = require('mongoose');
const { gradeIds } = require('../config/grades');

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 5000 },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    audienceMode: { type: String, enum: ['shared', 'grade'], index: true },
    grade: { type: String, enum: [...gradeIds], default: null, index: true },
    meetingGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingGroup', default: null, index: true },
    assignToGroup: { type: Boolean, default: false, index: true },
    completions: [{
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        completedAt: { type: Date, default: Date.now },
        completionNote: { type: String, trim: true, maxlength: 2000 },
    }],
    dueAt: { type: Date },
    completedAt: { type: Date, default: null },
    completionNote: { type: String, trim: true, maxlength: 2000 },
}, { timestamps: true });

taskSchema.index({ admin: 1, assignToGroup: 1, createdAt: -1 });
taskSchema.index({ grade: 1, meetingGroup: 1, assignToGroup: 1, createdAt: -1 });
taskSchema.index({ audienceMode: 1, grade: 1, meetingGroup: 1, assignToGroup: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
