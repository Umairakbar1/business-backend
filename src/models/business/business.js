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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory'
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
  
  // Business Links
  businessUrls: {
    type: [{
      label: {
        type: String,
        required: true,
        trim: true
      },
      link: {
        type: String,
        required: true,
        validate: {
          validator: function(url) {
            const urlPattern = /^https?:\/\/.+/;
            return url && urlPattern.test(url);
          },
          message: 'Link must be a valid URL'
        }
      }
    }],
    validate: {
      validator: function(urls) {
        if (!Array.isArray(urls)) return false;
        if (urls.length > 5) return false;
        return true;
      },
      message: 'businessUrls must be an array of URL objects (max 5)'
    }
  },
  
  // Business Details
  about: String,
  serviceOffer: String,
  
  // Address Information
  location: {
    description: String,
    lat: Number,
    lng: Number,
    // GeoJSON Point for geospatial queries
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude] as per GeoJSON spec
      default: undefined
    }
  },
  city: String,
  state: String,
  zipCode: String,
  country: String,
  
  // Business Images
  images: [{
    url: String,
    public_id: String,
    thumbnail: {
      url: String,
      public_id: String
    },
    caption: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Media array for multiple images (alias for images)
  media: [{
    url: String,
    public_id: String,
    thumbnail: {
      url: String,
      public_id: String
    },
    caption: String,
    uploadedAt: { type: Date, default: Date.now }
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
    default: null
  },
  features: [{
    type: String,
    enum: ['query_ticketing', 'review_management', 'review_embed']
  }],
  embedToken: {
    type: String
  },
  reviewEmbedToken: {
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
  
  // Subscription Tracking
  stripeCustomerId: {
    type: String,
    sparse: true
  },
  // Two types of subscriptions: business and boost
  businessSubscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  boostSubscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  },
  isBoosted: {
    type: Boolean,
    default: false
  },
  boostExpiryAt: {
    type: Date,
    default: null
  },
  
  // Firebase Cloud Messaging token for notifications
  fcmToken: {
    type: String,
    default: null
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now }
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

// Pre-save middleware to automatically populate coordinates for geospatial queries
BusinessSchema.pre('save', function(next) {
  // Clean up businessUrls to remove invalid entries
  if (this.businessUrls && Array.isArray(this.businessUrls)) {
    this.businessUrls = this.businessUrls.filter(url => 
      url && 
      typeof url === 'object' && 
      url.label && 
      url.link && 
      typeof url.label === 'string' && 
      typeof url.link === 'string' &&
      url.label.trim() !== '' &&
      url.link.trim() !== ''
    );
  }

  // Handle location coordinates
  if (this.location && this.location.lat && this.location.lng) {
    this.location.coordinates = [this.location.lng, this.location.lat]; // [longitude, latitude]
    this.location.type = 'Point';
  }
  next();
});

// Pre-update middleware for findOneAndUpdate operations
BusinessSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Clean up businessUrls to remove invalid entries
  if (update.businessUrls && Array.isArray(update.businessUrls)) {
    update.businessUrls = update.businessUrls.filter(url => 
      url && 
      typeof url === 'object' && 
      url.label && 
      url.link && 
      typeof url.label === 'string' && 
      typeof url.link === 'string' &&
      url.label.trim() !== '' &&
      url.link.trim() !== ''
    );
  }

  // Handle location coordinates
  if (update.location && update.location.lat && update.location.lng) {
    update.location.coordinates = [update.location.lng, update.location.lat];
    update.location.type = 'Point';
  }
  next();
});

const Business = model('Business', BusinessSchema);

// Create geospatial index for location-based queries
BusinessSchema.index({ 'location.lat': 1, 'location.lng': 1 });

// Alternative: Create a 2dsphere index for more accurate geospatial queries
// This is better for the $geoNear operation
BusinessSchema.index({ location: '2dsphere' });

export default Business;
  