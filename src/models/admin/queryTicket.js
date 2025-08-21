import mongoose from "mongoose";
const { Schema, model } = mongoose;

const ReplySchema = new Schema({
  content: { type: String, required: true },
  authorId: { type: Schema.Types.ObjectId, required: true },
  authorType: { type: String, enum: ['admin', 'business'], required: true },
  authorName: { type: String, required: true },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const CommentSchema = new Schema({
  content: { type: String, required: true },
  authorId: { type: Schema.Types.ObjectId, required: true },
  authorType: { type: String, enum: ['admin', 'business'], required: true },
  authorName: { type: String, required: true },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  createdAt: { type: Date, default: Date.now },
  replies: [ReplySchema]
});

const QueryTicketSchema = new Schema({
  title: { type: String, required: true },
  businessName: { type: String, required: true },
  description: { type: String, required: true },
  
  // Optional fields
  childIssue: { type: String },
  linkedIssue: { type: String },
  websiteUrl: { type: String },
  attachment: {
    type: {
      url: String,
      public_id: String,
      originalName: String,
      type: {
        type: String,
        enum: ['document', 'video'],
      },
      // For documents
      format: String,
      bytes: Number,
      // For videos
      duration: Number
    },
  },
  
  // Creator information
  createdBy: { type: Schema.Types.ObjectId, required: true },
  createdByType: { type: String, enum: ['admin', 'business'], required: true },
  
  // Business reference (if created by business)
  businessId: { type: Schema.Types.ObjectId, ref: 'Business' },
  
  // Assignment information
  assignedTo: { 
    type: Schema.Types.ObjectId, 
    refPath: 'assignedToModel',
    default: null 
  },
  assignedToModel: {
    type: String,
    enum: ['Admin', 'Business'],
    default: null
  },
  assignedToType: {
    type: String,
    enum: ['admin', 'business'],
    default: null
  },
  assignedAt: { type: Date },
  assignedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'Admin' 
  },
  
  // Status management
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'not_completed'], 
    default: 'pending' 
  },
  
  // Comments
  comments: [CommentSchema],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for better query performance
QueryTicketSchema.index({ createdBy: 1, createdByType: 1 });
QueryTicketSchema.index({ businessId: 1 });
QueryTicketSchema.index({ status: 1 });
QueryTicketSchema.index({ assignedTo: 1 });
QueryTicketSchema.index({ createdAt: -1 });

const QueryTicket = model('QueryTicket', QueryTicketSchema);
export default QueryTicket;
  