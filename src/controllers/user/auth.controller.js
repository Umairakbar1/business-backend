import { User } from "../../models/index.js";
import EmailVerification from "../../models/user/emailVerification.js";
import { GLOBAL_MESSAGES } from "../../config/globalConfig.js";
import {
  serverErrorHelper,
  asyncWrapper,
  errorResponseHelper,
  successResponseHelper,
} from "../../helpers/utilityHelper.js";
import { signAccessToken } from "../../helpers/jwtHelper.js";
import { sendEmail } from "../../helpers/sendGridHelper.js";

// Generate unique username from name
const generateUniqueUsername = async (name) => {
  // Convert name to lowercase and replace spaces with underscores
  let baseUsername = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  
  // Ensure base username is at least 3 characters
  if (baseUsername.length < 3) {
    baseUsername = baseUsername + 'user';
  }
  
  // Truncate if too long (max 25 chars to leave room for numbers)
  if (baseUsername.length > 25) {
    baseUsername = baseUsername.substring(0, 25);
  }
  
  let username = baseUsername;
  let counter = 1;
  
  // Keep trying until we find a unique username
  while (true) {
    const existingUser = await User.findOne({ userName: username });
    if (!existingUser) {
      return username;
    }
    
    // Add 1-2 digit number to make it unique
    username = `${baseUsername}${counter}`;
    counter++;
    
    // Prevent infinite loop (max 99 attempts)
    if (counter > 99) {
      // Fallback: add timestamp
      const timestamp = Date.now().toString().slice(-4);
      username = `${baseUsername}${timestamp}`;
      break;
    }
  }
  
  return username;
};

// Send OTP for email verification before registration
const sendRegistrationOtp = async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists by email
  const [existingUserByEmail, existingUserByEmailError] = await asyncWrapper(() =>
    User.findOne({ email })
  );
  if (existingUserByEmailError) return serverErrorHelper(req, res, 500, existingUserByEmailError);
  if (existingUserByEmail) return errorResponseHelper(res, { message: "User already exists with this email" });

  // Check if there's already a pending verification for this email
  const [existingVerification, existingVerificationError] = await asyncWrapper(() =>
    EmailVerification.findOne({ email })
  );
  if (existingVerificationError) return serverErrorHelper(req, res, 500, existingVerificationError);

  let emailVerification;
  
  if (existingVerification) {
    // Update existing verification with new data
    existingVerification.name = name;
    existingVerification.password = password;
    existingVerification.status = "pending";
    existingVerification.attempts = 0;
    emailVerification = existingVerification;
  } else {
    // Create new email verification record
    emailVerification = new EmailVerification({
      name,
      email,
      password
    });
  }

  // Generate OTP
  const otp = emailVerification.generateOTP();
  await emailVerification.save();

  // Send OTP via email
  try {
    // Commented out for testing - using dummy OTP
    // await sendEmail(email, "Email Verification for Registration", `Your OTP is: ${otp}`);
    console.log(`[TESTING] Registration OTP for ${email}: ${otp}`);
    return successResponseHelper(res, { 
      message: "OTP sent to your email for verification",
      email: email
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Verify OTP and complete registration
const verifyRegistrationOtp = async (req, res) => {
  const { email, otp } = req.body;

  // Find email verification record
  const [emailVerification, verificationError] = await asyncWrapper(() =>
    EmailVerification.findOne({ email })
  );
  if (verificationError) return serverErrorHelper(req, res, 500, verificationError);
  if (!emailVerification) return errorResponseHelper(res, { message: "No verification found for this email" });

  // Verify OTP
  if (!emailVerification.verifyOTP(otp)) {
    await emailVerification.save(); // Save the updated attempts
    return errorResponseHelper(res, { message: "Invalid or expired OTP" });
  }

  // Check if user already exists (double check)
  const [existingUser, existingUserError] = await asyncWrapper(() =>
    User.findOne({ email })
  );
  if (existingUserError) return serverErrorHelper(req, res, 500, existingUserError);
  if (existingUser) return errorResponseHelper(res, { message: "User already exists with this email" });

  // Generate unique username
  const [username, usernameError] = await asyncWrapper(() => generateUniqueUsername(emailVerification.name));
  if (usernameError) return serverErrorHelper(req, res, 500, usernameError);

  // Create new user
  const newUser = new User({
    name: emailVerification.name,
    email: emailVerification.email,
    password: emailVerification.password,
    userName: username,
    isEmailVerified: true // Email is verified through OTP
  });

  const [user, error] = await asyncWrapper(() => newUser.save());
  if (error) return serverErrorHelper(req, res, 500, error);

  // Delete the email verification record
  await EmailVerification.findByIdAndDelete(emailVerification._id);

  // Generate JWT token
  const token = signAccessToken(user._id);

  return successResponseHelper(res, {
    message: "User registered successfully",
    user: {
      _id: user._id,
      name: user.name,
      userName: user.userName,
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
      userName: user.userName,
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
      userName: user.userName,
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
        userName: user.userName,
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
        userName: user.userName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profilePhoto: user.profilePhoto,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      },
      token
    });
  }

  // Generate unique username for new Google user
  const [username, usernameError] = await asyncWrapper(() => generateUniqueUsername(name));
  if (usernameError) return serverErrorHelper(req, res, 500, usernameError);

  // Create new user with Google data
  const newUser = new User({
    googleId,
    name,
    email,
    profilePhoto,
    userName: username,
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
      userName: createdUser.userName,
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
  sendRegistrationOtp,
  verifyRegistrationOtp,
  loginUser,
  verifyOtp,
  updatePassword,
  updateProfile,
  deleteProfile,
  googleAuth,
  sendOtp
};
