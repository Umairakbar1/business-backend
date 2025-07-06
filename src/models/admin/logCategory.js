import mongoose from "mongoose";
const { Schema, model } = mongoose;

const LogCategorySchema = new mongoose.Schema({
    name: {
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
    image: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LogCategory',
        default: null
    }
}, {
    timestamps: true
});

// Create slug from name before saving
LogCategorySchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    next();
});

const LogCategory = model('LogCategory', LogCategorySchema);
export default LogCategory; 