import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const { Schema, model } = mongoose;

const BusinessSchema = new Schema({
  // Business Owner Information
  ownerFirstName: { 
    type: String, 
    required: true,
    trim: true
  },
  ownerLastName: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Authentication
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  password: { 
    type: String, 
    required: function() { return !this.googleId; } // Password not required if using Google auth
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Verification Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  
  // Business Information
  businessName: String,
  businessCategory: String,
  businessSubCategory: String,
  industry: String,
  website: String,
  
  // Address Information
  address: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
  
  // Profile
  profilePhoto: { 
    type: String, 
    default: "https://via.placeholder.com/150"
  },
  
  // Status and Approval
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: Date,
  rejectionReason: String,
  
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
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
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
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      start: Date,
      end: Date
    }
  ]
}, {
  timestamps: true
});

// Hash password before saving
BusinessSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
BusinessSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
BusinessSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  };
  return otp;
};

// Method to verify OTP
BusinessSchema.methods.verifyOTP = function(code) {
  if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
    return false;
  }
  
  if (new Date() > this.otp.expiresAt) {
    return false;
  }
  
  return this.otp.code === code;
};

// Method to get full name
BusinessSchema.methods.getFullName = function() {
  return `${this.ownerFirstName} ${this.ownerLastName}`;
};

const Business = model('Business', BusinessSchema);
export default Business;
  