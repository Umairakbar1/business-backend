import Joi from "joi"
const categoryValidator = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.empty': 'Category name is required',
      'string.min': 'Category name must be at least 2 characters long',
      'string.max': 'Category name cannot exceed 50 characters',
      'any.required': 'Category name is required'
    }),
  
  description: Joi.string()
    .max(200)
    .optional()
    .trim()
    .messages({
      'string.max': 'Category description cannot exceed 200 characters'
    }),
  
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(3)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens',
      'string.min': 'Slug must be at least 3 characters long',
      'string.max': 'Slug cannot exceed 50 characters',
      'any.required': 'Slug is required'
    }),
  
  isActive: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    }),
  
  sortOrder: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Sort order must be a number',
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order cannot be negative'
    }),
  
  image: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Image must be a valid URL'
    }),
  
  metaTitle: Joi.string()
    .max(60)
    .optional()
    .trim()
    .messages({
      'string.max': 'Meta title cannot exceed 60 characters'
    }),
  
  metaDescription: Joi.string()
    .max(160)
    .optional()
    .trim()
    .messages({
      'string.max': 'Meta description cannot exceed 160 characters'
    })
});

const subCategoryValidator = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.empty': 'Sub-category name is required',
      'string.min': 'Sub-category name must be at least 2 characters long',
      'string.max': 'Sub-category name cannot exceed 50 characters',
      'any.required': 'Sub-category name is required'
    }),
  
  description: Joi.string()
    .max(200)
    .optional()
    .trim()
    .messages({
      'string.max': 'Sub-category description cannot exceed 200 characters'
    }),
  
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(3)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens',
      'string.min': 'Slug must be at least 3 characters long',
      'string.max': 'Slug cannot exceed 50 characters',
      'any.required': 'Slug is required'
    }),
  
  categoryId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Category ID is required',
      'any.required': 'Category ID is required'
    }),
  
  isActive: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    }),
  
  sortOrder: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Sort order must be a number',
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order cannot be negative'
    }),
  
  image: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Image must be a valid URL'
    }),
  
  metaTitle: Joi.string()
    .max(60)
    .optional()
    .trim()
    .messages({
      'string.max': 'Meta title cannot exceed 60 characters'
    }),
  
  metaDescription: Joi.string()
    .max(160)
    .optional()
    .trim()
    .messages({
      'string.max': 'Meta description cannot exceed 160 characters'
    })
});

// Update validators (for PATCH requests)
const categoryUpdateValidator = categoryValidator.fork(
  ['name', 'slug', 'description', 'isActive', 'sortOrder', 'image', 'metaTitle', 'metaDescription'],
  (schema) => schema.optional()
);

const subCategoryUpdateValidator = subCategoryValidator.fork(
  ['name', 'slug', 'description', 'categoryId', 'isActive', 'sortOrder', 'image', 'metaTitle', 'metaDescription'],
  (schema) => schema.optional()
);

// Blog validators
const blogValidator = Joi.object({
  key: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(3)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.pattern.base': 'Key must contain only lowercase letters, numbers, and hyphens',
      'string.min': 'Key must be at least 3 characters long',
      'string.max': 'Key cannot exceed 50 characters',
      'any.required': 'Key is required'
    }),
  
  title: Joi.string()
    .min(5)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'Blog title is required',
      'string.min': 'Blog title must be at least 5 characters long',
      'string.max': 'Blog title cannot exceed 200 characters',
      'any.required': 'Blog title is required'
    }),
  
  content: Joi.string()
    .min(50)
    .required()
    .trim()
    .messages({
      'string.empty': 'Blog content is required',
      'string.min': 'Blog content must be at least 50 characters long',
      'any.required': 'Blog content is required'
    }),
  
  excerpt: Joi.string()
    .max(300)
    .optional()
    .trim()
    .messages({
      'string.max': 'Blog excerpt cannot exceed 300 characters'
    }),
  
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(3)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens',
      'string.min': 'Slug must be at least 3 characters long',
      'string.max': 'Slug cannot exceed 100 characters',
      'any.required': 'Slug is required'
    }),
  
  author: Joi.string()
    .min(2)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.empty': 'Author name is required',
      'string.min': 'Author name must be at least 2 characters long',
      'string.max': 'Author name cannot exceed 100 characters',
      'any.required': 'Author name is required'
    }),
  
  featuredImage: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Featured image must be a valid URL'
    }),
  
  tags: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'Tags must be an array'
    }),
  
  isPublished: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'isPublished must be a boolean value'
    }),
  
  publishDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Publish date must be a valid date'
    }),
  
  metaTitle: Joi.string()
    .max(60)
    .optional()
    .trim()
    .messages({
      'string.max': 'Meta title cannot exceed 60 characters'
    }),
  
  metaDescription: Joi.string()
    .max(160)
    .optional()
    .trim()
    .messages({
      'string.max': 'Meta description cannot exceed 160 characters'
    })
});

