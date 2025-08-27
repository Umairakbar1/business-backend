const { body } = require('express-validator');

const validateSubscription = [
  body('businessId')
    .isMongoId()
    .withMessage('Valid business ID is required'),

  body('paymentPlanId')
    .isMongoId()
    .withMessage('Valid payment plan ID is required'),

  body('customerEmail')
    .isEmail()
    .withMessage('Valid customer email is required'),

  body('customerName')
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters')
];

module.exports = {
  validateSubscription
};
