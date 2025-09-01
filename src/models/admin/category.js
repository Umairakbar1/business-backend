import mongoose from "mongoose";
const { Schema, model } = mongoose;

const CategorySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        trim: true
    },
    image: {
        url: {
            type: String
        },
        public_id: {
            type: String
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'draft', 'archived'],
        default: 'active'
    },
    color: {
        type: String
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    metaTitle: {
        type: String,
        trim: true
    },
    metaDescription: {
        type: String,
        trim: true
    },
    parentCategory: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true
});

// Create slug from title before saving
CategorySchema.pre('save', function(next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    next();
});
  
const Category = model('Category', CategorySchema);
export default Category;
  