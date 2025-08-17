import Business from '../../models/business/business.js';
import BusinessOwner from '../../models/business/businessOwner.js';
import { 
  errorResponseHelper, 
  successResponseHelper, 
  serverErrorHelper,
  // generateOTP, // Commented out - using dummy OTP for testing
} from '../../helpers/utilityHelper.js';
import { 
  signAccessTokenBusiness, 
  signAccountCreationToken,
  signOtpVerificationToken,
  signPasswordResetToken,
  verifyPasswordResetToken
} from "../../helpers/jwtHelper.js";
// import { sendEmail } from '../../helpers/sendGridHelper.js'; // Commented out - using dummy OTP for testing
import { uploadImageWithThumbnail } from '../../helpers/cloudinaryHelper.js';
import { cleanupUploadedFiles } from '../../middleware/cloudinaryUpload.js';

// Business Owner Signup - Step 1: Basic Information and OTP Generation
export const businessOwnerSignup = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return errorResponseHelper(res, { 
        message: 'First name, last name, and email are required',
        code: '00400'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponseHelper(res, { 
        message: 'Please enter a valid email address',
        code: '00400'
      });
    }

    // Check if business owner already exists
    const existingBusinessOwner = await BusinessOwner.findOne({ 
      $or: [
        { email }, 
        ...(phoneNumber ? [{ phoneNumber }] : [])
      ]
    });

    if (existingBusinessOwner) {
      return errorResponseHelper(res, { 
        message: 'Business owner account already exists with this email or phone number',
        code: '00409'
      });
    }

    // Generate OTP
    const tempOtp = "775511"; // For testing - in production, generate random 6-digit OTP
    
    // Generate OTP verification token (expires in 5 minutes)
    const otpVerificationToken = signOtpVerificationToken(email, tempOtp);

    // Send OTP via email
    try {
      // Commented out for testing - using dummy OTP
      // await sendEmail(email, "Business Owner Account Verification", `Your verification code is: ${tempOtp}`);
      console.log(`[TESTING] OTP for ${email}: ${tempOtp}`);
      
      return successResponseHelper(res, {
        message: 'OTP sent to your email. Please verify to complete registration.',
        data: {
          email,
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
          otpVerificationToken
        }
      });
    } catch (emailError) {
      return errorResponseHelper(res, { 
        message: 'Failed to send OTP. Please try again.',
        code: '00500'
      });
    }
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Resend OTP
export const resendOtp = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return errorResponseHelper(res, { 
        message: 'First name, last name, and email are required',
        code: '00400'
      });
    }

    // Check if business owner already exists
    const existingBusinessOwner = await BusinessOwner.findOne({ email });
    if (existingBusinessOwner) {
      return errorResponseHelper(res, { 
        message: 'Business owner account already exists with this email',
        code: '00409'
      });
    }

    // Generate new OTP
    const tempOtp = "775511"; // For testing
    
    // Generate new OTP verification token
    const otpVerificationToken = signOtpVerificationToken(email, tempOtp);

    // Send new OTP via email
    try {
      console.log(`[TESTING] New OTP for ${email}: ${tempOtp}`);
      
      return successResponseHelper(res, {
        message: 'New OTP sent to your email.',
        data: {
          email,
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
          otpVerificationToken
        }
      });
    } catch (emailError) {
      return errorResponseHelper(res, { 
        message: 'Failed to send OTP. Please try again.',
        code: '00500'
      });
    }
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Verify OTP - Step 2 (Only verify OTP, no account creation)
export const verifyOtpAndCreateBusinessOwner = async (req, res) => {
  try {
    const { email, otp, otpVerificationToken, firstName, lastName, phoneNumber } = req.body;

    console.log("OTP Verification Request:", {
      email,
      otp,
      hasToken: !!otpVerificationToken,
      firstName,
      lastName,
      phoneNumber
    });

    // Validate required fields
    if (!email || !otp || !otpVerificationToken || !firstName || !lastName) {
      console.log("Missing required fields:", { email, otp, hasToken: !!otpVerificationToken, firstName, lastName });
      return errorResponseHelper(res, { 
        message: 'Email, OTP, verification token, first name, and last name are required',
        code: '00400'
      });
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      console.log("Invalid OTP format:", otp);
      return errorResponseHelper(res, { 
        message: 'OTP must be exactly 6 digits',
        code: '00400'
      });
    }

    // Verify OTP (using dummy OTP for testing)
    if (otp !== "775511") {
      console.log("Invalid OTP provided:", otp);
      return errorResponseHelper(res, { 
        message: 'Invalid OTP. Please check your email and try again.',
        code: '00400'
      });
    }

    console.log("OTP verification passed, checking existing business owner...");

    // Test database connection
    try {
      await BusinessOwner.findOne({ email: 'test@test.com' });
      console.log("Database connection test successful");
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return serverErrorHelper(req, res, 500, new Error("Database connection failed"));
    }

    // Check if business owner already exists
    const existingBusinessOwner = await BusinessOwner.findOne({ email });
    if (existingBusinessOwner) {
      console.log("Business owner already exists:", existingBusinessOwner.email);
      return errorResponseHelper(res, { 
        message: 'Business owner account already exists with this email',
        code: '00409'
      });
    }

    console.log("Email verified successfully, generating token for account creation...");

    // Generate a token for account creation (contains user data)
    const accountCreationToken = signAccountCreationToken({ 
      email, 
      firstName, 
      lastName, 
      phoneNumber,
      isPendingCreation: true 
    });

    return successResponseHelper(res, {
      message: 'Email verified successfully. Please set your username and password to create your account.',
      data: {
        email,
        firstName,
        lastName,
        phoneNumber,
        accountCreationToken
      }
    });
  } catch (error) {
    console.error("Error in verifyOtpAndCreateBusinessOwner:", error);
    console.error("Error stack:", error.stack);
    return serverErrorHelper(req, res, 500, error);
  }
};

