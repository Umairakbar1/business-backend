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

const dbUri = DB_URI;
const jwtSecretKeyUser = JWT_SECRET_KEY;
const jwtSecretKeyAdmin = JWT_SECRET_KEY_ADMIN;
const jwtSecretKeyBusiness = JWT_SECRET_KEY_BUSINESS || JWT_SECRET_KEY_ADMIN;
const jwtExpiresInUser = JWT_EXPIRES_IN;
const jwtExpiresInAdmin = JWT_EXPIRES_IN_ADMIN;
const jwtExpiresInBusiness = JWT_EXPIRES_IN_BUSINESS || JWT_EXPIRES_IN_ADMIN;
const port = PORT;
const serverIP = SERVER_IP;

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