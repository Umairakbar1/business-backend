import mongoose from "mongoose";
const { Schema, model } = mongoose;

const CouponSchema = new mongoose.Schema({
    title: String,
    code: String,
    amount: Number,
    discountType: String,
    discountValue: Number,
    maxAmount: Number,
    validTill: Date,
    status: String,
  });
  
  const Coupon = model('Coupon', CouponSchema);
  export default Coupon;
  