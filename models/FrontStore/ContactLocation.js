const mongoose = require('mongoose');

const contactLocationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
contactLocationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for map embed URL
contactLocationSchema.virtual('mapEmbedUrl').get(function() {
    if (this.latitude && this.longitude) {
        return `https://www.google.com/maps?q=${this.latitude},${this.longitude}&z=15&output=embed`;
    }
    return null;
});

module.exports = mongoose.model('ContactLocation', contactLocationSchema);
