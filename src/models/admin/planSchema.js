import mongoose from "mongoose";
const { Schema, model } = mongoose;

const PlanSchema = new mongoose.Schema({
    title: String,
    price: Number,
    duration: String,
    planType: String,
    permission: [String],
    status: String,
  });
  
  const Plan = model('Plan', PlanSchema);
  export default Plan;
  