import Plan from "../../models/admin/subscriptionPlans.js";
import Stripe from "stripe";
import { asyncWrapper, errorResponseHelper, serverErrorHelper, successResponseHelper } from "../../helpers/utilityHelper.js";
import Admin from "../../models/admin/admin.js";
import { validatePlan } from "../../validators/admin.js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a new subscription plan (Stripe + DB)
const createPlan = async (req, res) => { 
    const adminId = req.user._id;
    if (!adminId) return errorResponseHelper(res, "Admin not found");
    const [admin, adminError] = await asyncWrapper(() => Admin.findById(adminId));
    if (adminError) return serverErrorHelper(req, res, 500, adminError);
    if (!admin) return errorResponseHelper(res, "Admin not found");
    if (admin.role !== "admin") return errorResponseHelper(res, "Admin not found");

    const { title, price, duration, planType, permission, status, currency = "usd" } = req.body;
    const { error } = validatePlan(req.body);
    if (error) return errorResponseHelper(res, error.details[0].message);
    // Create product and price in Stripe
    let stripeProduct, stripePrice;
    try {
        stripeProduct = await stripe.products.create({ name: title });
        stripePrice = await stripe.prices.create({
            unit_amount: Math.round(price * 100), // Stripe expects cents
            currency,
            recurring: { interval: duration }, // duration: 'month', 'year', etc.
            product: stripeProduct.id,
        });
    } catch (err) {
        return serverErrorHelper(req, res, 500, err.message);
    }
    // Save plan in DB
    const [plan, planError] = await asyncWrapper(() => Plan.create({
        title,
        price,
        duration,
        planType,
        permission,
        status,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
    }));
    if (planError) return serverErrorHelper(req, res, 500, planError);
    return successResponseHelper(res, { plan });
};

// Update a subscription plan (DB only, not Stripe)
const updatePlan = async (req, res) => {
    const { id } = req.params;
    const { title, price, duration, planType, permission, status } = req.body;
    const [plan, planError] = await asyncWrapper(() =>
        Plan.findByIdAndUpdate(
            id,
            { $set: { title, price, duration, planType, permission, status } },
            { new: true }
        )
    );
    if (planError) return serverErrorHelper(req, res, 500, planError);
    if (!plan) return errorResponseHelper(res, "Plan not found");
    return successResponseHelper(res, { plan });
};

// Get all subscription plans
const getAllPlans = async (req, res) => {
    const [plans, plansError] = await asyncWrapper(() => Plan.find({}));
    if (plansError) return serverErrorHelper(req, res, 500, plansError);
    return successResponseHelper(res, { plans });
};

// Delete a subscription plan (DB only, not Stripe)
const deletePlan = async (req, res) => {
    const { id } = req.params;
    const [plan, planError] = await asyncWrapper(() => Plan.findByIdAndDelete(id));
    if (planError) return serverErrorHelper(req, res, 500, planError);
    if (!plan) return errorResponseHelper(res, "Plan not found");
    return successResponseHelper(res, { message: "Plan deleted successfully" });
};

// Change status of a subscription plan
const changePlanStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const [plan, planError] = await asyncWrapper(() =>
        Plan.findByIdAndUpdate(id, { $set: { status } }, { new: true })
    );
    if (planError) return serverErrorHelper(req, res, 500, planError);
    if (!plan) return errorResponseHelper(res, "Plan not found");
    return successResponseHelper(res, { plan });
};

export {
    createPlan,
    updatePlan,
    getAllPlans,
    deletePlan,
    changePlanStatus,
};
