import { generate } from "randomstring";
import { LogModal } from "../models/index.js";
import bcrypt from "bcryptjs"
import { GLOBAL_ENV, GLOBAL_MESSAGES } from "../config/globalConfig.js";

const ipHelper = (req) =>
  req.headers["x-forwarded-for"]
    ? req.headers["x-forwarded-for"].split(/, /)[0]
    : req.connection.remoteAddress;

const logHelper = (logData, userId, level, req) => {
  let ip = "no-ip";
  if (req !== "") ip = ipHelper(req);
  const global_log = {
    resultCode: logData.code,
    level: level,
    errorMessage: logData.message,
    ip: ip,
  };
  let logObject = new LogModal(global_log);
  if (userId !== "" && userId) logObject.userId = userId;
  logObject.save();
};

const generateRandomCode = (length) => generate({ length, charset: "numeric" });

const serverErrorHelper = (req, res, code, error) => {
  console.log("@ServerErrorLog:", error);
  let userId = "";
  let message = "internal server error.";
  let errorCode = "00004";
  if (error && error.message) message = error.message;
  if (error && error.code) errorCode = error.code;
  if (req && req.user && req.user._id) userId = req.user._id;

  // to save error in db for better debugging
  // logHelper(error, userId, "Server Error", req);
  res.status(code).json({
    success: false,
    code,
    error: GLOBAL_MESSAGES.serverError,
  });
};

const errorResponseHelper = (res, error) => {
  console.log("@errorResponseLog", error);
  let message = "client side error.";
  let code = "00005";
  if (error && error.message) message = error.message;
  if (error && error.code) code = error.code;
  res.status(200).json({
    error: { message, code },
    success: false,
  });
};

const successResponseHelper = (res, data) => {
  res.status(200).json({
    success: true,
    data,
  });
};

// const getUniqueUserName = async (name) => {
//   let tempName = "";
//   let username = "";
//   if (name.includes(" ")) {
//     tempName = name.trim().split(" ").slice(0, 1).join("").toLowerCase();
//   } else {
//     tempName = name.toLowerCase().trim();
//   }
//   do {
//     username = tempName + generateRandomCode(4);
//     let exists = await AthleteModel.exists({ username: username });
//     if (!exists) return username;
//   } while (true);
// };

const generateTimeOut = () => {
  const currentTimestamp = Date.now(); // Get current timestamp in milliseconds
  const threeMinutesInMilliseconds = 3 * 60 * 1000; // 3 minutes in milliseconds
  return currentTimestamp + threeMinutesInMilliseconds;
}

function generateOTP() {
  // Generate a random number between 100000 and 999999
  const min = 100000;
  const max = 999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const generateOtpHash = (otp) => bcrypt.hash(otp.toString(),10);


function getDayFromNow(day, today) {
  const oneDay = 1000 * 60 * 60 * 24 * day; // day in milliseconds
  return new Date(today.getTime() + oneDay);
}

function getHoursFromNow(hours, now) {
  const oneDay = 1000 * 60 * 60 * hours; // hours in milliseconds
  return new Date(now.getTime() + oneDay);
}

const asyncWrapper = async (_callBack = async () => false) => {
  try {
    const data = await _callBack();
    return [data, null];
  } catch (error) {
    return [null, error];
  }
};

/**
 * Generate a slug from a title
 * @param {string} title - The title to convert to slug
 * @returns {string} - The generated slug
 */
export const generateSlug = (title) => {
  if (!title) return '';

  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special characters except hyphens
    .replace(/-+/g, '-')        // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');     // Remove leading and trailing hyphens
};


export {
  serverErrorHelper,
  errorResponseHelper,
  successResponseHelper,
  // getUniqueUserName,
  generateRandomCode,
  logHelper,
  ipHelper,
  asyncWrapper,
  getDayFromNow,
  getHoursFromNow,
  generateTimeOut,
  generateOtpHash,
  generateOTP
};
