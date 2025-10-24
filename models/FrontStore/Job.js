const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    branch: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['เต็มเวลา', 'นักเรียนฝึกงาน', 'พาร์ทไทม์']
    },
    salary: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    badgeColor: {
        type: String,
        enum: ['primary', 'success', 'warning', 'light'],
        default: 'primary'
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
jobSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for badge color display
jobSchema.virtual('badgeColorText').get(function() {
    const colors = {
        'primary': 'น้ำเงิน',
        'success': 'เขียว',
        'warning': 'เหลือง',
        'light': 'เทา'
    };
    return colors[this.badgeColor] || 'น้ำเงิน';
});

module.exports = mongoose.model('Job', jobSchema);
