import mongoose from "mongoose";
const { Schema, model } = mongoose;

const BusinessSchema = new Schema({
    businessId: Schema.Types.ObjectId,
    businessName: String,
    contactPerson: String,
    email: String,
    phone: String,
    website: String,
    businessCategory: String,
    businessSubCategory: String,
    industry: String,
    address: String,
    location: Schema.Types.Mixed,
    status: String,
    createdAt: Date,
  });
  
  const Business = model('Business', BusinessSchema);
  export default Business;
  