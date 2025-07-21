import Business from '../../models/business/business.js';
import mongoose from 'mongoose';
import stripeHelper from '../../helpers/stripeHelper.js';
import BusinessSubscription from '../../models/admin/businessSubsciption.js';
import { uploadImageWithThumbnail } from '../../helpers/cloudinaryHelper.js';
import axios from 'axios';
import Joi from 'joi';

export const createBusiness = async (req, res) => {
  try {
    const { plan, ...data } = req.body;
    
    // Handle logo upload
    let logoData = null;
    if (req.file) {
      try {
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/logos');
        logoData = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id,
          thumbnail: {
            url: uploadResult.thumbnail.url,
            public_id: uploadResult.thumbnail.public_id
          }
        };
      } catch (uploadError) {
        console.error('Logo upload error:', uploadError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to upload logo. Please try again.' 
        });
      }
    }
    
    // Assign features based on plan
    let features = [];
    if (plan === 'bronze') features = ['query_ticketing'];
    if (plan === 'silver') features = ['query_ticketing', 'review_management'];
    if (plan === 'gold') features = ['query_ticketing', 'review_management', 'review_embed'];
    // Generate embed token for gold
    let embedToken = undefined;
    if (plan === 'gold') embedToken = Math.random().toString(36).substring(2, 15);
    
    const business = await Business.create({
      ...data,
      logo: logoData,
      owner: req.user._id,
      plan,
      features,
      embedToken
    });
    res.status(201).json({ success: true, business });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create business', error: error.message });
  }
};

export const getMyBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({ owner: req.user._id });
    res.json({ success: true, businesses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch businesses', error: error.message });
  }
};

export const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid business ID' });
    const business = await Business.findOne({ _id: id, owner: req.user._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, business });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch business', error: error.message });
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Handle logo upload
    if (req.file) {
      try {
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/logos');
        updateData.logo = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id,
          thumbnail: {
            url: uploadResult.thumbnail.url,
            public_id: uploadResult.thumbnail.public_id
          }
        };
      } catch (uploadError) {
        console.error('Logo upload error:', uploadError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to upload logo. Please try again.' 
        });
      }
    }
    
    const business = await Business.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, business });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update business', error: error.message });
  }
};

export const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findOneAndDelete({ _id: id, owner: req.user._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, message: 'Business deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete business', error: error.message });
  }
};

export const updateBusinessStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    const business = await Business.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      { status },
      { new: true, runValidators: true }
    );
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.json({ success: true, business });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
  }
};

export const getAvailablePlans = async (req, res) => {
  // Hardcoded for now, can be dynamic
  const plans = [
    { name: 'Bronze', value: 'bronze', price: 0, features: ['query_ticketing'] },
    { name: 'Silver', value: 'silver', price: 20, features: ['query_ticketing', 'review_management'] },
    { name: 'Gold', value: 'gold', price: 30, features: ['query_ticketing', 'review_management', 'review_embed'] },
  ];
  res.json({ success: true, plans });
};

export const getCurrentPlan = async (req, res) => {
  const business = await Business.findOne({ owner: req.user._id });
  if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
  res.json({ success: true, plan: business.plan, features: business.features, status: business.status });
};

