const mongoose = require('mongoose');

const photoAssetSchema = new mongoose.Schema({
    data: { type: Buffer, select: false },
    contentType: {
        type: String,
        enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
        required: true,
    },
    filename: { type: String, required: true, maxlength: 120 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blobPath: { type: String, maxlength: 256 },
    blobUrl: { type: String, maxlength: 2048 },
    byteSize: { type: Number, min: 0 },
    pending: { type: Boolean, default: false, index: true },
    uploadExpiresAt: { type: Date, index: true },
}, { timestamps: true });

module.exports = mongoose.model('PhotoAsset', photoAssetSchema);
