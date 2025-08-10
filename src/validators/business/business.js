import { body } from 'express-validator';
import Joi from 'joi';

export const validateBusiness = [
  body('businessName').notEmpty().withMessage('Business name is required'),
  body('plan').isIn(['bronze', 'silver', 'gold']).withMessage('Invalid plan'),
  // Allow any additional fields (including location)
  body('*').optional(),
  // Add more validation as needed
];

export const validateBusinessStatus = [
  body('status').isIn(['active', 'inactive']).withMessage('Invalid status'),
];

export const businessJoiSchema = Joi.object({
  businessName: Joi.string().required(),
  plan: Joi.string().valid('bronze', 'silver', 'gold').required(),
  businessCategory: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  zipCode: Joi.string().optional(),
  country: Joi.string().optional(),
  location: Joi.object({
    description: Joi.string().optional(),
    lat: Joi.number().optional(),
    lng: Joi.number().optional()
  }).optional(),
  // Add more fields as needed
});

export const businessStatusJoiSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
}); 