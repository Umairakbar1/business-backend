import Joi from 'joi';

// Comment validation schema
export const commentValidator = Joi.object({
    blogId: Joi.string()
        .required()
        .messages({
            'string.empty': 'Blog ID is required',
            'any.required': 'Blog ID is required'
        }),
    content: Joi.string()
        .trim()
        .min(1)
        .max(1000)
        .required()
        .messages({
            'string.empty': 'Comment content is required',
            'string.min': 'Comment content must be at least 1 character long',
            'string.max': 'Comment content cannot exceed 1000 characters',
            'any.required': 'Comment content is required'
        }),
    parentCommentId: Joi.string()
        .optional()
        .allow(null)
        .messages({
            'string.empty': 'Parent comment ID must be a valid string'
        })
});

// Reply validation schema
export const replyValidator = Joi.object({
    commentId: Joi.string()
        .required()
        .messages({
            'string.empty': 'Comment ID is required',
            'any.required': 'Comment ID is required'
        }),
    content: Joi.string()
        .trim()
        .min(1)
        .max(500)
        .required()
        .messages({
            'string.empty': 'Reply content is required',
            'string.min': 'Reply content must be at least 1 character long',
            'string.max': 'Reply content cannot exceed 500 characters',
            'any.required': 'Reply content is required'
        }),
    parentReplyId: Joi.string()
        .optional()
        .allow(null)
        .messages({
            'string.empty': 'Parent reply ID must be a valid string'
        })
});

// Comment update validation schema
export const commentUpdateValidator = Joi.object({
    content: Joi.string()
        .trim()
        .min(1)
        .max(1000)
        .required()
        .messages({
            'string.empty': 'Comment content is required',
            'string.min': 'Comment content must be at least 1 character long',
            'string.max': 'Comment content cannot exceed 1000 characters',
            'any.required': 'Comment content is required'
        })
});

// Reply update validation schema
export const replyUpdateValidator = Joi.object({
    content: Joi.string()
        .trim()
        .min(1)
        .max(500)
        .required()
        .messages({
            'string.empty': 'Reply content is required',
            'string.min': 'Reply content must be at least 1 character long',
            'string.max': 'Reply content cannot exceed 500 characters',
            'any.required': 'Reply content is required'
        })
});

// Password Reset Validation Functions

// Request password reset validation
export const requestPasswordResetValidation = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      })
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

// Verify password reset OTP validation
export const verifyPasswordResetOtpValidation = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      }),
    otp: Joi.string()
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        'string.empty': 'OTP is required',
        'string.pattern.base': 'OTP must be exactly 6 digits',
        'any.required': 'OTP is required'
      }),
    passwordResetToken: Joi.string()
      .required()
      .messages({
        'string.empty': 'Password reset token is required',
        'any.required': 'Password reset token is required'
      })
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

// Reset password validation
export const resetPasswordValidation = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      }),
    newPassword: Joi.string()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .required()
      .messages({
        'string.empty': 'New password is required',
        'string.pattern.base': 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character',
        'any.required': 'New password is required'
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'string.empty': 'Confirm password is required',
        'any.only': 'Passwords do not match',
        'any.required': 'Confirm password is required'
      }),
    finalPasswordResetToken: Joi.string()
      .required()
      .messages({
        'string.empty': 'Final password reset token is required',
        'any.required': 'Final password reset token is required'
      })
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
