import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ReviewSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    businessId: mongoose.Schema.Types.ObjectId,
    rating: Number,
    title: String,
    comment: String,
    media: [String],
    createdAt: Date,
  });
  
  const Review = model('Review', ReviewSchema);
  export default Review;
  