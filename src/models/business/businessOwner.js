import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const { Schema, model } = mongoose;

const BusinessOwnerSchema = new Schema({
  // Business Owner Information
  firstName: { 
    type: String, 
    required: true,
    trim: true
  },
  lastName: { 
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
    required: false,
    unique: true,
    sparse: true
  },
  
  // Authentication (optional for draft accounts)
  username: {
    type: String,
    unique: true,
    sparse: true, // This allows multiple null values
    required: function() {
      return this.status !== 'draft';
    },
    trim: true
  },
  password: { 
    type: String, 
    required: function() {
      return this.status !== 'draft';
    }
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
  
  // Profile
  profilePhoto: { 
    type: String, 
    default: "https://via.placeholder.com/150"
  },
  
  // Status and Approval
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'approved', 'rejected', 'suspended', 'draft'],
    default: 'draft'
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: Date,
  rejectionReason: String,
  
  // Business Management
  businesses: [{
    type: Schema.Types.ObjectId,
    ref: 'Business'
  }],
  
  // Subscription and Plans
  subscription: {
    plan: {
      type: String,
      enum: ['bronze', 'silver', 'gold'],
      default: 'bronze'
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: false
    }
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Pre-save middleware to hash password
BusinessOwnerSchema.pre('save', async function(next) {
  // Only hash password if it's modified and not empty
  if (this.isModified('password') && this.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to compare password
BusinessOwnerSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
BusinessOwnerSchema.methods.generateOTP = function() {
  // Generate a random 6-digit OTP
  const min = 100000;
  const max = 999999;
  const otp = Math.floor(Math.random() * (max - min + 1)) + min;
  
  this.otp = {
    code: otp.toString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  };
  return otp.toString();
};

// Method to verify OTP
BusinessOwnerSchema.methods.verifyOTP = function(code) {
  if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
    return false;
  }
  
  if (new Date() > this.otp.expiresAt) {
    return false;
  }
  
  return this.otp.code === code;
};

// Method to get full name
BusinessOwnerSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Method to get business owner info
BusinessOwnerSchema.methods.getBusinessOwnerInfo = function() {
  return {
    _id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phoneNumber: this.phoneNumber,
    username: this.username,
    status: this.status,
    isEmailVerified: this.isEmailVerified,
    isPhoneVerified: this.isPhoneVerified,
    profilePhoto: this.profilePhoto
  };
};

// Static method to fix username index
BusinessOwnerSchema.statics.fixUsernameIndex = async function() {
  try {
    // Drop existing username index
    await this.collection.dropIndex('username_1');
    console.log('Dropped existing username index');
  } catch (error) {
    console.log('No existing username index to drop or error:', error.message);
  }
  
  try {
    // Create new sparse index
    await this.collection.createIndex({ username: 1 }, { 
      unique: true, 
      sparse: true 
    });
    console.log('Created new sparse username index');
  } catch (error) {
    console.error('Error creating sparse username index:', error);
  }
};

const BusinessOwner = model('BusinessOwner', BusinessOwnerSchema);

// Fix the index when the model is first loaded
BusinessOwner.fixUsernameIndex().catch(console.error);

export default BusinessOwner; 