const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    date: { type: Date, required: true },
    service: { type: String, trim: true, maxlength: 120, default: 'Sunday service' },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
    note: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

attendanceSchema.index({ student: 1, date: 1, service: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
