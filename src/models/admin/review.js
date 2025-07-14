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
    media: [String],
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
  