// -----------------------------------------------------------
// models/FCRProject.js - Separated model file

const mongoose = require('mongoose');

const fcrProjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    description: {
        type: String,
        maxLength: 500,
        default: ''
    },
    processedData: [{
        id: String,
        index: Number,
        description: String,
        poNumbers: String,
        goods: String,
        invoiceNo: String,
        invoiceDate: String,
        adCode: String,
        expSerial: String,
        expYear: String,
        entryDate: String,
        lcContact: String,
        contactDate: String,
        countryCode: String,
        formattedText: String
    }],
    copiedBoxes: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    copyHistory: [{
        type: String
    }],
    totalBoxes: {
        type: Number,
        default: 0
    },
    copiedCount: {
        type: Number,
        default: 0
    },
    completionPercentage: {
        type: Number,
        default: 0
    },
    tags: [{
        type: String,
        trim: true
    }],
    isArchived: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: String,
        default: 'system'
    },
    lastExportDate: {
        type: Date
    },
    exportCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for calculating completion percentage
fcrProjectSchema.virtual('calculatedCompletionPercentage').get(function () {
    if (!this.processedData || this.processedData.length === 0) return 0;
    const copiedCount = Object.keys(this.copiedBoxes || {}).length;
    return Math.round((copiedCount / this.processedData.length) * 100);
});

// Pre-save middleware to update statistics
fcrProjectSchema.pre('save', function (next) {
    if (this.processedData) {
        this.totalBoxes = this.processedData.length;
        this.copiedCount = Object.keys(this.copiedBoxes || {}).length;
        this.completionPercentage = this.totalBoxes > 0
            ? Math.round((this.copiedCount / this.totalBoxes) * 100)
            : 0;
    }
    next();
});

// Index for better query performance
fcrProjectSchema.index({ name: 1, createdBy: 1 });
fcrProjectSchema.index({ createdAt: -1 });
fcrProjectSchema.index({ updatedAt: -1 });
fcrProjectSchema.index({ isArchived: 1 });

module.exports = mongoose.model('FCRProject', fcrProjectSchema);