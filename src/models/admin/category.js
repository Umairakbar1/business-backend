import mongoose from "mongoose";
const { Schema, model } = mongoose;

const SubCategorySchema = new mongoose.Schema({
    subCategoryName: String,
    description:String, 
    status: String,
    categoryId: mongoose.Schema.Types.ObjectId,
});

const CategorySchema = new mongoose.Schema({
    title: String,
    slug: String,
    description:String,
    image: String,
    status: String,
    color:String,
    sortOrder:Number,
    metaTitle:String,
    metaDescription:String,
    subcategories: [SubCategorySchema],
    parentCategory: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
  });
  
  const Category = model('Category', CategorySchema);
  export default Category;
  