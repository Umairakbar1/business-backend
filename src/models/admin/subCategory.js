import mongoose from "mongoose";
const { Schema, model } = mongoose;

const SubCategorySchema = new mongoose.Schema({
    subCategoryName: String,
    subCategorySlug: String,
    description: String,
    image: String,
    categoryId: mongoose.Schema.Types.ObjectId,
    status: String,
  });
  
  const SubCategory = model('SubCategory', SubCategorySchema);
  export default SubCategory;
  