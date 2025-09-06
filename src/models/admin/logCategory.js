import mongoose from "mongoose";
const { Schema, model } = mongoose;

const LogCategorySchema = new mongoose.Schema({
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
        enum: ['active', 'inactive', 'archived'],
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

const LogCategory = model('LogCategory', LogCategorySchema);
export default LogCategory; 