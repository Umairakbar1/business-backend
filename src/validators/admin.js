import Joi from "joi"
const categoryValidator = Joi.object({
  title: Joi.string()
    .min(2)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.empty': 'Category title is required',
      'string.min': 'Category title must be at least 2 characters long',
      'string.max': 'Category title cannot exceed 100 characters',
      'any.required': 'Category title is required'
    }),
  
  slug: Joi.string()
    .pattern(/^[a-z0-9_]+$/)
    .min(3)
    .max(50)
    .optional()
    .trim()
    .messages({
      'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and underscores',
      'string.min': 'Slug must be at least 3 characters long',
      'string.max': 'Slug cannot exceed 50 characters'
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .trim()
    .messages({
      'string.max': 'Category description cannot exceed 500 characters'
    }),
  
  image: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Image must be a valid URL'
    }),
  
  status: Joi.string()
    .valid('active', 'inactive', 'draft')
    .default('active')
    .messages({
      'string.empty': 'Status is required',
      'any.only': 'Status must be one of: active, inactive, draft'
    }),
  
  color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF0000)'
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
    }),
  
  subcategories: Joi.alternatives().try(
    Joi.array()
      .items(Joi.object({
        title: Joi.string()
          .min(2)
          .max(100)
          .required()
          .trim()
          .messages({
            'string.empty': 'Sub-category name is required',
            'string.min': 'Sub-category name must be at least 2 characters long',
            'string.max': 'Sub-category name cannot exceed 100 characters',
            'any.required': 'Sub-category name is required'
          }),
        description: Joi.string()
          .max(300)
          .optional()
          .trim()
          .messages({
            'string.max': 'Sub-category description cannot exceed 300 characters'
          }),
        isActive: Joi.boolean()
          .default(true)
          .messages({
            'boolean.base': 'isActive must be a boolean value'
          })
      })),
    Joi.string()
      .messages({
        'string.base': 'Subcategories must be a valid JSON string or array'
      })
  ).optional()
  .messages({
    'alternatives.any': 'Subcategories must be either an array or a valid JSON string'
  }),
  
  parentCategory: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Parent category ID must be a valid MongoDB ObjectId'
    })
});

const subCategoryValidator = Joi.object({
  title: Joi.string()
    .min(2)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.empty': 'Sub-category name is required',
      'string.min': 'Sub-category name must be at least 2 characters long',
      'string.max': 'Sub-category name cannot exceed 100 characters',
      'any.required': 'Sub-category name is required'
    }),
  
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(3)
    .max(50)
    .optional()
    .trim()
    .messages({
      'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens',
      'string.min': 'Slug must be at least 3 characters long',
      'string.max': 'Slug cannot exceed 50 characters'
    }),
  
  
  description: Joi.string()
    .max(500)
    .optional()
    .trim()
    .messages({
      'string.max': 'Subcategory description cannot exceed 500 characters'
    }),
  
  categoryId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.empty': 'Category ID is required',
      'string.pattern.base': 'Category ID must be a valid MongoDB ObjectId',
      'any.required': 'Category ID is required'
    }),
  
  isActive: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
});

// Update validators (for PATCH requests)
const categoryUpdateValidator = categoryValidator.fork(
  ['title', 'slug', 'description', 'status', 'color', 'sortOrder', 'image', 'metaTitle', 'metaDescription', 'subcategories', 'parentCategory'],
  (schema) => schema.optional()
);

const subCategoryUpdateValidator = subCategoryValidator.fork(
  ['title', 'slug', 'description', 'categoryId', 'isActive'],
  (schema) => schema.optional()
);

