import mongoose from "mongoose";
const { Schema, model } = mongoose;

const CommentSchema = new Schema({
  content: { type: String, required: true },
  authorId: { type: Schema.Types.ObjectId, required: true },
  authorType: { type: String, enum: ['admin', 'business'], required: true },
  authorName: { type: String, required: true },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  createdAt: { type: Date, default: Date.now }
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
    url: String,
    key: String,
    originalName: String
  },
  
  // Creator information
  createdBy: { type: Schema.Types.ObjectId, required: true },
  createdByType: { type: String, enum: ['admin', 'business'], required: true },
  
  // Business reference (if created by business)
  businessId: { type: Schema.Types.ObjectId, ref: 'Business' },
  
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
QueryTicketSchema.index({ createdAt: -1 });

const QueryTicket = model('QueryTicket', QueryTicketSchema);
export default QueryTicket;
  