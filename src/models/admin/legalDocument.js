import mongoose from "mongoose";
const { Schema, model } = mongoose;

const LegalDocumentSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['privacy-policy', 'terms-conditions', 'cookies'],
        unique: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    version: {
        type: Number,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    meta: {
        description: {
            type: String,
            trim: true
        },
        keywords: [{
            type: String,
            trim: true
        }],
        lastReviewDate: {
            type: Date
        },
        nextReviewDate: {
            type: Date
        }
    }
}, {
    timestamps: true
});

// Index for faster queries
LegalDocumentSchema.index({ type: 1, isActive: 1 });
LegalDocumentSchema.index({ createdBy: 1 });
LegalDocumentSchema.index({ lastUpdated: -1 });

// Pre-save middleware to update lastUpdated
LegalDocumentSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

const LegalDocument = model('LegalDocument', LegalDocumentSchema);
export default LegalDocument;
