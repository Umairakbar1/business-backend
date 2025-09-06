import mongoose from "mongoose";

const { Schema, model } = mongoose;

const BusinessEmailVerificationSchema = new Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
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
    phoneNumber: {
        type: String,
        trim: true
    },
    otp: {
        code: String,
        expiresAt: Date
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 3
    },
    status: {
        type: String,
        enum: ["pending", "verified", "expired", "blocked"],
        default: "pending"
    }
}, {
    timestamps: true
});

// Index for automatic cleanup of expired records
BusinessEmailVerificationSchema.index({ "otp.expiresAt": 1 }, { expireAfterSeconds: 0 });

// Method to generate OTP
BusinessEmailVerificationSchema.methods.generateOTP = function() {
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
BusinessEmailVerificationSchema.methods.verifyOTP = function(code) {
    if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
        return false;
    }
    
    if (new Date() > this.otp.expiresAt) {
        this.status = "expired";
        return false;
    }
    
    if (this.attempts >= this.maxAttempts) {
        this.status = "blocked";
        return false;
    }
    
    this.attempts += 1;
    
    if (this.otp.code === code) {
        this.isVerified = true;
        this.status = "verified";
        this.otp = undefined; // Clear OTP after successful verification
        return true;
    }
    
    return false;
};

// Method to check if verification is still valid
BusinessEmailVerificationSchema.methods.isVerificationValid = function() {
    return this.status === "verified" && this.isVerified;
};

const BusinessEmailVerification = model('BusinessEmailVerification', BusinessEmailVerificationSchema);
export default BusinessEmailVerification;
