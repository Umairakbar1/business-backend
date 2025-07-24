import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const { Schema, model } = mongoose;

const BusinessSchema = new Schema({
  // Business Owner Reference
  businessOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessOwner',
    required: true
  },
  
  // Business Information
  businessName: { 
    type: String, 
    required: true,
    trim: true
  },
  logo: {
    url: String,
    public_id: String,
    thumbnail: {
      url: String,
      public_id: String
    }
  },
  category: {
    type: String,
    required: true
  },
  subcategories: [{
    type: String
  }],
  
  // Contact Information
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // Social Media Links
  facebook: String,
  linkedIn: String,
  website: String,
  twitter: String,
  
  // SEO Information
  metaTitle: String,
  metaDescription: String,
  focusKeywords: [String],
  
  // Business Details
  about: String,
  serviceOffer: String,
  
  // Address Information
  address: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
  
  // Business Images
  images: [{
    url: String,
    public_id: String,
    caption: String
  }],
  
  // Status and Approval
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'approved', 'rejected', 'suspended', 'draft'],
    default: 'pending'
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: Date,
  rejectionReason: String,
  
  // Business Plan and Features
  plan: {
    type: String,
    enum: ['bronze', 'silver', 'gold'],
    default: 'bronze'
  },
  features: [{
    type: String,
    enum: ['query_ticketing', 'review_management', 'review_embed']
  }],
  embedToken: {
    type: String
  },
  
  // Review Management Access
  reviewManagementAccess: {
    type: Boolean,
    default: false
  },
  reviewManagementGrantedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewManagementGrantedAt: Date,
  
  // Boost Features
  boostActive: {
    type: Boolean,
    default: false
  },
  boostCategory: {
    type: String
  },
  boostStartAt: {
    type: Date
  },
  boostEndAt: {
    type: Date
  },
  boostQueue: [
    {
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner' },
      start: Date,
      end: Date
    }
  ],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Method to get business info
BusinessSchema.methods.getBusinessInfo = function() {
  return {
    _id: this._id,
    businessName: this.businessName,
    category: this.category,
    email: this.email,
    phoneNumber: this.phoneNumber,
    status: this.status,
    plan: this.plan
  };
};

const Business = model('Business', BusinessSchema);
export default Business;
  