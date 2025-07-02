import mongoose from "mongoose";


const PlanSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: String, required: true }, // e.g., 'month', 'year'
    planType: { type: String },
    permission: [{ type: String }],
    status: { type: String, default: 'active' }, // e.g., 'active', 'inactive'
    stripeProductId: { type: String }, // Stripe product ID
    stripePriceId: { type: String },   // Stripe price ID
}, {
    timestamps: true,
});

const Plan = mongoose.model('Plan', PlanSchema);

export default Plan;