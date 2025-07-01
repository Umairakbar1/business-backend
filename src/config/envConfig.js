import { config } from "dotenv";

config();

const {
  DB_URI,
  JWT_SECRET_KEY,
  JWT_SECRET_KEY_ADMIN,
  JWT_EXPIRES_IN,
  JWT_EXPIRES_IN_ADMIN,
  JWT_REFRESH_TOKEN_SECRET_KEY,
  JWT_REFRESH_TOKEN_EXPIRES_IN,
  JWT_REFRESH_TOKEN_EXPIRES_IN_ADMIN,
  JWT_REFRESH_TOKEN_SECRET_KEY_ADMIN,
  JWT_REFRESH_TOKEN_SECRET_KEY_USER,
  JWT_REFRESH_TOKEN_EXPIRES_IN_USER,
  }= process.env;

const dbUri = DB_URI;
const jwtSecretKeyUser = JWT_SECRET_KEY;
const jwtSecretKeyAdmin = JWT_SECRET_KEY_ADMIN;
const jwtExpiresInUser = JWT_EXPIRES_IN;
const jwtExpiresInAdmin = JWT_EXPIRES_IN_ADMIN;
const jwtRefreshTokenSecretKey = JWT_REFRESH_TOKEN_SECRET_KEY;
const jwtRefreshTokenExpiresIn = JWT_REFRESH_TOKEN_EXPIRES_IN;
const jwtRefreshTokenExpiresInAdmin = JWT_REFRESH_TOKEN_EXPIRES_IN_ADMIN;
const jwtRefreshTokenSecretKeyAdmin = JWT_REFRESH_TOKEN_SECRET_KEY_ADMIN;
const jwtRefreshTokenSecretKeyUser = JWT_REFRESH_TOKEN_SECRET_KEY_USER;
const jwtRefreshTokenExpiresInUser = JWT_REFRESH_TOKEN_EXPIRES_IN_USER;

export default {dbUri, jwtSecretKeyUser, jwtSecretKeyAdmin, jwtExpiresInUser, jwtExpiresInAdmin, jwtRefreshTokenSecretKey, jwtRefreshTokenExpiresIn, jwtRefreshTokenExpiresInAdmin, jwtRefreshTokenSecretKeyAdmin, jwtRefreshTokenSecretKeyUser, jwtRefreshTokenExpiresInUser  }