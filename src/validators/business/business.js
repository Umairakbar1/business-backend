import { body } from 'express-validator';
import Joi from 'joi';

export const validateBusiness = [
  body('businessName').notEmpty().withMessage('Business name is required'),
  // Allow any additional fields without strict validation
  body('*').optional(),
];

export const validateBusinessStatus = [
  body('status').isIn(['active', 'inactive']).withMessage('Invalid status'),
];

export const businessJoiSchema = Joi.object({
  businessName: Joi.string().required(),
  plan: Joi.string().valid('bronze', 'silver', 'gold').optional(),
  businessCategory: Joi.string().optional(),
  website: Joi.string().uri().optional(),
  address: Joi.string().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  zipCode: Joi.string().optional(),
  country: Joi.string().optional(),
  metaTitle: Joi.string().optional(),
  metaDescription: Joi.string().optional(),
  focusKeywords: Joi.array().items(Joi.string()).optional(),
  about: Joi.string().optional(),
  serviceOffer: Joi.string().optional(),
  category: Joi.string().optional(),
  subcategories: Joi.array().items(Joi.string()).optional(),
  phoneNumber: Joi.string().optional(),
  email: Joi.string().email().optional(),
  facebook: Joi.string().optional(),
  linkedIn: Joi.string().optional(),
  twitter: Joi.string().optional(),
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
  businessUrls: Joi.array().items(Joi.string().uri()).max(5).optional(),
}).unknown(true); // Allow unknown fields

export const businessStatusJoiSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
}); 