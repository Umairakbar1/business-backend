import mongoose from "mongoose";
const { Schema, model } = mongoose;

const CommentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    authorName: {
        type: String,
        required: true,
        trim: true
    },
    authorEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    blogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'spam', 'deleted'],
        default: 'active'
    },
    likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reply'
    }],
    replyCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for better query performance
CommentSchema.index({ blogId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ author: 1, status: 1 });
CommentSchema.index({ parentComment: 1, status: 1 });

const Comment = model('Comment', CommentSchema);
export default Comment;
