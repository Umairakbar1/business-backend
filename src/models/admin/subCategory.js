import mongoose from "mongoose";
const { Schema, model } = mongoose;

const SubCategorySchema = new mongoose.Schema({
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
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
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
SubCategorySchema.pre('save', function(next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    next();
});
  
const SubCategory = model('SubCategory', SubCategorySchema);
export default SubCategory;
  