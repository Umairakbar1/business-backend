import mongoose from "mongoose";
const { Schema, model } = mongoose;

const LogSubCategorySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LogCategory',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active'
    },
}, {
    timestamps: true
});

const LogSubCategory = model('LogSubCategory', LogSubCategorySchema);
export default LogSubCategory; 