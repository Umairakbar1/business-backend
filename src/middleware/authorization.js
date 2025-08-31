import Admin from "../models/admin/admin.js";
import User from "../models/user/user.js";
import BusinessOwner from "../models/business/businessOwner.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import {
  errorResponseHelper,
  serverErrorHelper,
} from "../helpers/utilityHelper.js";
import { GLOBAL_MESSAGES } from "../config/globalConfig.js";
const { verify } = jwt;
import GLOBAL_ENV from "../config/envConfig.js";


const authorizedAccessUser = async (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) return errorResponseHelper(res, {...GLOBAL_MESSAGES.jwtRequired,code:"00401"});

  if (token.includes("Bearer"))
    token = req.header("Authorization").replace("Bearer ", "");

  try {
    const decoded = verify(token, GLOBAL_ENV.jwtSecretKeyUser, { expiresIn: GLOBAL_ENV.jwtExpiresInUser });
    if (!mongoose.Types.ObjectId.isValid(decoded._id))
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.invalidData,code:"00401"});

    const userExists = await User.findById(decoded._id);
    if (!userExists)
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.dataNotFound,code:"00401"});
    
    // Check if user is blocked
    if (userExists.status === 'blocked') {
        return errorResponseHelper(res, {message:"Access restricted by administrator. Please contact support for assistance.",code:"00401"});
    }
    
    // Set req.user with the full user data from database
    req.user = {
      _id: userExists._id,
      name: userExists.name,
      email: userExists.email,
      userName: userExists.userName,
      status: userExists.status
    };
    
    next();
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

const authorizedAccessAdmin = async (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) return errorResponseHelper(res, {message:GLOBAL_MESSAGES.jwtRequired,code:"00401"});

  if (token.includes("Bearer"))
    token = req.header("Authorization").replace("Bearer ", "");

  try {
    req.user = verify(token, GLOBAL_ENV.jwtSecretKeyAdmin, { expiresIn: GLOBAL_ENV.jwtExpiresInAdmin });
    if (!mongoose.Types.ObjectId.isValid(req.user._id))
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.invalidData,code:"00401"});

    const userExists = await Admin.findById(req.user._id);

    if (!userExists)
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.dataNotFound,code:"00401"});

    next();
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

const verifyAdminToken = async (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) return errorResponseHelper(res, {message:GLOBAL_MESSAGES.jwtRequired,code:"00401"});

  if (token.includes("Bearer"))
    token = req.header("Authorization").replace("Bearer ", "");

  try {
    const decoded = verify(token, GLOBAL_ENV.jwtSecretKeyAdmin, { expiresIn: GLOBAL_ENV.jwtExpiresInAdmin });
    if (!mongoose.Types.ObjectId.isValid(decoded._id))
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.invalidData,code:"00401"});

    const adminExists = await Admin.findById(decoded._id);
    if (!adminExists)
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.dataNotFound,code:"00401"});

    req.admin = adminExists;
    next();
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

const authorizedAccessBusiness = async (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) return errorResponseHelper(res, {message:GLOBAL_MESSAGES.jwtRequired,code:"00401"});

  if (token.includes("Bearer"))
    token = req.header("Authorization").replace("Bearer ", "");

  try {
    req.businessOwner = verify(token, GLOBAL_ENV.jwtSecretKeyBusiness || GLOBAL_ENV.jwtSecretKeyAdmin, { expiresIn: GLOBAL_ENV.jwtExpiresInBusiness || GLOBAL_ENV.jwtExpiresInAdmin });
    if (!mongoose.Types.ObjectId.isValid(req.businessOwner._id))
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.invalidData,code:"00401"});

    const businessOwnerExists = await BusinessOwner.findById(req.businessOwner._id);

    if (!businessOwnerExists) {
      console.log('Business owner not found in middleware:', req.businessOwner._id);
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.dataNotFound,code:"00401"});
    }

    console.log('Business owner verified in middleware:', businessOwnerExists.email);
    next();
  } catch (error) {
    console.error('Error in authorizedAccessBusiness middleware:', error);
    return serverErrorHelper(req, res, 500, error);
  }
};

const verifyBusinessOwnerToken = async (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) return errorResponseHelper(res, {message:GLOBAL_MESSAGES.jwtRequired,code:"00401"});

  if (token.includes("Bearer"))
    token = req.header("Authorization").replace("Bearer ", "");

  try {
    const data = verify(token, GLOBAL_ENV.jwtSecretKeyBusiness, { expiresIn: GLOBAL_ENV.jwtExpiresInBusiness });
    if (!mongoose.Types.ObjectId.isValid(data._id))
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.invalidData,code:"00401"});

    const businessOwner = await BusinessOwner.findById(data._id);

    if (!businessOwner)
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.dataNotFound,code:"00401"});
    req.businessOwner = businessOwner;
    next();
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// New middleware for account creation tokens (contains user data, not business owner ID)
const verifyAccountCreationToken = async (req, res, next) => {
  let token = req.header("Authorization");
  if (!token) return errorResponseHelper(res, {message:GLOBAL_MESSAGES.jwtRequired,code:"00401"});

  if (token.includes("Bearer"))
    token = req.header("Authorization").replace("Bearer ", "");

  console.log("🔍 Verifying account creation token...");
  console.log("Token:", token.substring(0, 50) + "...");

  try {
    req.user = verify(token, GLOBAL_ENV.jwtSecretKeyBusiness || GLOBAL_ENV.jwtSecretKeyAdmin, { expiresIn: GLOBAL_ENV.jwtExpiresInBusiness || GLOBAL_ENV.jwtExpiresInAdmin });
    
    console.log("🔍 Token decoded successfully");
    console.log("Token payload:", req.user);
    
    // Check if this is an account creation token (contains user data)
    if (req.user.isPendingCreation && req.user.email) {
      console.log("✅ Account creation token verified:", req.user.email);
      next();
    } else {
      console.log("❌ Not an account creation token, checking if existing business owner...");
      // This might be an existing business owner token
      if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
        console.log("❌ Invalid ObjectId in token:", req.user._id);
        return errorResponseHelper(res, {message:GLOBAL_MESSAGES.invalidData,code:"00401"});
      }

      const businessOwnerExists = await BusinessOwner.findById(req.user._id);
      if (!businessOwnerExists) {
        console.log("❌ Business owner not found in database");
        return errorResponseHelper(res, {message:GLOBAL_MESSAGES.dataNotFound,code:"00401"});
      }

      console.log("✅ Existing business owner token verified");
      next();
    }
  } catch (error) {
    console.error("❌ Token verification error:", error);
    return serverErrorHelper(req, res, 500, error);
  }
};

export {
  authorizedAccessUser,
  authorizedAccessAdmin,
  authorizedAccessBusiness,
  verifyBusinessOwnerToken,
  verifyAccountCreationToken,
  verifyAdminToken
};