// Set Business Owner Credentials and Create Account - Step 3
export const setBusinessOwnerCredentials = async (req, res) => {
  try {
    const { username, password } = req.body;
    const tokenData = req.user; // This contains the data from the token

    console.log("Set Credentials Request:", {
      username,
      hasPassword: !!password,
      tokenData: tokenData ? { email: tokenData.email, isPendingCreation: tokenData.isPendingCreation } : null
    });

    // Validate required fields
    if (!username || !password) {
      return errorResponseHelper(res, { 
        message: 'Username and password are required',
        code: '00400'
      });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return errorResponseHelper(res, { 
        message: 'Username must be 3-30 characters and contain only letters, numbers, and underscores',
        code: '00400'
      });
    }

    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
      return errorResponseHelper(res, { 
        message: 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character',
        code: '00400'
      });
    }

    // Check if username is already taken
    const existingUsername = await BusinessOwner.findOne({ username });
    if (existingUsername) {
      return errorResponseHelper(res, { 
        message: 'Username is already taken. Please choose a different username.',
        code: '00409'
      });
    }

    // Check if this is a pending creation (from OTP verification)
    if (tokenData && tokenData.isPendingCreation) {
      console.log("Creating new business owner account from OTP verification...");
      
      // Create the business owner account
      const newBusinessOwner = new BusinessOwner({
        firstName: tokenData.firstName,
        lastName: tokenData.lastName,
        email: tokenData.email,
        phoneNumber: tokenData.phoneNumber || null,
        username,
        password,
        status: 'pending', // Account is pending admin approval
        isEmailVerified: true
      });

      await newBusinessOwner.save();
      console.log("Business owner account created successfully:", newBusinessOwner._id);

      // Generate access token for the new account
      const accessToken = signAccessTokenBusiness(newBusinessOwner._id);

      return successResponseHelper(res, {
        message: 'Account created successfully! Your account is pending admin approval.',
        data: {
          businessOwnerId: newBusinessOwner._id,
          email: newBusinessOwner.email,
          firstName: newBusinessOwner.firstName,
          lastName: newBusinessOwner.lastName,
          username: newBusinessOwner.username,
          status: newBusinessOwner.status,
          accessToken
        }
      });
    } else {
      // This is an existing account updating credentials
      const businessOwnerId = tokenData._id;
      const businessOwner = await BusinessOwner.findById(businessOwnerId);
      if (!businessOwner) {
        return errorResponseHelper(res, { 
          message: 'Business owner not found',
          code: '00404'
        });
      }

      // Update credentials
      businessOwner.username = username;
      businessOwner.password = password;
      businessOwner.status = 'pending'; // Update status to pending for admin approval
      
      await businessOwner.save();
      console.log("Business owner credentials updated successfully");

      // Generate new access token
      const accessToken = signAccessTokenBusiness(businessOwner._id);

      return successResponseHelper(res, {
        message: 'Credentials updated successfully! Your account is pending admin approval.',
        data: {
          businessOwnerId: businessOwner._id,
          email: businessOwner.email,
          firstName: businessOwner.firstName,
          lastName: businessOwner.lastName,
          username: businessOwner.username,
          status: businessOwner.status,
          accessToken
        }
      });
    }
  } catch (error) {
    console.error("Error in setBusinessOwnerCredentials:", error);
    return serverErrorHelper(req, res, 500, error);
  }
};

