import pkg from "jsonwebtoken";
import { GLOBAL_ENV } from "../config/globalConfig.js";
const { sign } = pkg;

const signAccessToken = (_id) => {
  const accessToken = sign({ _id }, GLOBAL_ENV.jwtSecretKey, {
    expiresIn: "7d",
  });
  return accessToken;
};


const signRefreshToken = (_id) => {
  const refreshToken = sign({ _id }, GLOBAL_ENV.refreshSecretKey, {
    expiresIn: "7d",
  });
  return refreshToken;
};

const signAccessTokenAdmin = (_id) => {
  const accessToken = sign({ _id }, GLOBAL_ENV.jwtSecretKeyAdmin, {
    expiresIn: "7d",
  });
  return accessToken;
};

const signAccessTokenBusiness = (_id) => {
  const accessToken = sign({ _id }, GLOBAL_ENV.jwtSecretKeyBusiness || GLOBAL_ENV.jwtSecretKeyAdmin, {
    expiresIn: "7d",
  });
  return accessToken;
};

const signConfirmCodeToken = (_id, code) => {
  const confirmCodeToken = sign({ _id, code }, GLOBAL_ENV.jwtSecretKey, {
    expiresIn: "5m",
  });
  return confirmCodeToken;
};

export {
  signAccessToken,
  signRefreshToken,
  signConfirmCodeToken,
  signAccessTokenAdmin,
  signAccessTokenBusiness
};
