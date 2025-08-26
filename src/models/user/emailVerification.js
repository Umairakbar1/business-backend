import mongoose from "mongoose";

const { Schema, model } = mongoose;

const EmailVerificationSchema = new Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
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
EmailVerificationSchema.index({ "otp.expiresAt": 1 }, { expireAfterSeconds: 0 });

// Method to generate OTP
EmailVerificationSchema.methods.generateOTP = function() {
    // For testing purposes, use dummy OTP
    const otp = "775511";
    this.otp = {
        code: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    return otp;
};

// Method to verify OTP
EmailVerificationSchema.methods.verifyOTP = function(code) {
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
EmailVerificationSchema.methods.isVerificationValid = function() {
    return this.status === "verified" && this.isVerified;
};

const EmailVerification = model('EmailVerification', EmailVerificationSchema);
export default EmailVerification;
