import mongoose from "mongoose";
const { Schema, model } = mongoose;

const MetadataSchema = new mongoose.Schema({
    pageName: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    pageUrl: {
        type: String,
        required: true,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 60
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160
    },
    focusKeywords: [{
        type: String,
        trim: true
    }],
    ogTitle: {
        type: String,
        trim: true,
        maxlength: 60
    },
    ogDescription: {
        type: String,
        trim: true,
        maxlength: 160
    },
    ogImage: {
        type: String,
        trim: true
    },
    canonicalUrl: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

// Index for faster queries
MetadataSchema.index({ pageName: 1, status: 1 });
MetadataSchema.index({ pageUrl: 1 });

const Metadata = model('Metadata', MetadataSchema);
export default Metadata; 