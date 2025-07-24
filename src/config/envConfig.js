import { config } from "dotenv";

config();

const {
  DB_URI,
  JWT_SECRET_KEY,
  JWT_SECRET_KEY_ADMIN,
  JWT_SECRET_KEY_BUSINESS,
  JWT_EXPIRES_IN,
  JWT_EXPIRES_IN_ADMIN,
  JWT_EXPIRES_IN_BUSINESS,
  PORT,
  SERVER_IP,
  SENDGRID_API_KEY,
  SENDGRID_EMAIL_SEND_FROM,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  NODEMAILER_EMAIL,
  NODEMAILER_APP_PASSWORD,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
} = process.env;

// Debug: Log environment variables (remove in production)
console.log('Environment Variables Check:');
console.log('JWT_SECRET_KEY:', JWT_SECRET_KEY ? 'SET' : 'NOT SET');
console.log('JWT_SECRET_KEY_ADMIN:', JWT_SECRET_KEY_ADMIN ? 'SET' : 'NOT SET');
console.log('JWT_SECRET_KEY_BUSINESS:', JWT_SECRET_KEY_BUSINESS ? 'SET' : 'NOT SET');

const dbUri = DB_URI || 'mongodb://localhost:27017/business_platform';
const jwtSecretKeyUser = JWT_SECRET_KEY || 'fallback_jwt_secret_key_for_users_min_32_chars_long_for_security';
const jwtSecretKeyAdmin = JWT_SECRET_KEY_ADMIN || 'fallback_jwt_secret_key_for_admins_min_32_chars_long_for_security';
const jwtSecretKeyBusiness = JWT_SECRET_KEY_BUSINESS || JWT_SECRET_KEY_ADMIN || 'fallback_jwt_secret_key_for_business_min_32_chars_long_for_security';
const jwtExpiresInUser = JWT_EXPIRES_IN || '24h';
const jwtExpiresInAdmin = JWT_EXPIRES_IN_ADMIN || '24h';
const jwtExpiresInBusiness = JWT_EXPIRES_IN_BUSINESS || JWT_EXPIRES_IN_ADMIN || '24h';
const port = PORT || 3000;
const serverIP = SERVER_IP || 'localhost';

// SendGrid Configuration
const sendGridApiKey = SENDGRID_API_KEY;
const sendGridEmailSendFrom = SENDGRID_EMAIL_SEND_FROM;

// Google OAuth Configuration
const googleClientId = GOOGLE_CLIENT_ID;
const googleClientSecret = GOOGLE_CLIENT_SECRET;

// Nodemailer Configuration
const nodemailerEmail = NODEMAILER_EMAIL;
const nodemailerAppPassword = NODEMAILER_APP_PASSWORD;

// Cloudinary Configuration
const cloudinaryCloudName = CLOUDINARY_CLOUD_NAME;
const cloudinaryApiKey = CLOUDINARY_API_KEY;
const cloudinaryApiSecret = CLOUDINARY_API_SECRET;

export default {
  dbUri, 
  jwtSecretKeyUser, 
  jwtSecretKeyAdmin, 
  jwtSecretKeyBusiness,
  jwtExpiresInUser, 
  jwtExpiresInAdmin, 
  jwtExpiresInBusiness,
  port, 
  serverIP,
  sendGridApiKey,
  sendGridEmailSendFrom,
  googleClientId,
  googleClientSecret,
  nodemailerEmail,
  nodemailerAppPassword,
  cloudinaryCloudName,
  cloudinaryApiKey,
  cloudinaryApiSecret
}