// Business Owner Login
export const businessOwnerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return errorResponseHelper(res, { 
        message: 'Email and password are required',
        code: '00400'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponseHelper(res, { 
        message: 'Please enter a valid email address',
        code: '00400'
      });
    }

    // Find business owner by email
    const businessOwner = await BusinessOwner.findOne({ email }).select('+password');
    if (!businessOwner) {
      return errorResponseHelper(res, { 
        message: 'Invalid email or password',
        code: '00401'
      });
    }

    // Check if email is verified
    if (!businessOwner.isEmailVerified) {
      return errorResponseHelper(res, { 
        message: 'Please verify your email first',
        code: '00401'
      });
    }

    // Handle different account statuses
    if (businessOwner.status === 'draft') {
      return errorResponseHelper(res, { 
        message: 'Please complete your account setup by setting username and password',
        code: '00400',
        data: {
          requiresSetup: true,
          email: businessOwner.email,
          firstName: businessOwner.firstName,
          lastName: businessOwner.lastName
        }
      });
    }

    if (businessOwner.status === 'suspended') {
      return errorResponseHelper(res, { 
        message: 'Your account has been suspended. Please contact support.',
        code: '00401'
      });
    }

    if (businessOwner.status === 'rejected') {
      return errorResponseHelper(res, { 
        message: 'Your account has been rejected. Please contact support.',
        code: '00401'
      });
    }

    if (businessOwner.status !== 'approved' &&businessOwner.status !== 'pending' && businessOwner.status !== 'active') {
      return errorResponseHelper(res, { 
        message: `Account is ${businessOwner.status}. Please wait for admin approval.`,
        code: '00401'
      });
    }

    // Verify password
    const isPasswordValid = await businessOwner.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponseHelper(res, { 
        message: 'Invalid email or password',
        code: '00401'
      });
    }

    // Generate JWT token
    const token = signAccessTokenBusiness(businessOwner._id);

    return successResponseHelper(res, {
      message: 'Login successful',
      data: {
        token,
        businessOwner: {
          _id: businessOwner._id,
          firstName: businessOwner.firstName,
          lastName: businessOwner.lastName,
          email: businessOwner.email,
          phoneNumber: businessOwner.phoneNumber,
          username: businessOwner.username,
          status: businessOwner.status,
          isEmailVerified: businessOwner.isEmailVerified,
          isPhoneVerified: businessOwner.isPhoneVerified
        }
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Register Business (for authenticated business owners)
export const registerBusiness = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner._id;
    const {
      businessName,
      category,
      phoneNumber,
      email,
      facebook,
      linkedIn,
      website,
      twitter,
      metaTitle,
      metaDescription,
      about,
      serviceOffer,
      address,
      city,
      state,
      zipCode,
      country,
      plan
    } = req.body;

    // Handle arrays from form data
    const subcategories = req.body.subcategories ? 
      (Array.isArray(req.body.subcategories) ? req.body.subcategories : [req.body.subcategories]) : [];
    
    const focusKeywords = req.body.focusKeywords ? 
      (Array.isArray(req.body.focusKeywords) ? req.body.focusKeywords : [req.body.focusKeywords]) : [];

    // Get uploaded files from middleware
    const uploadedFiles = req.uploadedFiles || {};
    const logo = uploadedFiles.logo || null;
    const images = uploadedFiles.images || [];

    // Validate required fields
    if (!businessName || !category || !phoneNumber || !email) {
      return errorResponseHelper(res, { 
        message: 'Business name, category, phone number, and email are required',
        code: '00400'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponseHelper(res, { 
        message: 'Please enter a valid email address',
        code: '00400'
      });
    }

    // Check if business already exists with this email or phone
    const existingBusiness = await Business.findOne({ 
      $or: [{ email }, { phoneNumber }] 
    });

    if (existingBusiness) {
      return errorResponseHelper(res, { 
        message: 'Business already exists with this email or phone number',
        code: '00409'
      });
    }

    // Create new business
    const newBusiness = new Business({
      businessOwner: businessOwnerId,
      logo,
      businessName,
      category,
      subcategories: subcategories || [],
      phoneNumber,
      email,
      facebook,
      linkedIn,
      website,
      twitter,
      metaTitle,
      metaDescription,
      focusKeywords: focusKeywords || [],
      about,
      serviceOffer,
      address,
      city,
      state,
      zipCode,
      country,
      images,
      plan: plan || 'bronze',
      status: 'pending'
    });

    try {
      await newBusiness.save();
    } catch (saveError) {
      // If business creation fails, cleanup uploaded files
      if (uploadedFiles.logo || uploadedFiles.images.length > 0) {
        await cleanupUploadedFiles(uploadedFiles);
      }
      throw saveError;
    }

    // Update business owner's businesses array
    await BusinessOwner.findByIdAndUpdate(
      businessOwnerId,
      { $push: { businesses: newBusiness._id } }
    );

    return successResponseHelper(res, {
      message: 'Business registered successfully. Pending admin approval.',
      data: {
        business: newBusiness.getBusinessInfo()
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Get Business Owner's Businesses
export const getBusinessOwnerBusinesses = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner._id;
    
    const businesses = await Business.find({ businessOwner: businessOwnerId })
      .select('businessName category email phoneNumber status plan logo createdAt')
      .sort({ createdAt: -1 });
    
    return successResponseHelper(res, {
      message: 'Businesses retrieved successfully',
      data: businesses
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Update Business Logo
export const updateBusinessLogo = async (req, res) => {
  try {
    const { businessId } = req.params;
    const businessOwnerId = req.businessOwner._id;
    const uploadedFiles = req.uploadedFiles || {};
    
    // Check if business exists and belongs to the business owner
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business not found or access denied',
        code: '00404'
      });
    }
    
    // Check if logo was uploaded
    if (!uploadedFiles.logo) {
      return errorResponseHelper(res, { 
        message: 'No logo file uploaded',
        code: '00400'
      });
    }
    
    // Delete old logo from Cloudinary if exists
    if (business.logo && business.logo.public_id) {
      try {
        const { deleteFile } = await import('../../helpers/cloudinaryHelper.js');
        await deleteFile(business.logo.public_id);
        if (business.logo.thumbnail && business.logo.thumbnail.public_id) {
          await deleteFile(business.logo.thumbnail.public_id);
        }
      } catch (deleteError) {
        console.error('Failed to delete old logo:', deleteError);
      }
    }
    
    // Update business with new logo
    business.logo = uploadedFiles.logo;
    await business.save();
    
    return successResponseHelper(res, {
      message: 'Business logo updated successfully',
      data: {
        logo: business.logo
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Update Business Images
export const updateBusinessImages = async (req, res) => {
  try {
    const { businessId } = req.params;
    const businessOwnerId = req.businessOwner._id;
    const uploadedFiles = req.uploadedFiles || {};
    
    // Check if business exists and belongs to the business owner
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business not found or access denied',
        code: '00404'
      });
    }
    
    // Check if images were uploaded
    if (!uploadedFiles.images || uploadedFiles.images.length === 0) {
      return errorResponseHelper(res, { 
        message: 'No images uploaded',
        code: '00400'
      });
    }
    
    // Add new images to existing ones
    const updatedImages = [...(business.images || []), ...uploadedFiles.images];
    
    // Update business with new images
    business.images = updatedImages;
    await business.save();
    
    return successResponseHelper(res, {
      message: 'Business images updated successfully',
      data: {
        images: business.images,
        totalImages: business.images.length
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Delete Business Image
export const deleteBusinessImage = async (req, res) => {
  try {
    const { businessId, imageId } = req.params;
    const businessOwnerId = req.businessOwner._id;
    
    // Check if business exists and belongs to the business owner
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business not found or access denied',
        code: '00404'
      });
    }
    
    // Find the image to delete
    const imageIndex = business.images.findIndex(img => img._id.toString() === imageId);
    
    if (imageIndex === -1) {
      return errorResponseHelper(res, { 
        message: 'Image not found',
        code: '00404'
      });
    }
    
    const imageToDelete = business.images[imageIndex];
    
    // Delete image from Cloudinary
    try {
      const { deleteFile } = await import('../../helpers/cloudinaryHelper.js');
      await deleteFile(imageToDelete.public_id);
      if (imageToDelete.thumbnail && imageToDelete.thumbnail.public_id) {
        await deleteFile(imageToDelete.thumbnail.public_id);
      }
    } catch (deleteError) {
      console.error('Failed to delete image from Cloudinary:', deleteError);
    }
    
    // Remove image from business
    business.images.splice(imageIndex, 1);
    await business.save();
    
    return successResponseHelper(res, {
      message: 'Image deleted successfully',
      data: {
        totalImages: business.images.length
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Password Recovery Functions

// Step 1: Request Password Reset - Verify Email and Send OTP
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate required fields
    if (!email) {
      return errorResponseHelper(res, { 
        message: 'Email is required',
        code: '00400'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponseHelper(res, { 
        message: 'Please enter a valid email address',
        code: '00400'
      });
    }

    // Check if business owner exists with this email
    const existingBusinessOwner = await BusinessOwner.findOne({ email });
    if (!existingBusinessOwner) {
      return errorResponseHelper(res, { 
        message: 'No account found with this email address',
        code: '00404'
      });
    }

    // Check if account is active
    if (existingBusinessOwner.status === 'suspended' || existingBusinessOwner.status === 'rejected') {
      return errorResponseHelper(res, { 
        message: 'Your account has been suspended or rejected. Please contact support.',
        code: '00401'
      });
    }

    // Generate OTP for password reset
    const tempOtp = "775511"; // For testing - in production, generate random 6-digit OTP
    
    // Generate password reset token (expires in 15 minutes)
    const passwordResetToken = signPasswordResetToken(email);

    // Send OTP via email
    try {
      // Commented out for testing - using dummy OTP
      // await sendEmail(email, "Password Reset Verification", `Your verification code is: ${tempOtp}. This code will expire in 15 minutes.`);
      console.log(`[TESTING] Password Reset OTP for ${email}: ${tempOtp}`);
      
      return successResponseHelper(res, {
        message: 'OTP sent to your email. Please verify to complete password reset.',
        data: {
          email,
          passwordResetToken
        }
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return errorResponseHelper(res, { 
        message: 'Failed to send OTP. Please try again.',
        code: '00500'
      });
    }
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Step 2: Verify OTP for Password Reset
export const verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp, passwordResetToken } = req.body;

    // Validate required fields
    if (!email || !otp || !passwordResetToken) {
      return errorResponseHelper(res, { 
        message: 'Email, OTP, and password reset token are required',
        code: '00400'
      });
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return errorResponseHelper(res, { 
        message: 'OTP must be exactly 6 digits',
        code: '00400'
      });
    }

    // Verify password reset token
    let decodedToken;
    try {
      decodedToken = verifyPasswordResetToken(passwordResetToken);
    } catch (tokenError) {
      return errorResponseHelper(res, { 
        message: 'Invalid or expired password reset token. Please request a new one.',
        code: '00401'
      });
    }

    // Verify email matches token
    if (decodedToken.email !== email) {
      return errorResponseHelper(res, { 
        message: 'Email does not match the reset token',
        code: '00400'
      });
    }

    // Check if business owner exists
    const existingBusinessOwner = await BusinessOwner.findOne({ email });
    if (!existingBusinessOwner) {
      return errorResponseHelper(res, { 
        message: 'No account found with this email address',
        code: '00404'
      });
    }

    // For production, you would store the OTP in a temporary storage (Redis/database) with expiration
    // For now, we'll use a simple approach - in production, implement proper OTP storage and verification
    
    // Verify OTP (using dummy OTP for testing)
    if (otp !== "775511") {
      return errorResponseHelper(res, { 
        message: 'Invalid OTP. Please check your email and try again.',
        code: '00400'
      });
    }

    // Generate new password reset token for the final step
    const finalPasswordResetToken = signPasswordResetToken(email);

    return successResponseHelper(res, {
      message: 'OTP verified successfully. You can now reset your password.',
      data: {
        email,
        finalPasswordResetToken
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Step 3: Reset Password with New Password
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword, finalPasswordResetToken } = req.body;

    // Validate required fields
    if (!email || !newPassword || !confirmPassword || !finalPasswordResetToken) {
      return errorResponseHelper(res, { 
        message: 'Email, new password, confirm password, and reset token are required',
        code: '00400'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponseHelper(res, { 
        message: 'Please enter a valid email address',
        code: '00400'
      });
    }

    // Verify password reset token
    let decodedToken;
    try {
      decodedToken = verifyPasswordResetToken(finalPasswordResetToken);
    } catch (tokenError) {
      return errorResponseHelper(res, { 
        message: 'Invalid or expired password reset token. Please request a new one.',
        code: '00401'
      });
    }

    // Verify email matches token
    if (decodedToken.email !== email) {
      return errorResponseHelper(res, { 
        message: 'Email does not match the reset token',
        code: '00400'
      });
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return errorResponseHelper(res, { 
        message: 'New password and confirm password do not match',
        code: '00400'
      });
    }

    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
      return errorResponseHelper(res, { 
        message: 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character',
        code: '00400'
      });
    }

    // Check if business owner exists
    const existingBusinessOwner = await BusinessOwner.findOne({ email });
    if (!existingBusinessOwner) {
      return errorResponseHelper(res, { 
        message: 'No account found with this email address',
        code: '00404'
      });
    }

    // Update password
    existingBusinessOwner.password = newPassword;
    await existingBusinessOwner.save();

    return successResponseHelper(res, {
      message: 'Password reset successfully. You can now login with your new password.',
      data: {
        email: existingBusinessOwner.email
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
}; 