const mongoose = require('mongoose');

const confessionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    date: { type: Date, required: true },
    dayKey: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    note: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });

confessionSchema.index({ student: 1, date: -1 });
confessionSchema.index(
    { student: 1, dayKey: 1 },
    {
        unique: true,
        name: 'one_confession_per_student_day',
        partialFilterExpression: { dayKey: { $type: 'string' } },
    },
);

module.exports = mongoose.model('Confession', confessionSchema);
