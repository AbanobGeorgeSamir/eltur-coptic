const mongoose = require('mongoose');

const prayerChecklistSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    checks: {
        morning: { type: Boolean, default: false },
        third: { type: Boolean, default: false },
        sixth: { type: Boolean, default: false },
        ninth: { type: Boolean, default: false },
        sleep: { type: Boolean, default: false },
    },
}, { timestamps: true });

prayerChecklistSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PrayerChecklist', prayerChecklistSchema);
