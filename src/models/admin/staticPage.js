import mongoose from "mongoose";
const { Schema, model } = mongoose;

const StaticPageSchema = new mongoose.Schema({
    title: String,
    content: String,
    slug: String,
    status: String,
  });
  
  const StaticPage = model('StaticPage', StaticPageSchema);
  export default StaticPage;