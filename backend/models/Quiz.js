const mongoose = require('mongoose');
const { gradeIds } = require('../config/grades');

const questionSchema = new mongoose.Schema({
    prompt: { type: String, required: true, trim: true, maxlength: 1000 },
    options: {
        type: [{ type: String, trim: true, maxlength: 300 }],
        validate: (options) => options.length >= 2 && options.length <= 6,
    },
    answerIndex: { type: Number, required: true, min: 0 },
}, { _id: false });

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    questions: { type: [questionSchema], required: true, validate: (items) => items.length > 0 && items.length <= 100 },
    published: { type: Boolean, default: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    audienceMode: { type: String, enum: ['shared', 'grade'], index: true },
    grade: { type: String, enum: [...gradeIds], default: null, index: true },
    meetingGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingGroup', default: null, index: true },
}, { timestamps: true });

quizSchema.index({ grade: 1, meetingGroup: 1, published: 1, createdAt: -1 });
quizSchema.index({ published: 1, audienceMode: 1, grade: 1, meetingGroup: 1, createdAt: -1 });

module.exports = mongoose.model('Quiz', quizSchema);
