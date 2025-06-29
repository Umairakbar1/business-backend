import mongoose from "mongoose";
const { Schema, model } = mongoose;

const BlogSchema = new mongoose.Schema({
    title: String,
    description: String,
    author: String,
    category: String,
    subCategory: String,
    image: String,
    video: String,
    createdAt: Date,
    status: String,
  });
  
  const Blog = model('Blog', BlogSchema);
  export default Blog;

  