import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { GLOBAL_ENUMS } from "../../config/globalConfig.js";
const { Schema, model } = mongoose;

const UserSchema = new Schema({
    name: { 
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
    password: { 
        type: String, 
        required: function() { return !this.googleId; } // Password not required if using Google auth
    },
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    profilePhoto: { 
        type: String, 
        default: "https://via.placeholder.com/150"
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
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
    status: { 
        type: String, 
        enum: ["active", "inactive", "banned", "blocked"], 
        default: "active" 
    },
    userName: { type: String, required: true, unique: true },
    avatar: { type: String, default: GLOBAL_ENUMS.defaultProfilePhoto }, // URL to profile image
    lastVisit: { type: Date },
    visitCount: { type: Number, default: 0 },
}, {
    timestamps: true // adds createdAt and updatedAt
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
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
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
UserSchema.methods.generateOTP = function() {
  // For testing purposes, use dummy OTP
  const otp = "775511";
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  };
  return otp;
};

// Method to verify OTP
UserSchema.methods.verifyOTP = function(code) {
    if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
        return false;
    }
    
    if (new Date() > this.otp.expiresAt) {
        return false;
    }
    
    return this.otp.code === code;
};

const User = model('User', UserSchema);
export default User;