export const createPlanPaymentSession = async (req, res) => {
  try {
    const { plan, businessId } = req.body;
    // Validate plan
    if (!['silver', 'gold'].includes(plan)) return res.status(400).json({ success: false, message: 'Invalid plan for payment' });
    // Set price (should match getAvailablePlans)
    const price = plan === 'silver' ? 2000 : 3000; // in cents
    // Get business
    const business = await Business.findOne({ _id: businessId, owner: req.user._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    // Create Stripe session
    const session = await stripeHelper.createStripeCheckoutSession(
      `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      price,
      'usd',
      null, // customer (optional)
      { businessId, plan }
    );
    res.json({ success: true, url: session.url });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create payment session', error: error.message });
  }
};

export const getAllMyBusinessSubscriptions = async (req, res) => {
  try {
    // Find all businesses owned by the user
    const businesses = await Business.find({ owner: req.user._id }, '_id businessName');
    const businessIds = businesses.map(b => b._id);
    // Find all subscriptions for these businesses
    const subscriptions = await BusinessSubscription.find({ businessId: { $in: businessIds } })
      .sort({ createdAt: -1 });
    res.json({ success: true, subscriptions, businesses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions', error: error.message });
  }
};

export const boostBusiness = async (req, res) => {
  try {
    const { businessId } = req.body;
    const business = await Business.findOne({ _id: businessId, owner: req.user._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    const category = business.businessCategory;
    // Find any currently boosted business in this category
    const now = new Date();
    const boosted = await Business.findOne({
      businessCategory: category,
      boostActive: true,
      boostEndAt: { $gt: now }
    });
    if (boosted && String(boosted._id) !== String(business._id)) {
      // Queue this boost after the current one ends
      business.boostQueue.push({
        owner: req.user._id,
        start: boosted.boostEndAt,
        end: new Date(boosted.boostEndAt.getTime() + 24 * 60 * 60 * 1000)
      });
      await business.save();
      return res.json({
        success: true,
        message: 'Another business is already boosted in this category. Your boost will start after 24 hours.',
        boostStartAt: boosted.boostEndAt,
        boostEndAt: new Date(boosted.boostEndAt.getTime() + 24 * 60 * 60 * 1000)
      });
    }
    // No current boost, activate boost now
    business.boostActive = true;
    business.boostCategory = category;
    business.boostStartAt = now;
    business.boostEndAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await business.save();
    return res.json({
      success: true,
      message: 'Business is now boosted for 24 hours.',
      boostStartAt: now,
      boostEndAt: business.boostEndAt
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to boost business', error: error.message });
  }
};

export const agreeBoostBusiness = async (req, res) => {
  try {
    const { businessId } = req.body;
    const business = await Business.findOne({ _id: businessId, owner: req.user._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    if (!business.boostQueue.length) return res.status(400).json({ success: false, message: 'No boost queued.' });
    const nextBoost = business.boostQueue[0];
    const now = new Date();
    if (now < nextBoost.start) {
      return res.status(400).json({ success: false, message: 'Boost period has not started yet.' });
    }
    // Activate boost
    business.boostActive = true;
    business.boostStartAt = nextBoost.start;
    business.boostEndAt = nextBoost.end;
    business.boostQueue.shift();
    await business.save();
    return res.json({ success: true, message: 'Business boost is now active.', boostStartAt: business.boostStartAt, boostEndAt: business.boostEndAt });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to activate boost', error: error.message });
  }
};

export const getBoostedBusinesses = async (req, res) => {
  try {
    const now = new Date();
    // Get all currently boosted businesses
    const boosted = await Business.find({ boostActive: true, boostEndAt: { $gt: now } }).sort({ boostEndAt: -1 });
    res.json({ success: true, boosted });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch boosted businesses', error: error.message });
  }
};

export const getMyBusinessBoosts = async (req, res) => {
  try {
    // Find all businesses owned by the user
    const businesses = await Business.find({ owner: req.user._id });
    // Collect boost info for each business
    const boosts = businesses.map(b => ({
      businessId: b._id,
      businessName: b.businessName,
      boostActive: b.boostActive,
      boostCategory: b.boostCategory,
      boostStartAt: b.boostStartAt,
      boostEndAt: b.boostEndAt,
      boostQueue: b.boostQueue
    }));
    res.json({ success: true, boosts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch boost history', error: error.message });
  }
};

export const deleteBusinessBoosts = async (req, res) => {
  try {
    const { businessId } = req.body;
    const business = await Business.findOne({ _id: businessId, owner: req.user._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    business.boostActive = false;
    business.boostCategory = undefined;
    business.boostStartAt = undefined;
    business.boostEndAt = undefined;
    business.boostQueue = [];
    await business.save();
    res.json({ success: true, message: 'All previous boosts deleted for this business.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete boosts', error: error.message });
  }
};

export const getOwnerRecentSubscriptions = async (req, res) => {
  try {
    // Find all subscriptions where the owner is the payer (assuming owner._id is stored in subscription, otherwise filter by their businesses)
    // Here, we filter by all businesses owned by the user
    const businesses = await Business.find({ owner: req.user._id }, '_id businessName');
    const businessIds = businesses.map(b => b._id);
    const subscriptions = await BusinessSubscription.find({ businessId: { $in: businessIds } })
      .sort({ createdAt: -1 });
    res.json({ success: true, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch recent subscriptions', error: error.message });
  }
};

export const generateReviewEmbedLink = async (req, res) => {
  try {
    const { businessId } = req.body;
    const business = await Business.findOne({ _id: businessId, owner: req.user._id });
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    // Generate embed token if not present
    if (!business.embedToken) {
      business.embedToken = Math.random().toString(36).substring(2, 15);
      await business.save();
    }
    const embedUrl = `${process.env.SITE_URL || 'https://yourdomain.com'}/embed/review/${business._id}/${business.embedToken}`;
    // HTML code for the review card embed
    const html = `
<!-- Paste this code on your site to show your business reviews -->
<div id="mybiz-review-embed"></div>
<script>
(function(){
  var d=document,s=d.createElement('script');
  s.src='${process.env.SITE_URL || 'https://yourdomain.com'}/embed/review-widget.js?bid=${business._id}&token=${business.embedToken}';
  s.async=true;d.getElementById('mybiz-review-embed').appendChild(s);
})();
</script>
`;
    res.json({ success: true, embedUrl, html });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate embed link', error: error.message });
  }
};

export const validateBusinessWebsite = async (req, res) => {
  const { website } = req.body;
  // 1. Validate URL format
  const websiteSchema = Joi.string().uri().required();
  const { error } = websiteSchema.validate(website);
  if (error) return res.status(400).json({ success: false, message: 'Invalid website URL format.' });

  try {
    // 2. Check for inappropriate content using ModerateContent API
    // Replace 'YOUR_API_KEY' with your actual API key
    const apiUrl = `https://api.moderatecontent.com/moderate/?key=YOUR_API_KEY&url=${encodeURIComponent(website)}`;
    const response = await axios.get(apiUrl);
    // The API returns a rating: 'everyone', 'teen', 'adult', etc.
    if (response.data && response.data.rating_label && response.data.rating_label !== 'everyone') {
      return res.status(400).json({ success: false, message: 'Website contains inappropriate content.' });
    }
    // If safe
    return res.json({ success: true, message: 'Website is valid and safe.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to check website content.', error: err.message });
  }
}; 