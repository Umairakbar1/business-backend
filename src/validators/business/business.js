import { body } from 'express-validator';
import Joi from 'joi';

export const validateBusiness = [
  body('businessName').notEmpty().withMessage('Business name is required'),
  body('plan').isIn(['bronze', 'silver', 'gold']).withMessage('Invalid plan'),
  body('removeImages').optional().isArray().withMessage('removeImages must be an array'),
  body('removeLogo').optional().isBoolean().withMessage('removeLogo must be a boolean'),
  // Allow any additional fields (including location, logo, images, media)
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
  logo: Joi.object({
    url: Joi.string().uri().optional(),
    public_id: Joi.string().optional(),
    thumbnail: Joi.object({
      url: Joi.string().uri().optional(),
      public_id: Joi.string().optional()
    }).optional()
  }).optional(),
  images: Joi.array().items(Joi.object({
    url: Joi.string().uri().required(),
    public_id: Joi.string().required(),
    thumbnail: Joi.object({
      url: Joi.string().uri().required(),
      public_id: Joi.string().required()
    }).required(),
    caption: Joi.string().optional(),
    uploadedAt: Joi.date().optional()
  })).optional(),
  media: Joi.array().items(Joi.object({
    url: Joi.string().uri().required(),
    public_id: Joi.string().required(),
    thumbnail: Joi.object({
      url: Joi.string().uri().required(),
      public_id: Joi.string().required()
    }).required(),
    caption: Joi.string().optional(),
    uploadedAt: Joi.date().optional()
  })).optional(),
  removeImages: Joi.array().items(Joi.string()).optional(),
  removeLogo: Joi.boolean().optional(),
  // Add more fields as needed
});

export const businessStatusJoiSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
}); 