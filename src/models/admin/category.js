import mongoose from "mongoose";
const { Schema, model } = mongoose;

const CategorySchema = new mongoose.Schema({
    categoryName: String,
    categorySlug: String,
    image: String,
    status: String,
  });
  
  const Category = model('Category', CategorySchema);
  export default Category;
  