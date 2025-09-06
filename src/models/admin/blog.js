import mongoose from "mongoose";
const { Schema, model } = mongoose;

const BlogSchema = new mongoose.Schema({
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
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'authorModel',
        required: true
    },
    authorModel: {
        type: String,
        required: true,
        enum: ['Admin', 'User'],
        default: 'Admin'
    },
    authorName: {
        type: String,
        required: true,
        trim: true
    },
    authorEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    authorDescription: {
        type: String,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LogCategory',
        required: true
    },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LogSubCategory'
    },
    coverImage: {
        url: {
            type: String
        },
        public_id: {
            type: String
        },
        mediaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Media'
        }
    },
    image: String, // Legacy field for backward compatibility
    video: String,
    status: {
        type: String,
        enum: ['draft', 'published', 'archived', 'unpublish'],
        default: 'published'
    },
    enableComments: {   
        type: Boolean,
        default: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    metaTitle: {
        type: String,
        trim: true
    },
    metaDescription: {
        type: String,
        trim: true
    },
    metaKeywords: [{
        type: String,
        trim: true
    }],
    publishedAt: {
        type: Date
    },
    views: {
        type: Number,
        default: 0
    },
    likes: {
        type: Number,
        default: 0
    },
    shares: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});
  
const Blog = model('Blog', BlogSchema);
export default Blog;

  