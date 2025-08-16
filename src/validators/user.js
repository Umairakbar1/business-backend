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
