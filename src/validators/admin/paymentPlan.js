import { body } from 'express-validator';

const validatePaymentPlan = [
  body('name')
    .notEmpty()
    .withMessage('Plan name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Plan name must be between 2 and 100 characters'),

  body('description')
    .notEmpty()
    .withMessage('Plan description is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Plan description must be between 10 and 500 characters'),

  body('planType')
    .isIn(['business', 'boost'])
    .withMessage('Plan type must be either business or boost'),

  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price must be greater than or equal to 0'),

  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP'])
    .withMessage('Currency must be USD, EUR, or GBP'),

  // billingCycle removed - not using recurring billing anymore

  body('features')
    .isArray({ min: 1 })
    .withMessage('At least one feature is required'),

  body('features.*.name')
    .notEmpty()
    .withMessage('Feature name is required'),

  body('features.*.description')
    .notEmpty()
    .withMessage('Feature description is required'),

  body('features.*.included')
    .optional()
    .isBoolean()
    .withMessage('Feature included must be a boolean'),

  body('features.*.limit')
    .optional()
    .isNumeric()
    .withMessage('Feature limit must be a number'),

  body('isPopular')
    .optional()
    .isBoolean()
    .withMessage('isPopular must be a boolean'),

  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),

  body('maxBusinesses')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max businesses must be a positive integer'),

  body('maxReviews')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max reviews must be a positive integer'),

  body('maxBoostPerDay')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max boost per day must be a non-negative integer')
];

export { validatePaymentPlan };
