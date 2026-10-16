const mongoose = require('mongoose');

const featuredVerseSchema = new mongoose.Schema({
    key: { type: String, default: 'global', unique: true, immutable: true },
    text: { type: String, required: true, trim: true, maxlength: 1200 },
    reference: { type: String, required: true, trim: true, maxlength: 160 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('FeaturedVerse', featuredVerseSchema);