// Blog validators
const blogValidator = Joi.object({
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
  
  description: Joi.string()
    .min(10)
    .max(500)
    .required()
    .trim()
    .messages({
      'string.empty': 'Blog description is required',
      'string.min': 'Blog description must be at least 10 characters long',
      'string.max': 'Blog description cannot exceed 500 characters',
      'any.required': 'Blog description is required'
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
  
  category: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.empty': 'Category is required',
      'string.pattern.base': 'Category must be a valid MongoDB ObjectId',
      'any.required': 'Category is required'
    }),
  
  subCategory: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Subcategory must be a valid MongoDB ObjectId'
    }),
  
  authorName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .trim()
    .messages({
      'string.min': 'Author name must be at least 2 characters long',
      'string.max': 'Author name cannot exceed 100 characters'
    }),
  
  authorEmail: Joi.string()
    .email()
    .optional()
    .trim()
    .messages({
      'string.email': 'Author email must be a valid email address'
    }),
  
  authorModel: Joi.string()
    .valid('Admin', 'User')
    .optional()
    .messages({
      'any.only': 'Author model must be either Admin or User'
    }),
  
  status: Joi.string()
    .valid('draft', 'published', 'archived', 'unpublish')
    .default('draft')
    .messages({
      'any.only': 'Status must be one of: draft, published, archived, unpublish'
    }),
  
  enableComments: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'Enable comments must be a boolean value'
    }),
  
  tags: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'Tags must be an array'
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
    }),

  coverImage: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Cover image must be a valid URL'
    }),

    author: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/) // ObjectId
    .required()
    .messages({
      'string.empty': 'Author is required',
      'string.pattern.base': 'Author must be a valid MongoDB ObjectId',
      'any.required': 'Author is required'
    }), 
    authorName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .trim()
    .messages({
      'string.min': 'Author name must be at least 2 characters long',
      'string.max': 'Author name cannot exceed 100 characters'
    }),
    authorEmail: Joi.string()
    .email()
    .optional()
    .trim()
    .messages({
      'string.email': 'Author email must be a valid email address'
    }),
      metaKeywords: Joi.array()
    .items(Joi.string().trim())
    .optional()
    .messages({
      'array.base': 'Meta keywords must be an array'
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
  ['title', 'description', 'content', 'category', 'subCategory', 'authorName', 'authorEmail', 'authorModel', 'status', 'enableComments', 'tags', 'metaTitle', 'metaDescription', 'metaKeywords', 'coverImage', 'author'   ],
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

// Metadata validators
const metadataValidator = Joi.object({
  pageName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.empty': 'Page name is required',
      'string.min': 'Page name must be at least 2 characters long',
      'string.max': 'Page name cannot exceed 100 characters',
      'any.required': 'Page name is required'
    }),
  
  pageUrl: Joi.string()
    .uri()
    .required()
    .trim()
    .messages({
      'string.uri': 'Page URL must be a valid URL',
      'string.empty': 'Page URL is required',
      'any.required': 'Page URL is required'
    }),
  
  title: Joi.string()
    .min(10)
    .max(60)
    .required()
    .trim()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 10 characters long',
      'string.max': 'Title cannot exceed 60 characters',
      'any.required': 'Title is required'
    }),
  
  description: Joi.string()
    .min(20)
    .max(160)
    .required()
    .trim()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 20 characters long',
      'string.max': 'Description cannot exceed 160 characters',
      'any.required': 'Description is required'
    }),
  
  focusKeywords: Joi.array()
    .items(Joi.string().min(1).max(50).trim())
    .min(1)
    .max(10)
    .optional()
    .messages({
      'array.min': 'At least one focus keyword is required',
      'array.max': 'Cannot exceed 10 focus keywords',
      'string.min': 'Focus keyword must be at least 1 character long',
      'string.max': 'Focus keyword cannot exceed 50 characters'
    }),
  
  ogTitle: Joi.string()
    .max(60)
    .optional()
    .trim()
    .messages({
      'string.max': 'Open Graph title cannot exceed 60 characters'
    }),
  
  ogDescription: Joi.string()
    .max(160)
    .optional()
    .trim()
    .messages({
      'string.max': 'Open Graph description cannot exceed 160 characters'
    }),
  
  ogImage: Joi.string()
    .uri()
    .optional()
    .trim()
    .messages({
      'string.uri': 'Open Graph image must be a valid URL'
    }),
  
  canonicalUrl: Joi.string()
    .uri()
    .optional()
    .trim()
    .messages({
      'string.uri': 'Canonical URL must be a valid URL'
    }),
  
  status: Joi.string()
    .valid('active', 'inactive')
    .default('active')
    .messages({
      'any.only': 'Status must be either active or inactive'
    })
});

