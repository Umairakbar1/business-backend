export default {
  uncaughtException: {
    message: "Uncaught Exception Error.",
    code: "00001",
  },
  unhandledRejection: {
    message: "Unhandled Rejection Error.",
    code: "00002",
  },
  serverStatus: {
    message: "Project is successfully working.",
    code: "00003",
  },
  serverError: {
    message: "internal server error.",
    code: "00004",
  },
  clientError: {
    message: "client side error.",
    code: "00005",
  },
  invalidRequest: {
    message: "Invalid request.",
    code: "00006",
  },
  validationError: {
    message: "Validation error.",
    code: "00007",
  },
  rateLimitError: {
    message: "Too many request.",
    code: "00008",
  },
  accessDenied: {
    message: "Access denied. You do not have permission to access.",
    code: "00009",
  },
  jwtRequired: {
    message: "JWT Required, Please provide jwt token to access resources.",
    code: "00010",
  },
  jwtExpired: {
    message: "JWT Expired, your jwt is expired.",
    code: "00011",
  },
  invalidJWT: {
    message: "Invalid JWT, provide valid jwt.",
    code: "00012",
  },
  emailNotFound: {
    message: "Account with this email address was not found.",
    code: "00013",
  },
  duplicateEmail: {
    message: "An account with this email already exist.",
    code: "00014",
  },
  accountNotActivated: {
    message: "Your Account is not activated.",
    code: "00015",
  },
  accountNotVerified: {
    message: "Your Account is not verified.",
    code: "00016",
  },
  invalidCredentials: {
    message: "You have entered an invalid email or password.",
    code: "00017",
  },
  passwordMustDifferent: {
    message:
      "Your new password should not be same with the old one, please try a different password.",
    code: "00018",
  },
  passwordMustMatch: {
    message:
      "Your old password does not match with the password you entered, please enter the correct password.",
    code: "00019",
  },
  dataNotFound: {
    message: "No Data found against this request.",
    code: "00020",
  },
  invalidCode: {
    message: "invalid Code, Please provide valid code.",
    code: "00021",
  },
  numberExceedFromLimit: {
    message: "Number limit Exceed, Please provide number within limit.",
    code: "00021",
  },
  invalidData: {
    message: "invalid Data, data your are accessing is invalid.",
    code: "00022",
  },
  sessionExpired: {
    message: "Your session is expired, please log in again.",
    code: "00023",
  },
  duplicateData: {
    message: "Data already already exist.",
    code: "00024",
  },
  phoneNotFound: {
    message: "Account with this phone number was not found.",
    code: "00025",
  },
  duplicatePhone: {
    message: "An account with this phone number already exist.",
    code: "00026",
  },
  otpSent: {
    message: "OTP sent successfully",
    code: "00027",
  },
  invalidOtp: {
    message: "invalid OTP",
    code: "00028",
  },
  phoneBlocked: {
    message:
      "you can't login with this phone number because is blocked by Admin",
    code: "00029",
  },

  //frequently used.
  createSuccess: {
    message: "Created Successfully.",
    code: "00100",
  },
  readSuccess: {
    message: "Fetched Successfully.",
    code: "00101",
  },
  updateSuccess: {
    message: "Updated Successfully.",
    code: "00102",
  },
  deletedSuccess: {
    message: "Deleted Successfully.",
    code: "00103",
  },
  otpValidityTimeout: {
    message: "OTP validity timeout",
    code: "00104",
  },
};
