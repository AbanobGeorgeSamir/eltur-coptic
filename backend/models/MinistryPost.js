const mongoose = require('mongoose');
const { gradeIds } = require('../config/grades');

const postSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['bible', 'psalm', 'agpeya', 'sunday_lesson', 'liturgy', 'newsletter', 'gallery', 'trip'],
        required: true,
        index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, maxlength: 20000 },
    mediaUrl: { type: String, trim: true, maxlength: 2048 },
    mediaKind: { type: String, enum: ['image', 'pdf', 'link'], default: 'image' },
    eventAt: { type: Date },
    audienceMode: { type: String, enum: ['shared', 'grade'], index: true },
    grade: { type: String, enum: [...gradeIds], default: null, index: true },
    meetingGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'MeetingGroup', default: null, index: true },
    liturgyType: { type: String, enum: ['permanent', 'temporary'] },
    dayOfWeek: { type: String, enum: ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    startTime: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, match: /^(?:[01]\d|2[0-3]):[0-5]\d$/ },
    startAt: { type: Date },
    endAt: { type: Date },
    autoDeleteAt: { type: Date },
    expiredAt: { type: Date },
    feeAmount: { type: Number, min: 0, max: 1000000, default: 0 },
    assignToGroup: { type: Boolean, default: true },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    published: { type: Boolean, default: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
}, { timestamps: true });

postSchema.index({ type: 1, published: 1, createdAt: -1, _id: -1 });
postSchema.index({ type: 1, published: 1, eventAt: 1, _id: 1 });
postSchema.index({ type: 1, liturgyType: 1, published: 1, autoDeleteAt: 1 });
postSchema.index({ type: 1, grade: 1, meetingGroup: 1, published: 1, createdAt: -1 });
postSchema.index({ type: 1, audienceMode: 1, grade: 1, meetingGroup: 1, published: 1, createdAt: -1 });
postSchema.index({ admin: 1, type: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('MinistryPost', postSchema);
