const mongoose = require('mongoose');

const dailyReadingSchema = new mongoose.Schema({
    key: { type: String, default: 'global', unique: true, immutable: true },
    bookId: { type: String, required: true, trim: true, maxlength: 12 },
    bookName: { type: String, required: true, trim: true, maxlength: 100 },
    chapter: { type: Number, required: true, min: 1, max: 200 },
    startVerse: { type: Number, required: true, min: 1, max: 300 },
    endVerse: { type: Number, required: true, min: 1, max: 300 },
    reference: { type: String, required: true, trim: true, maxlength: 200 },
    text: { type: String, required: true, trim: true, maxlength: 20000 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('DailyReading', dailyReadingSchema);
