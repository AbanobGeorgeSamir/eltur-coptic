const mongoose = require('mongoose');

const photoAssetSchema = new mongoose.Schema({
    data: { type: Buffer, required: true, select: false },
    contentType: {
        type: String,
        enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
        required: true,
    },
    filename: { type: String, required: true, maxlength: 120 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

module.exports = mongoose.model('PhotoAsset', photoAssetSchema);