const metadataUpdateValidator = metadataValidator.fork(
  ['pageName', 'pageUrl', 'title', 'description', 'focusKeywords', 'ogTitle', 'ogDescription', 'ogImage', 'canonicalUrl', 'status'],
  (schema) => schema.optional()
);

// Payment Plan validators
const paymentPlanValidator = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.empty': 'Plan name is required',
      'string.min': 'Plan name must be at least 2 characters long',
      'string.max': 'Plan name cannot exceed 100 characters',
      'any.required': 'Plan name is required'
    }),

  description: Joi.string()
    .min(10)
    .max(500)
    .required()
    .trim()
    .messages({
      'string.empty': 'Plan description is required',
      'string.min': 'Plan description must be at least 10 characters long',
      'string.max': 'Plan description cannot exceed 500 characters',
      'any.required': 'Plan description is required'
    }),

  planType: Joi.string()
    .valid('business', 'boost')
    .required()
    .messages({
      'any.only': 'Plan type must be either business or boost',
      'any.required': 'Plan type is required'
    }),

  price: Joi.number()
    .positive()
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be greater than 0',
      'any.required': 'Price is required'
    }),

  currency: Joi.string()
    .valid('USD', 'EUR', 'GBP')
    .default('USD')
    .messages({
      'any.only': 'Currency must be USD, EUR, or GBP'
    }),



  features: Joi.array()
    .items(Joi.object({
      name: Joi.string()
        .required()
        .trim()
        .messages({
          'string.empty': 'Feature name is required',
          'any.required': 'Feature name is required'
        }),
      description: Joi.string()
        .required()
        .trim()
        .messages({
          'string.empty': 'Feature description is required',
          'any.required': 'Feature description is required'
        }),
      included: Joi.boolean()
        .default(true)
        .messages({
          'boolean.base': 'Feature included must be a boolean'
        }),
      limit: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
          'number.base': 'Feature limit must be a number',
          'number.integer': 'Feature limit must be an integer',
          'number.min': 'Feature limit cannot be negative'
        })
    }))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one feature is required',
      'any.required': 'Features are required'
    }),

  isPopular: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'isPopular must be a boolean'
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

  maxBusinesses: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .optional()
    .messages({
      'number.base': 'Max businesses must be a number',
      'number.integer': 'Max businesses must be an integer',
      'number.min': 'Max businesses must be at least 1'
    }),

  maxReviews: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .optional()
    .messages({
      'number.base': 'Max reviews must be a number',
      'number.integer': 'Max reviews must be an integer',
      'number.min': 'Max reviews must be at least 1'
    }),

  maxBoostPerDay: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.base': 'Max boost per day must be a number',
      'number.integer': 'Max boost per day must be an integer',
      'number.min': 'Max boost per day cannot be negative'
    })
});

// Subscription validators
const subscriptionValidator = Joi.object({
  businessId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.empty': 'Business ID is required',
      'string.pattern.base': 'Business ID must be a valid MongoDB ObjectId',
      'any.required': 'Business ID is required'
    }),

  paymentPlanId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.empty': 'Payment plan ID is required',
      'string.pattern.base': 'Payment plan ID must be a valid MongoDB ObjectId',
      'any.required': 'Payment plan ID is required'
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
    })
});

// Update validators
const paymentPlanUpdateValidator = paymentPlanValidator.fork(
  ['name', 'description', 'planType', 'price', 'currency', 'features', 'isPopular', 'sortOrder', 'maxBusinesses', 'maxReviews', 'maxBoostPerDay'],
  (schema) => schema.optional()
);

const subscriptionUpdateValidator = subscriptionValidator.fork(
  ['businessId', 'paymentPlanId', 'customerEmail', 'customerName'],
  (schema) => schema.optional()
);

export {
  categoryValidator,
  subCategoryValidator,
  categoryUpdateValidator,
  subCategoryUpdateValidator,
  blogValidator,
  queryTicketValidator,
  blogUpdateValidator,
  queryTicketUpdateValidator,
  planValidator,
  metadataValidator,
  metadataUpdateValidator,
  paymentPlanValidator,
  subscriptionValidator,
  paymentPlanUpdateValidator,
  subscriptionUpdateValidator
};
