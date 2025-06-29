import mongoose from "mongoose";
const { Schema, model } = mongoose;

const MediaSchema = new mongoose.Schema({
    title: String,
    type: String,
    file: String,
    thumbnail: String,
    altText: String,
    published: Boolean,
  });
  
  const Media = model('Media', MediaSchema);
  export default Media;
  