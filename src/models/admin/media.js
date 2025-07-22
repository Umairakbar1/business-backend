import mongoose from "mongoose";
const { Schema, model } = mongoose;

const MediaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['image', 'video', 'document'],
        default: 'image'
    },
    file: {
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
        bytes: Number,
        duration: Number // for videos
    },
    thumbnail: {
        url: String,
        public_id: String,
        width: Number,
        height: Number
    },
    altText: {
        type: String,
        trim: true
    },
    published: {
        type: Boolean,
        default: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false
    }
}, {
    timestamps: true
});

const Media = model('Media', MediaSchema);
export default Media;
  