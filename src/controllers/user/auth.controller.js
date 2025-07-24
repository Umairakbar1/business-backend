import { User } from "../../models/index.js";
import { GLOBAL_MESSAGES } from "../../config/globalConfig.js";
import {
  serverErrorHelper,
  asyncWrapper,
  errorResponseHelper,
  successResponseHelper,
} from "../../helpers/utilityHelper.js";
import { signAccessToken } from "../../helpers/jwtHelper.js";
import { sendEmail } from "../../helpers/sendGridHelper.js";

// Register user with email and password
const registerUser = async (req, res) => {
  const { name, email, password, phoneNumber } = req.body;

  // Check if user already exists
  const [existingUser, existingUserError] = await asyncWrapper(() =>
    User.findOne({ $or: [{ email }, { phoneNumber }] })
  );
  if (existingUserError) return serverErrorHelper(req, res, 500, existingUserError);
  if (existingUser) return errorResponseHelper(res, { message: "User already exists with this email or phone number" });

  // Create new user
  const newUser = new User({
    name,
    email,
    password,
    phoneNumber
  });

  const [user, error] = await asyncWrapper(() => newUser.save());
  if (error) return serverErrorHelper(req, res, 500, error);

  // Generate JWT token
  const token = signAccessToken(user._id);

  return successResponseHelper(res, {
    message: "User registered successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePhoto: user.profilePhoto,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified
    },
    token
  });
};

// Login user with email and password
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const [user, userError] = await asyncWrapper(() =>
    User.findOne({ email }).select("+password")
  );
  if (userError) return serverErrorHelper(req, res, 500, userError);
  if (!user) return errorResponseHelper(res, { message: "Invalid email or password" });

  // Check if user is active
  if (user.status !== "active") {
    return errorResponseHelper(res, { message: "Account is not active" });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) return errorResponseHelper(res, { message: "Invalid email or password" });

  // Generate JWT token
  const token = signAccessToken(user._id);

  return successResponseHelper(res, {
    message: "Login successful",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePhoto: user.profilePhoto,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified
    },
    token
  });
};

// Send OTP to email
const sendOtp = async (req, res) => {
  const { email } = req.body;

  // Find user by email
  const [user, userError] = await asyncWrapper(() => User.findOne({ email }));
  if (userError) return serverErrorHelper(req, res, 500, userError);
  if (!user) return errorResponseHelper(res, { message: "User not found" });

  // Generate OTP
  const otp = user.generateOTP();
  await user.save();

  // Send OTP via email
  try {
    // Commented out for testing - using dummy OTP
    // await sendEmail(email, "Email Verification", otp);
    console.log(`[TESTING] User OTP for ${email}: ${otp}`);
    return successResponseHelper(res, { message: "OTP sent to your email" });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  // Find user by email
  const [user, userError] = await asyncWrapper(() => User.findOne({ email }));
  if (userError) return serverErrorHelper(req, res, 500, userError);
  if (!user) return errorResponseHelper(res, { message: "User not found" });

  // Verify OTP
  if (!user.verifyOTP(otp)) {
    return errorResponseHelper(res, { message: "Invalid or expired OTP" });
  }

  // Mark email as verified
  user.isEmailVerified = true;
  user.otp = undefined; // Clear OTP
  await user.save();

  return successResponseHelper(res, { message: "Email verified successfully" });
};

// Update password (protected route)
const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  // Find user
  const [user, userError] = await asyncWrapper(() => User.findById(userId).select("+password"));
  if (userError) return serverErrorHelper(req, res, 500, userError);
  if (!user) return errorResponseHelper(res, { message: "User not found" });

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return errorResponseHelper(res, { message: "Current password is incorrect" });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return successResponseHelper(res, { message: "Password updated successfully" });
};

// Update profile (protected route)
const updateProfile = async (req, res) => {
  const { name, profilePhoto } = req.body;
  const userId = req.user._id;

  const updateData = {};
  if (name) updateData.name = name;
  if (profilePhoto) updateData.profilePhoto = profilePhoto;

  const [user, error] = await asyncWrapper(() =>
    User.findByIdAndUpdate(userId, updateData, { new: true })
  );
  if (error) return serverErrorHelper(req, res, 500, error);
  if (!user) return errorResponseHelper(res, { message: "User not found" });

  return successResponseHelper(res, {
    message: "Profile updated successfully",
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profilePhoto: user.profilePhoto,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified
    }
  });
};

// Delete profile (protected route)
const deleteProfile = async (req, res) => {
  const userId = req.user._id;

  const [user, error] = await asyncWrapper(() =>
    User.findByIdAndDelete(userId)
  );
  if (error) return serverErrorHelper(req, res, 500, error);
  if (!user) return errorResponseHelper(res, { message: "User not found" });

  return successResponseHelper(res, { message: "Profile deleted successfully" });
};

// Google authentication
const googleAuth = async (req, res) => {
  const { googleId, name, email, profilePhoto } = req.body;

  // Check if user exists with this Google ID
  let [user, userError] = await asyncWrapper(() => User.findOne({ googleId }));
  if (userError) return serverErrorHelper(req, res, 500, userError);

  if (user) {
    // User exists, generate token and return
    const token = signAccessToken(user._id);
    return successResponseHelper(res, {
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      },
      token
    });
  }

  // Check if user exists with this email
  [user, userError] = await asyncWrapper(() => User.findOne({ email }));
  if (userError) return serverErrorHelper(req, res, 500, userError);

  if (user) {
    // User exists with email but no Google ID, link the accounts
    user.googleId = googleId;
    if (!user.profilePhoto) user.profilePhoto = profilePhoto;
    await user.save();

    const token = signAccessToken(user._id);
    return successResponseHelper(res, {
      message: "Account linked successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      },
      token
    });
  }

  // Create new user with Google data
  const newUser = new User({
    googleId,
    name,
    email,
    profilePhoto,
    isEmailVerified: true // Google accounts are pre-verified
  });

  const [createdUser, createError] = await asyncWrapper(() => newUser.save());
  if (createError) return serverErrorHelper(req, res, 500, createError);

  const token = signAccessToken(createdUser._id);
  return successResponseHelper(res, {
    message: "Account created successfully",
    user: {
      _id: createdUser._id,
      name: createdUser.name,
      email: createdUser.email,
      phoneNumber: createdUser.phoneNumber,
      profilePhoto: createdUser.profilePhoto,
      isEmailVerified: createdUser.isEmailVerified,
      isPhoneVerified: createdUser.isPhoneVerified
    },
    token
  });
};

export {
  registerUser,
  loginUser,
  verifyOtp,
  updatePassword,
  updateProfile,
  deleteProfile,
  googleAuth,
  sendOtp
};
