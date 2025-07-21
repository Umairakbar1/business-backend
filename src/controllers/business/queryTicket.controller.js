import QueryTicket from '../../models/admin/queryTicket.js';
import Business from '../../models/business/business.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { uploadImage, uploadVideo } from '../../helpers/cloudinaryHelper.js';
import mongoose from 'mongoose';

// GET /business/query-tickets - Get all query tickets for business
export const getBusinessQueryTickets = async (req, res) => {
  try {
    const businessId = req.business?._id;
    const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    // Build filter object - only tickets created by this business
    const filter = { 
      createdBy: businessId,
      createdByType: 'business'
    };
    if (status) filter.status = status;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get tickets with populated business information
    const tickets = await QueryTicket.find(filter)
      .populate('businessId', 'businessName contactPerson email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await QueryTicket.countDocuments(filter);
    
    return successResponseHelper(res, {
      message: 'Business query tickets fetched successfully',
      data: {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// GET /business/query-tickets/:id - Get single query ticket details
export const getQueryTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      createdBy: businessId,
      createdByType: 'business'
    }).populate('businessId', 'businessName contactPerson email');
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    return successResponseHelper(res, {
      message: 'Query ticket fetched successfully',
      data: ticket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// POST /business/query-tickets - Create new query ticket
export const createQueryTicket = async (req, res) => {
  try {
    const businessId = req.business?._id;
    const { title, businessName, description, childIssue, linkedIssue, websiteUrl } = req.body;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    // Validate required fields
    if (!title || !businessName || !description) {
      return errorResponseHelper(res, { message: 'Title, business name, and description are required', code: '00400' });
    }
    
    // Get business details
    const business = await Business.findById(businessId);
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    // Handle file upload if present
    let attachment = null;
    if (req.file) {
      try {
        if (req.file.mimetype.startsWith('video/')) {
          // Upload video to Cloudinary
          const videoResult = await uploadVideo(req.file.buffer, 'business-app/tickets/videos');
          attachment = {
            url: videoResult.url,
            public_id: videoResult.public_id,
            originalName: req.file.originalname,
            type: 'video',
            duration: videoResult.duration,
            format: videoResult.format,
            bytes: videoResult.bytes
          };
        } else {
          // Upload image/document to Cloudinary
          const imageResult = await uploadImage(req.file.buffer, 'business-app/tickets/documents');
          attachment = {
            url: imageResult.url,
            public_id: imageResult.public_id,
            originalName: req.file.originalname,
            type: 'document',
            format: imageResult.format,
            bytes: imageResult.bytes
          };
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return errorResponseHelper(res, { 
          message: 'Failed to upload attachment. Please try again.', 
          code: '00500' 
        });
      }
    }
    
    const ticketData = {
      title,
      businessName,
      description,
      childIssue,
      linkedIssue,
      websiteUrl,
      attachment,
      createdBy: businessId,
      createdByType: 'business',
      businessId: businessId
    };
    
    const ticket = new QueryTicket(ticketData);
    await ticket.save();
    
    return successResponseHelper(res, {
      message: 'Query ticket created successfully',
      data: ticket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /business/query-tickets/:id - Update query ticket
export const updateQueryTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business?._id;
    const { title, businessName, description, childIssue, linkedIssue, websiteUrl } = req.body;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      createdBy: businessId,
      createdByType: 'business'
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    // Handle file upload if present
    if (req.file) {
      try {
        if (req.file.mimetype.startsWith('video/')) {
          // Upload video to Cloudinary
          const videoResult = await uploadVideo(req.file.buffer, 'business-app/tickets/videos');
          ticket.attachment = {
            url: videoResult.url,
            public_id: videoResult.public_id,
            originalName: req.file.originalname,
            type: 'video',
            duration: videoResult.duration,
            format: videoResult.format,
            bytes: videoResult.bytes
          };
        } else {
          // Upload image/document to Cloudinary
          const imageResult = await uploadImage(req.file.buffer, 'business-app/tickets/documents');
          ticket.attachment = {
            url: imageResult.url,
            public_id: imageResult.public_id,
            originalName: req.file.originalname,
            type: 'document',
            format: imageResult.format,
            bytes: imageResult.bytes
          };
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return errorResponseHelper(res, { 
          message: 'Failed to upload attachment. Please try again.', 
          code: '00500' 
        });
      }
    }
    
    // Update fields
    if (title) ticket.title = title;
    if (businessName) ticket.businessName = businessName;
    if (description) ticket.description = description;
    if (childIssue !== undefined) ticket.childIssue = childIssue;
    if (linkedIssue !== undefined) ticket.linkedIssue = linkedIssue;
    if (websiteUrl !== undefined) ticket.websiteUrl = websiteUrl;
    
    ticket.updatedAt = new Date();
    await ticket.save();
    
    return successResponseHelper(res, {
      message: 'Query ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /business/query-tickets/:id - Delete query ticket
export const deleteQueryTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      createdBy: businessId,
      createdByType: 'business'
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    await QueryTicket.findByIdAndDelete(id);
    
    return successResponseHelper(res, {
      message: 'Query ticket deleted successfully'
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /business/query-tickets/:id/status - Update ticket status
export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    if (!status || !['pending', 'in_progress', 'completed', 'not_completed'].includes(status)) {
      return errorResponseHelper(res, { message: 'Invalid status. Must be pending, in_progress, completed, or not_completed', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      createdBy: businessId,
      createdByType: 'business'
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    ticket.status = status;
    ticket.updatedAt = new Date();
    await ticket.save();
    
    return successResponseHelper(res, {
      message: 'Ticket status updated successfully',
      data: ticket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// POST /business/query-tickets/:id/comments - Add comment to ticket
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      createdBy: businessId,
      createdByType: 'business'
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    // Get business details for author name
    const business = await Business.findById(businessId);
    const authorName = business ? `${business.contactPerson} (${business.businessName})` : 'Business User';
    
    const comment = {
      content,
      authorId: businessId,
      authorType: 'business',
      authorName,
      createdAt: new Date()
    };
    
    ticket.comments.push(comment);
    ticket.updatedAt = new Date();
    await ticket.save();
    
    return successResponseHelper(res, {
      message: 'Comment added successfully',
      data: comment
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /business/query-tickets/:id/comments/:commentId - Edit comment
export const editComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { content } = req.body;
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket or comment ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      createdBy: businessId,
      createdByType: 'business'
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Check if comment belongs to this business
    if (comment.authorId.toString() !== businessId.toString()) {
      return errorResponseHelper(res, { message: 'You can only edit your own comments', code: '00403' });
    }
    
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    ticket.updatedAt = new Date();
    await ticket.save();
    
    return successResponseHelper(res, {
      message: 'Comment updated successfully',
      data: comment
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /business/query-tickets/:id/comments/:commentId - Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket or comment ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      createdBy: businessId,
      createdByType: 'business'
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Check if comment belongs to this business
    if (comment.authorId.toString() !== businessId.toString()) {
      return errorResponseHelper(res, { message: 'You can only delete your own comments', code: '00403' });
    }
    
    comment.remove();
    ticket.updatedAt = new Date();
    await ticket.save();
    
    return successResponseHelper(res, {
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// GET /business/query-tickets/stats - Get ticket statistics
export const getTicketStats = async (req, res) => {
  try {
    const businessId = req.business?._id;
    
    if (!businessId) {
      return errorResponseHelper(res, { message: 'Business not authenticated', code: '00401' });
    }
    
    const filter = { 
      createdBy: businessId,
      createdByType: 'business'
    };
    
    const stats = await QueryTicket.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const total = await QueryTicket.countDocuments(filter);
    
    // Convert to object format
    const statsObj = {
      total,
      pending: 0,
      in_progress: 0,
      completed: 0,
      not_completed: 0
    };
    
    stats.forEach(stat => {
      statsObj[stat._id] = stat.count;
    });
    
    return successResponseHelper(res, {
      message: 'Ticket statistics fetched successfully',
      data: statsObj
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
}; 