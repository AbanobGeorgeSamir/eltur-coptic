const mongoose = require('mongoose');

const verseUpdateEventSchema = new mongoose.Schema({
    requestId: { type: String, required: true, unique: true, index: true, maxlength: 36 },
    title: { type: String, required: true, maxlength: 120 },
    text: { type: String, required: true, maxlength: 1200 },
    reference: { type: String, required: true, maxlength: 160 },
    deepLink: { type: String, required: true, default: 'eltorcoptic://featured-verse', maxlength: 200 },
    updatedAt: { type: Date, required: true },
    notify: { type: Boolean, default: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('VerseUpdateEvent', verseUpdateEventSchema);
