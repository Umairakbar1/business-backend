import Joi from 'joi';

// Business Owner Signup Validation
export const businessOwnerSignupValidation = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().required().trim().min(2).max(50),
    lastName: Joi.string().required().trim().min(2).max(50),
    email: Joi.string().email().required().lowercase().trim(),
    phoneNumber: Joi.string().optional().allow(null, '').trim()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      code: '00400'
    });
  }
  next();
};

// Resend OTP Validation
export const resendOtpValidation = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().required().trim().min(2).max(50),
    lastName: Joi.string().required().trim().min(2).max(50),
    email: Joi.string().email().required().lowercase().trim(),
    phoneNumber: Joi.string().optional().allow(null, '').trim()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      code: '00400'
    });
  }
  next();
};

// Verify OTP and Create Business Owner Validation
export const verifyOtpCreateBusinessOwnerValidation = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    otp: Joi.string().required().length(6),
    otpVerificationToken: Joi.string().required(),
    firstName: Joi.string().required().trim().min(2).max(50),
    lastName: Joi.string().required().trim().min(2).max(50),
    phoneNumber: Joi.string().optional().allow(null, '').trim()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      code: '00400'
    });
  }
  next();
};

// Set Business Owner Credentials Validation
export const setBusinessOwnerCredentialsValidation = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().required().trim().min(3).max(30).alphanum(),
    password: Joi.string().required().min(6).max(100)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      code: '00400'
    });
  }
  next();
};

// Business Owner Login Validation
export const businessOwnerLoginValidation = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      code: '00400'
    });
  }
  next();
};

// Register Business Validation
export const registerBusinessValidation = (req, res, next) => {
  const schema = Joi.object({
    businessName: Joi.string().required().trim().min(2).max(100),
    category: Joi.string().required().trim(),
    subcategories: Joi.array().items(Joi.string()).optional(),
    phoneNumber: Joi.string().required().trim(),
    email: Joi.string().email().required().lowercase().trim(),
    facebook: Joi.string().uri().optional().allow(null, ''),
    linkedIn: Joi.string().uri().optional().allow(null, ''),
    website: Joi.string().uri().optional().allow(null, ''),
    twitter: Joi.string().uri().optional().allow(null, ''),
    metaTitle: Joi.string().optional().allow(null, '').max(60),
    metaDescription: Joi.string().optional().allow(null, '').max(160),
    focusKeywords: Joi.array().items(Joi.string()).optional(),
    about: Joi.string().optional().allow(null, ''),
    serviceOffer: Joi.string().optional().allow(null, ''),
    address: Joi.string().optional().allow(null, ''),
    city: Joi.string().optional().allow(null, ''),
    state: Joi.string().optional().allow(null, ''),
    zipCode: Joi.string().optional().allow(null, ''),
    country: Joi.string().optional().allow(null, ''),
    images: Joi.array().items(Joi.object({
      url: Joi.string().uri().required(),
      public_id: Joi.string().required(),
      caption: Joi.string().optional()
    })).optional(),
    plan: Joi.object({
      name: Joi.string().valid('bronze', 'silver', 'gold').optional(),
      price: Joi.number().optional(),
      features: Joi.array().items(Joi.string()).optional()
    }).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      code: '00400'
    });
  }
  next();
}; 