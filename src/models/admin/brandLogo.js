import mongoose from "mongoose";
const { Schema, model } = mongoose;

const BrandLogoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        default: "Brand Logo"
    },
    description: {
        type: String,
        trim: true
    },
    logo: {
        url: {
            type: String,
            required: true
        },
        public_id: {
            type: String,
            required: true
        },
        width: Number,
        height: Number,
        format: String,
        bytes: Number
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Index for faster queries
BrandLogoSchema.index({ uploadedBy: 1 });

const BrandLogo = model('BrandLogo', BrandLogoSchema);
export default BrandLogo;
