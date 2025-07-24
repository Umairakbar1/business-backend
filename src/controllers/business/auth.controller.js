import Business from '../../models/business/business.js';
import BusinessOwner from '../../models/business/businessOwner.js';
import { 
  errorResponseHelper, 
  successResponseHelper, 
  serverErrorHelper,
} from '../../helpers/utilityHelper.js';
import { 
  signAccessTokenBusiness, 
  signAccountCreationToken,
  signOtpVerificationToken
} from "../../helpers/jwtHelper.js";
import { sendEmail } from '../../helpers/sendGridHelper.js';
import { uploadImageWithThumbnail } from '../../helpers/cloudinaryHelper.js';

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
      subcategories,
      phoneNumber,
      email,
      facebook,
      linkedIn,
      website,
      twitter,
      metaTitle,
      metaDescription,
      focusKeywords,
      about,
      serviceOffer,
      address,
      city,
      state,
      zipCode,
      country,
      images,
      plan
    } = req.body;

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
      images: images || [],
      plan: plan || 'bronze',
      status: 'pending'
    });

    await newBusiness.save();

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

    const businessOwner = await BusinessOwner.findById(businessOwnerId)
      .populate('businesses')
      .select('-password');

    if (!businessOwner) {
      return errorResponseHelper(res, { 
        message: 'Business owner not found',
        code: '00404'
      });
    }

    return successResponseHelper(res, {
      message: 'Businesses retrieved successfully',
      data: {
        businessOwner: {
          _id: businessOwner._id,
          firstName: businessOwner.firstName,
          lastName: businessOwner.lastName,
          email: businessOwner.email,
          status: businessOwner.status
        },
        businesses: businessOwner.businesses
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
}; 