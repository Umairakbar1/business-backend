import { config } from "dotenv";

config();

const {
  DB_URI,
  JWT_SECRET_KEY,
  JWT_SECRET_KEY_ADMIN,
  JWT_EXPIRES_IN,
  JWT_EXPIRES_IN_ADMIN,
  PORT,
  SERVER_IP,
  SENDGRID_API_KEY,
  SENDGRID_EMAIL_SEND_FROM,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
} = process.env;

const dbUri = DB_URI;
const jwtSecretKeyUser = JWT_SECRET_KEY;
const jwtSecretKeyAdmin = JWT_SECRET_KEY_ADMIN;
const jwtExpiresInUser = JWT_EXPIRES_IN;
const jwtExpiresInAdmin = JWT_EXPIRES_IN_ADMIN;
const port = PORT;
const serverIP = SERVER_IP;

// SendGrid Configuration
const sendGridApiKey = SENDGRID_API_KEY;
const sendGridEmailSendFrom = SENDGRID_EMAIL_SEND_FROM;

// Google OAuth Configuration
const googleClientId = GOOGLE_CLIENT_ID;
const googleClientSecret = GOOGLE_CLIENT_SECRET;

export default {
  dbUri, 
  jwtSecretKeyUser, 
  jwtSecretKeyAdmin, 
  jwtExpiresInUser, 
  jwtExpiresInAdmin, 
  port, 
  serverIP,
  sendGridApiKey,
  sendGridEmailSendFrom,
  googleClientId,
  googleClientSecret
}