import Business from '../../models/business/business.js';
import { 
  errorResponseHelper, 
  successResponseHelper, 
  serverErrorHelper,
  asyncWrapper 
} from '../../helpers/utilityHelper.js';
import { signAccessTokenBusiness } from '../../helpers/jwtHelper.js';
import { sendEmail } from '../../helpers/sendGridHelper.js';
import { uploadImageWithThumbnail } from '../../helpers/cloudinaryHelper.js';

// Business Signup - Step 1: Basic Information
export const businessSignup = async (req, res) => {
  try {
    const { ownerFirstName, ownerLastName, email, phoneNumber } = req.body;

    // Validate required fields
    if (!ownerFirstName || !ownerLastName || !email || !phoneNumber) {
      return errorResponseHelper(res, { 
        message: 'First name, last name, email, and phone number are required',
        code: '00400'
      });
    }

    // Check if business already exists
    const existingBusiness = await Business.findOne({ 
      $or: [{ email }, { phoneNumber }] 
    });

    if (existingBusiness) {
      return errorResponseHelper(res, { 
        message: 'Business account already exists with this email or phone number',
        code: '00409'
      });
    }

    // Create new business account
    const newBusiness = new Business({
      ownerFirstName,
      ownerLastName,
      email,
      phoneNumber,
      status: 'pending' // Default status - needs admin approval
    });

    // Generate and send OTP
    const otp = newBusiness.generateOTP();
    await newBusiness.save();

    // Send OTP via email
    try {
      await sendEmail(email, "Business Account Verification", `Your verification code is: ${otp}`);
      return successResponseHelper(res, {
        message: 'Business account created successfully. Please check your email for verification code.',
        data: {
          email: newBusiness.email,
          ownerFirstName: newBusiness.ownerFirstName,
          ownerLastName: newBusiness.ownerLastName
        }
      });
    } catch (emailError) {
      // If email fails, still save the business but inform user
      return successResponseHelper(res, {
        message: 'Business account created but email verification failed. Please contact support.',
        data: {
          email: newBusiness.email,
          ownerFirstName: newBusiness.ownerFirstName,
          ownerLastName: newBusiness.ownerLastName
        }
      });
    }
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Verify OTP and Set Password/Username - Step 2
export const verifyOtpAndSetCredentials = async (req, res) => {
  try {
    const { email, otp, username, password } = req.body;

    // Validate required fields
    if (!email || !otp || !username || !password) {
      return errorResponseHelper(res, { 
        message: 'Email, OTP, username, and password are required',
        code: '00400'
      });
    }

    // Find business by email
    const business = await Business.findOne({ email });
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business account not found',
        code: '00404'
      });
    }

    // Verify OTP
    if (!business.verifyOTP(otp)) {
      return errorResponseHelper(res, { 
        message: 'Invalid or expired OTP',
        code: '00400'
      });
    }

    // Check if username is already taken
    const existingUsername = await Business.findOne({ username });
    if (existingUsername && existingUsername._id.toString() !== business._id.toString()) {
      return errorResponseHelper(res, { 
        message: 'Username is already taken',
        code: '00409'
      });
    }

    // Update business with credentials and mark email as verified
    business.username = username;
    business.password = password;
    business.isEmailVerified = true;
    business.otp = undefined; // Clear OTP
    await business.save();

    return successResponseHelper(res, {
      message: 'Account verified successfully. Your account is pending admin approval.',
      data: {
        email: business.email,
        username: business.username,
        status: business.status
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Business Login
export const businessLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return errorResponseHelper(res, { 
        message: 'Email and password are required',
        code: '00400'
      });
    }

    // Find business by email
    const business = await Business.findOne({ email }).select('+password');
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Invalid email or password',
        code: '00401'
      });
    }

    // Check if email is verified
    if (!business.isEmailVerified) {
      return errorResponseHelper(res, { 
        message: 'Please verify your email first',
        code: '00401'
      });
    }

    // Check if account is approved
    if (business.status !== 'approved') {
      return errorResponseHelper(res, { 
        message: `Account is ${business.status}. Please wait for admin approval.`,
        code: '00401'
      });
    }

    // Verify password
    const isPasswordValid = await business.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponseHelper(res, { 
        message: 'Invalid email or password',
        code: '00401'
      });
    }

    // Generate JWT token
    const token = signAccessTokenBusiness(business._id);

    return successResponseHelper(res, {
      message: 'Login successful',
      data: {
        token,
        business: {
          _id: business._id,
          ownerFirstName: business.ownerFirstName,
          ownerLastName: business.ownerLastName,
          email: business.email,
          phoneNumber: business.phoneNumber,
          username: business.username,
          businessName: business.businessName,
          status: business.status,
          profilePhoto: business.profilePhoto,
          isEmailVerified: business.isEmailVerified,
          isPhoneVerified: business.isPhoneVerified
        }
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Google Authentication for Business
export const businessGoogleAuth = async (req, res) => {
  try {
    const { googleId, ownerFirstName, ownerLastName, email, profilePhoto } = req.body;

    // Validate required fields
    if (!googleId || !ownerFirstName || !ownerLastName || !email) {
      return errorResponseHelper(res, { 
        message: 'Google ID, first name, last name, and email are required',
        code: '00400'
      });
    }

    // Check if business exists with this Google ID
    let business = await Business.findOne({ googleId });
    if (business) {
      // Business exists, check status and generate token
      if (business.status !== 'approved') {
        return errorResponseHelper(res, { 
          message: `Account is ${business.status}. Please wait for admin approval.`,
          code: '00401'
        });
      }

      const token = signAccessTokenBusiness(business._id);
      return successResponseHelper(res, {
        message: 'Login successful',
        data: {
          token,
          business: {
            _id: business._id,
            ownerFirstName: business.ownerFirstName,
            ownerLastName: business.ownerLastName,
            email: business.email,
            phoneNumber: business.phoneNumber,
            username: business.username,
            businessName: business.businessName,
            status: business.status,
            profilePhoto: business.profilePhoto,
            isEmailVerified: business.isEmailVerified,
            isPhoneVerified: business.isPhoneVerified
          }
        }
      });
    }

    // Check if business exists with this email
    business = await Business.findOne({ email });
    if (business) {
      // Business exists with email but no Google ID, link the accounts
      business.googleId = googleId;
      if (!business.profilePhoto) business.profilePhoto = profilePhoto;
      await business.save();

      if (business.status !== 'approved') {
        return errorResponseHelper(res, { 
          message: `Account is ${business.status}. Please wait for admin approval.`,
          code: '00401'
        });
      }

      const token = signAccessTokenBusiness(business._id);
      return successResponseHelper(res, {
        message: 'Account linked successfully',
        data: {
          token,
          business: {
            _id: business._id,
            ownerFirstName: business.ownerFirstName,
            ownerLastName: business.ownerLastName,
            email: business.email,
            phoneNumber: business.phoneNumber,
            username: business.username,
            businessName: business.businessName,
            status: business.status,
            profilePhoto: business.profilePhoto,
            isEmailVerified: business.isEmailVerified,
            isPhoneVerified: business.isPhoneVerified
          }
        }
      });
    }

    // Create new business account with Google data
    const newBusiness = new Business({
      googleId,
      ownerFirstName,
      ownerLastName,
      email,
      profilePhoto,
      isEmailVerified: true, // Google accounts are pre-verified
      status: 'pending' // Needs admin approval
    });

    await newBusiness.save();

    return successResponseHelper(res, {
      message: 'Business account created successfully. Please wait for admin approval.',
      data: {
        email: newBusiness.email,
        ownerFirstName: newBusiness.ownerFirstName,
        ownerLastName: newBusiness.ownerLastName,
        status: newBusiness.status
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Send OTP for Email Verification
export const sendOtpForEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponseHelper(res, { 
        message: 'Email is required',
        code: '00400'
      });
    }

    // Find business by email
    const business = await Business.findOne({ email });
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business account not found',
        code: '00404'
      });
    }

    // Generate OTP
    const otp = business.generateOTP();
    await business.save();

    // Send OTP via email
    try {
      await sendEmail(email, "Business Account Verification", `Your verification code is: ${otp}`);
      return successResponseHelper(res, { 
        message: 'OTP sent to your email' 
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

// Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return errorResponseHelper(res, { 
        message: 'Email and OTP are required',
        code: '00400'
      });
    }

    // Find business by email
    const business = await Business.findOne({ email });
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business account not found',
        code: '00404'
      });
    }

    // Verify OTP
    if (!business.verifyOTP(otp)) {
      return errorResponseHelper(res, { 
        message: 'Invalid or expired OTP',
        code: '00400'
      });
    }

    // Mark email as verified
    business.isEmailVerified = true;
    business.otp = undefined; // Clear OTP
    await business.save();

    return successResponseHelper(res, { 
      message: 'Email verified successfully' 
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Forgot Password - Send OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponseHelper(res, { 
        message: 'Email is required',
        code: '00400'
      });
    }

    // Find business by email
    const business = await Business.findOne({ email });
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business account not found',
        code: '00404'
      });
    }

    // Generate OTP
    const otp = business.generateOTP();
    await business.save();

    // Send OTP via email
    try {
      await sendEmail(email, "Password Reset Verification", `Your password reset code is: ${otp}`);
      return successResponseHelper(res, { 
        message: 'Password reset OTP sent to your email' 
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

// Reset Password with OTP
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return errorResponseHelper(res, { 
        message: 'Email, OTP, and new password are required',
        code: '00400'
      });
    }

    // Find business by email
    const business = await Business.findOne({ email });
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business account not found',
        code: '00404'
      });
    }

    // Verify OTP
    if (!business.verifyOTP(otp)) {
      return errorResponseHelper(res, { 
        message: 'Invalid or expired OTP',
        code: '00400'
      });
    }

    // Update password
    business.password = newPassword;
    business.otp = undefined; // Clear OTP
    await business.save();

    return successResponseHelper(res, { 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Update Password (Protected Route)
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const businessId = req.business._id;

    if (!currentPassword || !newPassword) {
      return errorResponseHelper(res, { 
        message: 'Current password and new password are required',
        code: '00400'
      });
    }

    // Find business
    const business = await Business.findById(businessId).select('+password');
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business account not found',
        code: '00404'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await business.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return errorResponseHelper(res, { 
        message: 'Current password is incorrect',
        code: '00400'
      });
    }

    // Update password
    business.password = newPassword;
    await business.save();

    return successResponseHelper(res, { 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Update Profile (Protected Route)
export const updateProfile = async (req, res) => {
  try {
    const businessId = req.business._id;
    const {
      ownerFirstName,
      ownerLastName,
      phoneNumber,
      businessName,
      address,
      city,
      state,
      zipCode,
      country
    } = req.body;

    // Find business
    const business = await Business.findById(businessId);
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business account not found',
        code: '00404'
      });
    }

    // Handle profile photo upload
    let profilePhotoData = null;
    if (req.file) {
      try {
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/profiles');
        profilePhotoData = {
          url: uploadResult.original.url,
          public_id: uploadResult.original.public_id,
          thumbnail: {
            url: uploadResult.thumbnail.url,
            public_id: uploadResult.thumbnail.public_id
          }
        };
      } catch (uploadError) {
        console.error('Profile photo upload error:', uploadError);
        return errorResponseHelper(res, { 
          message: 'Failed to upload profile photo. Please try again.', 
          code: '00500' 
        });
      }
    }

    // Update fields
    if (ownerFirstName) business.ownerFirstName = ownerFirstName;
    if (ownerLastName) business.ownerLastName = ownerLastName;
    if (phoneNumber) business.phoneNumber = phoneNumber;
    if (businessName) business.businessName = businessName;
    if (address) business.address = address;
    if (city) business.city = city;
    if (state) business.state = state;
    if (zipCode) business.zipCode = zipCode;
    if (country) business.country = country;
    if (profilePhotoData) business.profilePhoto = profilePhotoData;

    await business.save();

    return successResponseHelper(res, {
      message: 'Profile updated successfully',
      data: {
        _id: business._id,
        ownerFirstName: business.ownerFirstName,
        ownerLastName: business.ownerLastName,
        email: business.email,
        phoneNumber: business.phoneNumber,
        username: business.username,
        businessName: business.businessName,
        address: business.address,
        city: business.city,
        state: business.state,
        zipCode: business.zipCode,
        country: business.country,
        profilePhoto: business.profilePhoto,
        status: business.status,
        isEmailVerified: business.isEmailVerified,
        isPhoneVerified: business.isPhoneVerified
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Get Business Profile (Protected Route)
export const getProfile = async (req, res) => {
  try {
    const businessId = req.business._id;

    const business = await Business.findById(businessId);
    if (!business) {
      return errorResponseHelper(res, { 
        message: 'Business account not found',
        code: '00404'
      });
    }

    return successResponseHelper(res, {
      message: 'Profile fetched successfully',
      data: {
        _id: business._id,
        ownerFirstName: business.ownerFirstName,
        ownerLastName: business.ownerLastName,
        email: business.email,
        phoneNumber: business.phoneNumber,
        username: business.username,
        businessName: business.businessName,
        address: business.address,
        city: business.city,
        state: business.state,
        zipCode: business.zipCode,
        country: business.country,
        profilePhoto: business.profilePhoto,
        status: business.status,
        isEmailVerified: business.isEmailVerified,
        isPhoneVerified: business.isPhoneVerified
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
}; 