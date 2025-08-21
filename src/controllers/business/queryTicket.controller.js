import QueryTicket from '../../models/admin/queryTicket.js';
import Business from '../../models/business/business.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { uploadImage, uploadVideo } from '../../helpers/cloudinaryHelper.js';
import mongoose from 'mongoose';

// GET /business/query-tickets - Get all query tickets for business
export const getBusinessQueryTickets = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner?._id;
    const { page = 1, limit = 10, status, businessId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    // Build filter object - business can see tickets created by them OR assigned to them
    const filter = { 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
    };
    
    // Filter by specific business if provided
    if (businessId) {
      filter.businessId = businessId;
    }
    
    if (status) filter.status = status;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get tickets with populated business information
    const tickets = await QueryTicket.find(filter)
      .populate('businessId', 'businessName contactPerson email')
      .populate({
        path: 'assignedTo',
        select: 'firstName lastName email businessName contactPerson email'
      })
      .populate('assignedBy', 'firstName lastName email')
      .populate({
        path: 'comments',
        populate: {
          path: 'replies'
        }
      })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await QueryTicket.countDocuments(filter);
    
    return successResponseHelper(res, {
      message: 'Business query tickets fetched successfully',
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
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
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
    }).populate('businessId', 'businessName contactPerson email')
      .populate({
        path: 'assignedTo',
        select: 'firstName lastName email businessName contactPerson email'
      })
      .populate('assignedBy', 'firstName lastName email')
      .populate({
        path: 'comments',
        populate: {
          path: 'replies'
        }
      });
    
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
    const businessOwnerId = req.businessOwner?._id;
    const { title, businessId, description, childIssue, linkedIssue, websiteUrl, assignedToType } = req.body;
    
    // Debug logging
    console.log('Received request body:', {
      title,
      businessId,
      description,
      assignedToType,
      businessOwnerId: businessOwnerId?.toString()
    });
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    // Validate required fields
    if (!title || !businessId || !description) {
      return errorResponseHelper(res, { message: 'Title, business ID, and description are required', code: '00400' });
    }
    
    // Get business details and verify ownership
    const business = await Business.findOne({ 
      _id: businessId, 
      businessOwner: businessOwnerId 
    });
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found or access denied', code: '00404' });
    }
    
    // Handle file upload if present
    let attachment = null;
    if (req.file) {
      try {
        console.log('File received:', req.file.originalname, req.file.mimetype);
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
        console.log('Attachment created:', attachment);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return errorResponseHelper(res, { 
          message: 'Failed to upload attachment. Please try again.', 
          code: '00500' 
        });
      }
    } else {
      console.log('No file uploaded - attachment will be null');
    }
    
    // Handle assignment logic automatically based on assignedToType
    let finalAssignedTo = null;
    let finalAssignedToType = null;
    let finalAssignedToModel = null;
    
    console.log('Assignment logic - assignedToType:', assignedToType);
    
    if (assignedToType) {
      if (assignedToType === '1') {
        // Assign to business (use the businessId from the ticket)
        finalAssignedTo = businessId;
        finalAssignedToType = 'business';
        finalAssignedToModel = 'Business';
        console.log('Auto-assigning to business:', finalAssignedTo?.toString());
      } else if (assignedToType === '2') {
        // Assign to me (current business owner)
        finalAssignedTo = businessOwnerId;
        finalAssignedToType = 'business';
        finalAssignedToModel = 'Business';
        console.log('Auto-assigning to me (business):', finalAssignedTo?.toString());
      } else {
        return errorResponseHelper(res, { 
          message: 'Invalid assignedToType. Must be 1 (assign to business) or 2 (assign to me)', 
          code: '00400' 
        });
      }
    }
    
    // Ensure assignedTo is never a string - only ObjectId or null
    if (finalAssignedTo && typeof finalAssignedTo === 'string') {
      console.log('ERROR: finalAssignedTo is a string:', finalAssignedTo);
      return errorResponseHelper(res, { 
        message: 'Invalid assignment value. assignedTo must be a valid ID or null.', 
        code: '00400' 
      });
    }
    
    console.log('Final assignment values:', {
      finalAssignedTo: finalAssignedTo?.toString(),
      finalAssignedToType,
      finalAssignedToModel
    });
    
    const ticketData = {
      title,
      businessName: business.businessName,
      description,
      childIssue,
      linkedIssue,
      websiteUrl,
      createdBy: businessOwnerId,
      createdByType: 'business',
      businessId: businessId,
      assignedTo: finalAssignedTo,
      assignedToType: finalAssignedToType,
      assignedToModel: finalAssignedToModel
    };
    
    console.log('Ticket data before save:', {
      ...ticketData,
      assignedTo: ticketData.assignedTo?.toString(),
      createdBy: ticketData.createdBy?.toString(),
      businessId: ticketData.businessId?.toString()
    });
    
    // Only add attachment if file was uploaded and processed successfully
    if (attachment && attachment.type) {
      ticketData.attachment = attachment;
      console.log('Adding attachment to ticket data:', attachment);
    } else {
      console.log('No valid attachment to add - attachment:', attachment);
    }
    
    console.log('Final ticket data:', JSON.stringify(ticketData, null, 2));
    console.log('Attachment field in ticket data:', ticketData.attachment);
    
    // Final validation - ensure all ObjectId fields are valid
    if (ticketData.assignedTo && !mongoose.Types.ObjectId.isValid(ticketData.assignedTo)) {
      console.log('ERROR: assignedTo is not a valid ObjectId:', ticketData.assignedTo);
      return errorResponseHelper(res, { 
        message: 'Invalid assignedTo value. Must be a valid ObjectId or null.', 
        code: '00400' 
      });
    }
    
    const ticket = new QueryTicket(ticketData);
    await ticket.save();
    
    // Populate comments and replies for response
    await ticket.populate({
      path: 'comments',
      populate: {
        path: 'replies'
      }
    });
    
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
    const businessOwnerId = req.businessOwner?._id;
    const { status, title, businessId, description, childIssue, linkedIssue, websiteUrl, assignedToType, attachment, comments } = req.body;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
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
    
    // Handle assignment logic automatically based on assignedToType
    if (assignedToType) {
      if (assignedToType === '1') {
        // Assign to business (use the businessId from the ticket or request)
        const targetBusinessId = businessId || ticket.businessId;
        ticket.assignedTo = targetBusinessId;
        ticket.assignedToType = 'business';
        ticket.assignedToModel = 'Business';
        console.log('Auto-assigning to business:', targetBusinessId?.toString());
      } else if (assignedToType === '2') {
        // Assign to me (current business owner)
        ticket.assignedTo = businessOwnerId;
        ticket.assignedToType = 'business';
        ticket.assignedToModel = 'Business';
        console.log('Auto-assigning to me (business):', businessOwnerId?.toString());
      } else {
        return errorResponseHelper(res, { 
          message: 'Invalid assignedToType. Must be 1 (assign to business) or 2 (assign to me)', 
          code: '00400' 
        });
      }
    }
    
    // Ensure assignedTo is never a string - only ObjectId or null
    if (ticket.assignedTo && typeof ticket.assignedTo === 'string') {
      return errorResponseHelper(res, { 
        message: 'Invalid assignment value. assignedTo must be a valid ID or null.', 
        code: '00400' 
      });
    }
    
    // Update fields
    if (title) ticket.title = title;
    if (businessId) {
      // Verify business ownership if changing business
      const business = await Business.findOne({ 
        _id: businessId, 
        businessOwner: businessOwnerId 
      });
      if (!business) {
        return errorResponseHelper(res, { message: 'Business not found or access denied', code: '00404' });
      }
      ticket.businessId = businessId;
      ticket.businessName = business.businessName;
    }
    if (description) ticket.description = description;
    if (childIssue !== undefined) ticket.childIssue = childIssue;
    if (linkedIssue !== undefined) ticket.linkedIssue = linkedIssue;
    if (websiteUrl !== undefined) ticket.websiteUrl = websiteUrl;
    if (attachment !== undefined) ticket.attachment = attachment;
    if (comments !== undefined) ticket.comments = comments;
    ticket.updatedAt = new Date();
    await ticket.save();
    
    // Populate comments and replies for response
    await ticket.populate({
      path: 'comments',
      populate: {
        path: 'replies'
      }
    });
    
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
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      createdBy: businessOwnerId,
      createdByType: 'business'
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found or access denied. Only the creator can delete tickets.', code: '00404' });
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
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    if (!status || !['pending', 'in_progress', 'completed', 'not_completed'].includes(status)) {
      return errorResponseHelper(res, { message: 'Invalid status. Must be pending, in_progress, completed, or not_completed', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    // Check permissions for status update
    const isCreator = ticket.createdBy.toString() === businessOwnerId.toString();
    const isAssignee = ticket.assignedTo && ticket.assignedTo.toString() === businessOwnerId.toString();
    
    // Status update permissions:
    // 1. If assigned to me (isAssignee), I can change status to in_progress and completed
    // 2. If I created the ticket (isCreator), I can change status to any value
    // 3. If assigned to someone else, only creator can change status
    
    if (isAssignee) {
      // Assignee can change status to in_progress and completed
      if (['in_progress', 'completed'].includes(status)) {
        ticket.status = status;
      } else {
        return errorResponseHelper(res, { 
          message: 'As an assignee, you can only change status to in_progress or completed', 
          code: '00403' 
        });
      }
    } else if (isCreator) {
      // Creator can change status to any value
      ticket.status = status;
    } else {
      // Neither creator nor assignee - no permission to change status
      return errorResponseHelper(res, { 
        message: 'You can only change status if you created the ticket or if it is assigned to you', 
        code: '00403' 
      });
    }
    
    ticket.updatedAt = new Date();
    await ticket.save();
    
    // Populate comments and replies for response
    await ticket.populate({
      path: 'comments',
      populate: {
        path: 'replies'
      }
    });
    
    return successResponseHelper(res, {
      message: 'Ticket status updated successfully',
      data: ticket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /business/query-tickets/:id/close - Close query ticket (only creator can close)
export const closeQueryTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      createdBy: businessOwnerId,
      createdByType: 'business'
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found or access denied. Only the creator can close tickets.', code: '00404' });
    }
    
    // Close the ticket by setting status to completed
    ticket.status = 'completed';
    ticket.updatedAt = new Date();
    await ticket.save();
    
    // Populate comments and replies for response
    await ticket.populate({
      path: 'comments',
      populate: {
        path: 'replies'
      }
    });
    
    return successResponseHelper(res, {
      message: 'Query ticket closed successfully',
      data: ticket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// GET /business/query-tickets/stats - Get ticket statistics
export const getTicketStats = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    const filter = { 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
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
    
    // Get stats by creator type
    const creatorStats = await QueryTicket.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$createdByType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get stats by assignment
    const assignmentStats = await QueryTicket.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            assigned: { $cond: [{ $eq: ['$assignedTo', businessOwnerId] }, 'assigned_to_me', 'created_by_me'] }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Convert to object format
    const statsObj = {
      total,
      pending: 0,
      in_progress: 0,
      completed: 0,
      not_completed: 0,
      byCreator: {
        admin: 0,
        business: 0
      },
      byAssignment: {
        assigned_to_me: 0,
        created_by_me: 0
      }
    };
    
    stats.forEach(stat => {
      statsObj[stat._id] = stat.count;
    });
    
    creatorStats.forEach(stat => {
      statsObj.byCreator[stat._id] = stat.count;
    });
    
    assignmentStats.forEach(stat => {
      statsObj.byAssignment[stat._id.assigned] = stat.count;
    });
    
    return successResponseHelper(res, {
      message: 'Ticket statistics fetched successfully',
      data: statsObj
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
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    // Get business details for author name
    const business = await Business.findById(ticket.businessId);
    const authorName = business ? `${business.contactPerson} (${business.businessName})` : 'Business User';
    
    const comment = {
      content,
      authorId: businessOwnerId,
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
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket or comment ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Check if comment belongs to this business owner
    if (comment.authorId.toString() !== businessOwnerId.toString()) {
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
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket or comment ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Check if comment belongs to this business owner
    if (comment.authorId.toString() !== businessOwnerId.toString()) {
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

// POST /business/query-tickets/:id/comments/:commentId/replies - Add reply to comment
export const addReply = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket or comment ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Get business details for author name
    const business = await Business.findById(ticket.businessId);
    const authorName = business ? `${business.contactPerson} (${business.businessName})` : 'Business User';
    
    const reply = {
      content,
      authorId: businessOwnerId,
      authorType: 'business',
      authorName,
      createdAt: new Date()
    };
    
    comment.replies.push(reply);
    ticket.updatedAt = new Date();
    await ticket.save();
    
    return successResponseHelper(res, {
      message: 'Reply added successfully',
      data: reply
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /business/query-tickets/:id/comments/:commentId/replies/:replyId - Edit reply
export const editReply = async (req, res) => {
  try {
    const { id, commentId, replyId } = req.params;
    const { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket, comment, or reply ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const reply = comment.replies.id(replyId);
    if (!reply) {
      return errorResponseHelper(res, { message: 'Reply not found', code: '00404' });
    }
    
    // Check if reply belongs to this business owner
    if (reply.authorId.toString() !== businessOwnerId.toString()) {
      return errorResponseHelper(res, { message: 'You can only edit your own replies', code: '00403' });
    }
    
    reply.content = content;
    reply.isEdited = true;
    reply.editedAt = new Date();
    ticket.updatedAt = new Date();
    await ticket.save();
    
    return successResponseHelper(res, {
      message: 'Reply updated successfully',
      data: reply
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /business/query-tickets/:id/comments/:commentId/replies/:replyId - Delete reply
export const deleteReply = async (req, res) => {
  try {
    const { id, commentId, replyId } = req.params;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket, comment, or reply ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      $or: [
        { createdBy: businessOwnerId, createdByType: 'business' },
        { assignedTo: businessOwnerId, assignedToType: 'business' }
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const reply = comment.replies.id(replyId);
    if (!reply) {
      return errorResponseHelper(res, { message: 'Reply not found', code: '00404' });
    }
    
    // Check if reply belongs to this business owner
    if (reply.authorId.toString() !== businessOwnerId.toString()) {
      return errorResponseHelper(res, { message: 'You can only delete your own replies', code: '00403' });
    }
    
    reply.remove();
    ticket.updatedAt = new Date();
    await ticket.save();
    
    return successResponseHelper(res, {
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};
