import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ReplySchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
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
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        required: true
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
    parentReply: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reply',
        default: null
    }
}, {
    timestamps: true
});

// Index for better query performance
ReplySchema.index({ comment: 1, status: 1, createdAt: -1 });
ReplySchema.index({ blogId: 1, status: 1 });
ReplySchema.index({ author: 1, status: 1 });
ReplySchema.index({ parentReply: 1, status: 1 });

const Reply = model('Reply', ReplySchema);
export default Reply;
