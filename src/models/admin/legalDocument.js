import mongoose from "mongoose";
const { Schema, model } = mongoose;

const LegalDocumentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['privacy_policy', 'terms_of_service', 'terms_and_conditions', 'refund_policy', 'shipping_policy', 'return_policy', 'disclaimer', 'cookie_policy', 'other'],
        default: 'other'
    },
    description: {
        type: String,
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
    isPublic: {
        type: Boolean,
        default: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    documentFile: {
        url: String,
        public_id: String,
        filename: String,
        size: Number,
        format: String
    }
}, {
    timestamps: true
});

// Indexes for faster queries
LegalDocumentSchema.index({ type: 1, isActive: 1 });
LegalDocumentSchema.index({ isPublic: 1, isActive: 1 });
LegalDocumentSchema.index({ uploadedBy: 1 });
LegalDocumentSchema.index({ createdAt: -1 });

const LegalDocument = model('LegalDocument', LegalDocumentSchema);
export default LegalDocument;