// Query ticketing validators
const queryTicketValidator = Joi.object({
  subject: Joi.string()
    .min(5)
    .max(200)
    .required()
    .trim()
    .messages({
      'string.empty': 'Subject is required',
      'string.min': 'Subject must be at least 5 characters long',
      'string.max': 'Subject cannot exceed 200 characters',
      'any.required': 'Subject is required'
    }),
  
  description: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .trim()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 1000 characters',
      'any.required': 'Description is required'
    }),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent'
    }),
  
  category: Joi.string()
    .valid('general', 'technical', 'billing', 'feature-request', 'bug-report', 'other')
    .required()
    .messages({
      'any.only': 'Category must be one of: general, technical, billing, feature-request, bug-report, other',
      'any.required': 'Category is required'
    }),
  
  customerName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.empty': 'Customer name is required',
      'string.min': 'Customer name must be at least 2 characters long',
      'string.max': 'Customer name cannot exceed 100 characters',
      'any.required': 'Customer name is required'
    }),
  
  customerEmail: Joi.string()
    .email()
    .required()
    .trim()
    .messages({
      'string.email': 'Customer email must be a valid email address',
      'string.empty': 'Customer email is required',
      'any.required': 'Customer email is required'
    }),
  
  customerPhone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .trim()
    .messages({
      'string.pattern.base': 'Customer phone must be a valid phone number'
    }),
  
  attachments: Joi.array()
    .items(Joi.string().uri())
    .optional()
    .messages({
      'array.base': 'Attachments must be an array',
      'string.uri': 'Each attachment must be a valid URL'
    }),
  
  status: Joi.string()
    .valid('open', 'in-progress', 'resolved', 'closed')
    .default('open')
    .messages({
      'any.only': 'Status must be one of: open, in-progress, resolved, closed'
    }),
  
  assignedTo: Joi.string()
    .optional()
    .trim()
    .messages({
      'string.empty': 'Assigned to cannot be empty'
    }),
  
  dueDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Due date must be a valid date'
    })
});

// Update validators for blog and query tickets
const blogUpdateValidator = blogValidator.fork(
  ['title', 'content', 'excerpt', 'slug', 'author', 'featuredImage', 'tags', 'isPublished', 'publishDate', 'metaTitle', 'metaDescription'],
  (schema) => schema.optional()
);

const queryTicketUpdateValidator = queryTicketValidator.fork(
  ['subject', 'description', 'priority', 'category', 'customerName', 'customerEmail', 'customerPhone', 'attachments', 'status', 'assignedTo', 'dueDate'],
  (schema) => schema.optional()
);

const planValidator = Joi.object({
    title: Joi.string().required(),
    price: Joi.number().positive().required(),
    duration: Joi.string().valid("day", "week", "month", "year").required(),
    planType: Joi.string().optional(),
    permission: Joi.array().items(Joi.string()).optional(),
    status: Joi.string().valid("active", "inactive").optional(),
    currency: Joi.string().default("usd").optional(),
});

export {
  categoryValidator,
  subCategoryValidator,
  categoryUpdateValidator,
  subCategoryUpdateValidator,
  blogValidator,
  queryTicketValidator,
  blogUpdateValidator,
  queryTicketUpdateValidator,
  planValidator
};
