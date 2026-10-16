const mongoose = require('mongoose');

const tripRegistrationSchema = new mongoose.Schema({
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'MinistryPost', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    amountDue: { type: Number, required: true, min: 0, max: 1000000, default: 0 },
    amountPaid: { type: Number, required: true, min: 0, max: 1000000, default: 0 },
}, { timestamps: true });

tripRegistrationSchema.index({ trip: 1, student: 1 }, { unique: true });
tripRegistrationSchema.index({ admin: 1, createdAt: -1 });

module.exports = mongoose.model('TripRegistration', tripRegistrationSchema);
