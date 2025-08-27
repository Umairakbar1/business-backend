import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ReviewSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    comment: {
      type: String,
      trim: true
    },
    media: [{
      type: {
        type: String,
        enum: ['image', 'video'],
        required: true
      },
      // For images
      original: {
        url: String,
        public_id: String,
        width: Number,
        height: Number
      },
      thumbnail: {
        url: String,
        public_id: String,
        width: Number,
        height: Number
      },
      // For videos
      video: {
        url: String,
        public_id: String,
        duration: Number,
        format: String,
        bytes: Number
      }
    }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    approvedByType: {
      type: String,
      enum: ['admin', 'business'],
      default: 'admin'
    },
    businessCanManage: {
      type: Boolean,
      default: false
    },
    businessManagementGrantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    businessManagementGrantedAt: Date,
    approvedAt: Date,
    // Comments and replies for reviews
    comments: [{
      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
      },
      authorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      authorType: {
        type: String,
        enum: ['user', 'business', 'admin'],
        required: true
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
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      },
      isEdited: {
        type: Boolean,
        default: false
      },
      editedAt: Date,
      // Replies to this comment
      replies: [{
        content: {
          type: String,
          required: true,
          trim: true,
          maxlength: 500
        },
        authorId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        authorType: {
          type: String,
          enum: ['user', 'business', 'admin'],
          required: true
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
        createdAt: {
          type: Date,
          default: Date.now
        },
        updatedAt: {
          type: Date,
          default: Date.now
        },
        isEdited: {
          type: Boolean,
          default: false
        },
        editedAt: Date
      }]
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  });
  
  const Review = model('Review', ReviewSchema);
  export default Review;
  