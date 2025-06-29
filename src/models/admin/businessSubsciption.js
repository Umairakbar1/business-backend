import mongoose from "mongoose";
const { Schema, model } = mongoose;

const BusinessSubscriptionSchema = new mongoose.Schema({
    businessId: mongoose.Schema.Types.ObjectId,
    planId: mongoose.Schema.Types.ObjectId,
    status: String,
    subscriptionType: String,
    createdAt: Date,
    expiredAt: Date,
    status: String,
  });
  
  const BusinessSubscription = model('BusinessSubscription', BusinessSubscriptionSchema);
  export default BusinessSubscription;
  