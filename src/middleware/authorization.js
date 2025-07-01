import Admin from "../models/admin/admin.js";
import User from "../models/user/user.js";
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
    req.user = verify(token, GLOBAL_ENV.jwtSecretKeyUser, { expiresIn: GLOBAL_ENV.jwtExpiresInUser });
    if (!mongoose.Types.ObjectId.isValid(req.user._id))
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.invalidData,code:"00401"});

      const userExists = await User.findById(req.user._id);
    if (!userExists)
      return errorResponseHelper(res, {message:GLOBAL_MESSAGES.dataNotFound,code:"00401"});
    if (userExists.status == GLOBAL_ENV.userStatus.Blocked)
        return errorResponseHelper(res, {message:"Access restricted by administrator. Please contact support for assistance.",code:"00401"});
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


export {
  authorizedAccessUser,
  authorizedAccessAdmin
};
