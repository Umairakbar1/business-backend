import pkg from "jsonwebtoken";
import { GLOBAL_ENV } from "../config/globalConfig.js";
const { sign, verify } = pkg;

// Debug: Log the JWT secret keys being used
console.log('JWT Helper Debug:');
console.log('jwtSecretKeyUser:', GLOBAL_ENV.jwtSecretKeyUser ? 'SET' : 'NOT SET');
console.log('jwtSecretKeyAdmin:', GLOBAL_ENV.jwtSecretKeyAdmin ? 'SET' : 'NOT SET');
console.log('jwtSecretKeyBusiness:', GLOBAL_ENV.jwtSecretKeyBusiness ? 'SET' : 'NOT SET');

const signAccessToken = (_id) => {
  if (!GLOBAL_ENV.jwtSecretKeyUser) {
    throw new Error('JWT secret key for users is not configured');
  }
  const accessToken = sign({ _id }, GLOBAL_ENV.jwtSecretKeyUser, {
    expiresIn: "7d",
  });
  return accessToken;
};


const signRefreshToken = (_id) => {
  if (!GLOBAL_ENV.jwtSecretKeyUser) {
    throw new Error('JWT secret key for users is not configured');
  }
  const refreshToken = sign({ _id }, GLOBAL_ENV.jwtSecretKeyUser, {
    expiresIn: "7d",
  });
  return refreshToken;
};

const signAccessTokenAdmin = (_id) => {
  if (!GLOBAL_ENV.jwtSecretKeyAdmin) {
    throw new Error('JWT secret key for admins is not configured');
  }
  const accessToken = sign({ _id }, GLOBAL_ENV.jwtSecretKeyAdmin, {
    expiresIn: "7d",
  });
  return accessToken;
};

const signAccessTokenBusiness = (_id) => {
  // Use business secret key, fallback to admin, then user
  const secretKey = GLOBAL_ENV.jwtSecretKeyBusiness || GLOBAL_ENV.jwtSecretKeyAdmin || GLOBAL_ENV.jwtSecretKeyUser;
  if (!secretKey) {
    throw new Error('JWT secret key for business is not configured');
  }
  console.log('Using JWT secret for business token generation');
  const accessToken = sign({ _id }, secretKey, {
    expiresIn: "7d",
  });
  return accessToken;
};

const signAccountCreationToken = (userData) => {
  // Use business secret key, fallback to admin, then user
  const secretKey = GLOBAL_ENV.jwtSecretKeyBusiness || GLOBAL_ENV.jwtSecretKeyAdmin || GLOBAL_ENV.jwtSecretKeyUser;
  if (!secretKey) {
    throw new Error('JWT secret key for business is not configured');
  }
  console.log('Using JWT secret for account creation token generation');
  const accessToken = sign(userData, secretKey, {
    expiresIn: "7d",
  });
  return accessToken;
};

const signConfirmCodeToken = (_id, code) => {
  if (!GLOBAL_ENV.jwtSecretKeyUser) {
    throw new Error('JWT secret key for users is not configured');
  }
  const confirmCodeToken = sign({ _id, code }, GLOBAL_ENV.jwtSecretKeyUser, {
    expiresIn: "5m",
  });
  return confirmCodeToken;
};

const signOtpVerificationToken = (email, otp) => {
  if (!GLOBAL_ENV.jwtSecretKeyUser) {
    throw new Error('JWT secret key for users is not configured');
  }
  const otpVerificationToken = sign({ email, otp }, GLOBAL_ENV.jwtSecretKeyUser, {
    expiresIn: "5m",
  });
  return otpVerificationToken;
};

const verifyOtpVerificationToken = (token) => {
  if (!GLOBAL_ENV.jwtSecretKeyUser) {
    throw new Error('JWT secret key for users is not configured');
  }
  try {
    const decoded = verify(token, GLOBAL_ENV.jwtSecretKeyUser);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired verification token');
  }
};

export {
  signAccessToken,
  signRefreshToken,
  signConfirmCodeToken,
  signAccessTokenAdmin,
  signAccessTokenBusiness,
  signAccountCreationToken,
  signOtpVerificationToken,
  verifyOtpVerificationToken
};
