import QueryTicket from '../../models/admin/queryTicket.js';
import Business from '../../models/business/business.js';
import Admin from '../../models/admin/admin.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { uploadImage, uploadVideo, deleteMultipleFiles } from '../../helpers/cloudinaryHelper.js';
import mongoose from 'mongoose';

// GET /business/query-tickets - Get all query tickets for business
export const getBusinessQueryTickets = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner?._id;
    const { page = 1, limit = 10, status, businessId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    // Debug logging to understand the issue
    console.log('Business owner ID from request:', businessOwnerId?.toString());
    console.log('Business owner ID type:', typeof businessOwnerId);
    
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
    
    // Debug logging for filter
    console.log('Filter being applied:', JSON.stringify(filter, null, 2));
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get tickets with populated business information
    const tickets = await QueryTicket.find(filter)
      .populate('businessId', 'businessName contactPerson email businessOwner')
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
    
    // Debug logging to see what tickets were found
    console.log(`Found ${tickets.length} tickets out of ${total} total`);
    tickets.forEach((ticket, index) => {
      console.log(`Ticket ${index + 1}:`, {
        id: ticket._id?.toString(),
        title: ticket.title,
        createdBy: ticket.createdBy?.toString(),
        createdByType: ticket.createdByType,
        assignedTo: ticket.assignedTo?.toString(),
        assignedToType: ticket.assignedToType,
        businessId: ticket.businessId?.toString()
      });
    });
    
    // Debug: Check all tickets in database to see what's there
    const allTickets = await QueryTicket.find({}).select('_id title createdBy createdByType assignedTo assignedToType businessId');
    console.log('All tickets in database:', allTickets.map(t => ({
      id: t._id?.toString(),
      title: t.title,
      createdBy: t.createdBy?.toString(),
      createdByType: t.createdByType,
      assignedTo: t.assignedTo?.toString(),
      assignedToType: t.assignedToType,
      businessId: t.businessId?.toString()
    })));
    
    // Process tickets to have consistent author structure
    const processedTickets = tickets.map(ticket => {
      const processedTicket = ticket.toObject();
      processedTicket.comments = processedTicket.comments.map(comment => ({
        ...comment,
        author: {
          _id: comment.authorId,
          name: comment.authorName,
          type: comment.authorType
        }
      }));
      
      processedTicket.comments.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replies = comment.replies.map(reply => ({
            ...reply,
            author: {
              _id: reply.authorId,
              name: reply.authorName,
              type: reply.authorType
            }
          }));
        }
      });
      
      return processedTicket;
    });
    
    return successResponseHelper(res, {
      message: 'Business query tickets fetched successfully',
      data: processedTickets,
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
    }).populate('businessId', 'businessName contactPerson email businessOwner')
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
    
    // Process ticket to have consistent author structure
    const processedTicket = ticket.toObject();
    processedTicket.comments = processedTicket.comments.map(comment => ({
      ...comment,
      author: {
        _id: comment.authorId,
        name: comment.authorName,
        type: comment.authorType
      }
    }));
    
    processedTicket.comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = comment.replies.map(reply => ({
          ...reply,
          author: {
            _id: reply.authorId,
            name: reply.authorName,
            type: reply.authorType
          }
        }));
      }
    });
    
    return successResponseHelper(res, {
      message: 'Query ticket fetched successfully',
      data: processedTicket
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
    }).populate('businessOwner');
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found or access denied', code: '00404' });
    }
    
    // Handle file upload if present
    let attachments = [];
    if (req.files && req.files.length > 0) {
      try {
        console.log(`${req.files.length} files received`);
        
        for (const file of req.files) {
          console.log('Processing file:', file.originalname, file.mimetype);
          
          let attachment = null;
          if (file.mimetype.startsWith('video/')) {
            // Upload video to Cloudinary
            const videoResult = await uploadVideo(file.buffer, 'business-app/tickets/videos');
            attachment = {
              url: videoResult.url,
              public_id: videoResult.public_id,
              originalName: file.originalname,
              type: 'video',
              duration: videoResult.duration,
              format: videoResult.format,
              bytes: videoResult.bytes
            };
          } else {
            // Upload image/document to Cloudinary
            const imageResult = await uploadImage(file.buffer, 'business-app/tickets/documents');
            attachment = {
              url: imageResult.url,
              public_id: imageResult.public_id,
              originalName: file.originalname,
              type: 'image',
              format: imageResult.format,
              bytes: imageResult.bytes
            };
          }
          
          if (attachment) {
            attachments.push(attachment);
            console.log('Attachment created:', attachment);
          }
        }
        
        console.log(`Total attachments created: ${attachments.length}`);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return errorResponseHelper(res, { 
          message: 'Failed to upload attachment. Please try again.', 
          code: '00500' 
        });
      }
    } else if (req.file) {
      // Handle single file for backward compatibility
      try {
        console.log('Single file received:', req.file.originalname, req.file.mimetype);
        
        let attachment = null;
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
            type: 'image',
            format: imageResult.format,
            bytes: imageResult.bytes
          };
        }
        
        if (attachment) {
          attachments.push(attachment);
          console.log('Single attachment created:', attachment);
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return errorResponseHelper(res, { 
          message: 'Failed to upload attachment. Please try again.', 
          code: '00500' 
        });
      }
    } else {
      console.log('No files uploaded - attachments will be empty array');
    }
    
    // Handle assignment logic automatically based on assignedToType
    let finalAssignedTo = null;
    let finalAssignedToType = null;
    let finalAssignedToModel = null;
    
    console.log('Assignment logic - assignedToType:', assignedToType);
    
        if (assignedToType) {
      if (assignedToType === '1') {
        // Assign to admin - fetch the admin ID from database
        try {
          const admin = await Admin.findOne();
          if (!admin) {
            return errorResponseHelper(res, { 
              message: 'No admin found in the system. Please contact support.', 
              code: '00404' 
            });
          }
          finalAssignedTo = admin._id;
          finalAssignedToType = 'admin';
          finalAssignedToModel = 'Admin';
          console.log('Auto-assigning to admin:', finalAssignedTo?.toString());
        } catch (adminError) {
          console.error('Error fetching admin:', adminError);
          return errorResponseHelper(res, { 
            message: 'Failed to assign ticket to admin. Please try again.', 
            code: '00500' 
          });
        }
      } else if (assignedToType === '2') {
        // Assign to me (current business owner) - use businessOwner from business
        finalAssignedTo = business.businessOwner;
        finalAssignedToType = 'business';
        finalAssignedToModel = 'Business';
        console.log('Auto-assigning to business owner:', finalAssignedTo?.toString());
        console.log('Business owner ID type:', typeof business.businessOwner);
        console.log('Business owner ID value:', business.businessOwner);
        console.log('Business object:', {
          _id: business._id?.toString(),
          businessName: business.businessName,
          businessOwner: business.businessOwner?.toString()
        });
      } else {
        return errorResponseHelper(res, { 
          message: 'Invalid assignedToType. Must be 1 (assign to admin) or 2 (assign to me)', 
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
      createdBy: business.businessOwner,
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
      businessId: ticketData.businessId?.toString(),
      businessOwnerId: business.businessOwner?.toString()
    });
    
    // Only add attachments if files were uploaded and processed successfully
    if (attachments.length > 0) {
      ticketData.attachment = attachments;
      console.log('Adding attachments to ticket data:', attachments);
    } else {
      console.log('No valid attachments to add - attachments:', attachments);
    }
    
    console.log('Final ticket data:', JSON.stringify(ticketData, null, 2));
    console.log('Attachments field in ticket data:', ticketData.attachment);
    console.log('Assignment details:', {
      assignedTo: ticketData.assignedTo?.toString(),
      assignedToType: ticketData.assignedToType,
      assignedToModel: ticketData.assignedToModel,
      createdBy: ticketData.createdBy?.toString(),
      createdByType: ticketData.createdByType
    });
    
    // Final validation - ensure all ObjectId fields are valid
    if (ticketData.assignedTo && !mongoose.Types.ObjectId.isValid(ticketData.assignedTo)) {
      console.log('ERROR: assignedTo is not a valid ObjectId:', ticketData.assignedTo);
      return errorResponseHelper(res, { 
        message: 'Invalid assignedTo value. Must be a valid ObjectId or null.', 
        code: '00400' 
      });
    }
    
    if (ticketData.createdBy && !mongoose.Types.ObjectId.isValid(ticketData.createdBy)) {
      console.log('ERROR: createdBy is not a valid ObjectId:', ticketData.createdBy);
      return errorResponseHelper(res, { 
        message: 'Invalid createdBy value. Must be a valid ObjectId.', 
        code: '00400' 
      });
    }
    
    const ticket = new QueryTicket(ticketData);
    await ticket.save();
    
    // Debug logging after save
    console.log('Ticket saved successfully. Database values:', {
      _id: ticket._id?.toString(),
      assignedTo: ticket.assignedTo?.toString(),
      assignedToType: ticket.assignedToType,
      assignedToModel: ticket.assignedToModel,
      createdBy: ticket.createdBy?.toString(),
      createdByType: ticket.createdByType,
      businessId: ticket.businessId?.toString()
    });
    
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
// Attachment handling:
// - If removeAttachmentIds array is provided, those attachments are removed from Cloudinary and ticket
// - If new files are uploaded (req.files or req.file), they are added to existing attachments
// - If keepExistingAttachment is true and no new files, existing attachments are preserved
// - If no changes requested, existing attachments remain unchanged
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
    
    // Handle attachment updates based on frontend input
    const { removeAttachmentIds, keepExistingAttachment } = req.body;
    let finalAttachments = [...(ticket.attachment || [])]; // Start with existing attachments
    
    // Step 1: Handle specific attachment removal by public IDs
    if (removeAttachmentIds && Array.isArray(removeAttachmentIds) && removeAttachmentIds.length > 0) {
      console.log('Removing attachments with public IDs:', removeAttachmentIds);
      
      // Find attachments to remove
      const attachmentsToRemove = finalAttachments.filter(att => 
        removeAttachmentIds.includes(att.public_id)
      );
      
      // Delete from Cloudinary
      const publicIdsToDelete = attachmentsToRemove.map(att => att.public_id).filter(Boolean);
      if (publicIdsToDelete.length > 0) {
        try {
          await deleteMultipleFiles(publicIdsToDelete);
          console.log('Attachments deleted from Cloudinary:', publicIdsToDelete);
        } catch (deleteError) {
          console.error('Failed to delete attachments from Cloudinary:', deleteError);
          // Continue with the update even if deletion fails
        }
      }
      
      // Remove from local array
      finalAttachments = finalAttachments.filter(att => 
        !removeAttachmentIds.includes(att.public_id)
      );
      
      console.log(`Removed ${attachmentsToRemove.length} attachments. Remaining: ${finalAttachments.length}`);
    }
    
    // Step 2: Handle new file uploads
    if (req.files && req.files.length > 0) {
      try {
        console.log(`${req.files.length} new files received for update`);
        
        // Upload new files
        const newAttachments = [];
        for (const file of req.files) {
          let attachment = null;
          if (file.mimetype.startsWith('video/')) {
            // Upload video to Cloudinary
            const videoResult = await uploadVideo(file.buffer, 'business-app/tickets/videos');
            attachment = {
              url: videoResult.url,
              public_id: videoResult.public_id,
              originalName: file.originalname,
              type: 'video',
              duration: videoResult.duration,
              format: videoResult.format,
              bytes: videoResult.bytes
            };
          } else {
            // Upload image/document to Cloudinary
            const imageResult = await uploadImage(file.buffer, 'business-app/tickets/documents');
            attachment = {
              url: imageResult.url,
              public_id: imageResult.public_id,
              originalName: file.originalname,
              type: 'image',
              format: imageResult.format,
              bytes: imageResult.bytes
            };
          }
          
          if (attachment) {
            newAttachments.push(attachment);
            console.log('New attachment created:', attachment);
          }
        }
        
        // Add new attachments to existing ones
        finalAttachments = [...finalAttachments, ...newAttachments];
        console.log(`Total attachments after adding new ones: ${finalAttachments.length}`);
        
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return errorResponseHelper(res, { 
          message: 'Failed to upload attachment. Please try again.', 
          code: '00500' 
        });
      }
    } else if (req.file) {
      // Handle single file for backward compatibility
      try {
        console.log('Single new file received for update:', req.file.originalname, req.file.mimetype);
        
        let attachment = null;
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
            type: 'image',
            format: imageResult.format,
            bytes: imageResult.bytes
          };
        }
        
        if (attachment) {
          // Add new attachment to existing ones
          finalAttachments.push(attachment);
          console.log('Single attachment added. Total attachments:', finalAttachments.length);
        }
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return errorResponseHelper(res, { 
          message: 'Failed to upload attachment. Please try again.', 
          code: '00500' 
        });
      }
    }
    
    // Step 3: Update ticket attachments
    // If keepExistingAttachment is true and no new files were uploaded, preserve existing
    if (keepExistingAttachment === true && !req.files && !req.file) {
      console.log('Keeping existing attachments unchanged');
      // finalAttachments already contains existing attachments, no change needed
    } else {
      // Update with the final attachment array
      ticket.attachment = finalAttachments;
      console.log(`Final attachment count: ${finalAttachments.length}`);
    }
    
    // Handle assignment logic automatically based on assignedToType
    if (assignedToType) {
      if (assignedToType === '1') {
        // Assign to admin - fetch the admin ID from database
        try {
          const admin = await Admin.findOne();
          if (!admin) {
            return errorResponseHelper(res, { 
              message: 'No admin found in the system. Please contact support.', 
              code: '00404' 
            });
          }
          ticket.assignedTo = admin._id;
          ticket.assignedToType = 'admin';
          ticket.assignedToModel = 'Admin';
          console.log('Auto-assigning to admin:', ticket.assignedTo?.toString());
        } catch (adminError) {
          console.error('Error fetching admin:', adminError);
          return errorResponseHelper(res, { 
            message: 'Failed to assign ticket to admin. Please try again.', 
            code: '00500' 
          });
        }
      } else if (assignedToType === '2') {
        // Assign to me (current business owner) - use businessOwner from business
        const business = await Business.findById(ticket.businessId).populate('businessOwner');
        if (!business) {
          return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
        }
        ticket.assignedTo = business.businessOwner;
        ticket.assignedToType = 'business';
        ticket.assignedToModel = 'Business';
        console.log('Auto-assigning to business owner:', business.businessOwner?.toString());
        console.log('Business owner ID type:', typeof business.businessOwner);
        console.log('Business owner ID value:', business.businessOwner);
        console.log('Business object:', {
          _id: business._id?.toString(),
          businessName: business.businessName,
          businessOwner: business.businessOwner?.toString()
        });
      } else {
        return errorResponseHelper(res, { 
          message: 'Invalid assignedToType. Must be 1 (assign to admin) or 2 (assign to me)', 
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
    // Note: attachment field is now handled above in the new attachment logic
    // The attachment field from request body is ignored to prevent validation errors
    if (comments !== undefined) ticket.comments = comments;
    ticket.updatedAt = new Date();
    await ticket.save();
    
    // Debug logging after update
    console.log('Ticket updated successfully. Database values:', {
      _id: ticket._id?.toString(),
      assignedTo: ticket.assignedTo?.toString(),
      assignedToType: ticket.assignedToType,
      assignedToModel: ticket.assignedToModel,
      createdBy: ticket.createdBy?.toString(),
      createdByType: ticket.createdByType,
      businessId: ticket.businessId?.toString()
    });
    
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
    let { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    // Debug logging to understand the issue
    console.log('Request body:', req.body);
    console.log('Content from body:', content);
    console.log('Content type:', typeof content);
    console.log('Content value:', content);
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    // Ensure content is a string
    if (typeof content !== 'string') {
      console.log('Content is not a string, attempting to extract string value');
      
      // Handle different possible content formats
      let extractedContent = null;
      
      if (content && typeof content === 'object') {
        // Try different possible property names
        if (content.content) {
          extractedContent = content.content;
        } else if (content.text) {
          extractedContent = content.text;
        } else if (content.message) {
          extractedContent = content.message;
        } else if (content.value) {
          extractedContent = content.value;
        }
        
        console.log('Extracted content from object:', extractedContent);
        
        if (extractedContent && typeof extractedContent === 'string') {
          content = extractedContent;
        } else {
          console.log('Could not extract valid string content from object');
          return errorResponseHelper(res, { 
            message: 'Comment content must be a string. Received: ' + JSON.stringify(content), 
            code: '00400' 
          });
        }
      } else {
        console.log('Content is not an object, cannot extract string value');
        return errorResponseHelper(res, { 
          message: 'Comment content must be a string. Received: ' + JSON.stringify(content), 
          code: '00400' 
        });
      }
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
    let authorName = 'Business User';
    
    if (business) {
      if (business.contactPerson && business.businessName) {
        authorName = `${business.contactPerson} (${business.businessName})`;
      } else if (business.businessName) {
        authorName = business.businessName;
      } else if (business.contactPerson) {
        authorName = business.contactPerson;
      }
    }
    
    const comment = {
      content,
      authorId: businessOwnerId,
      authorType: 'business',
      authorName,
      businessOwner: businessOwnerId, // Store businessOwner instead of businessId
      createdAt: new Date()
    };
    
    console.log('Comment object to be added:', comment);
    console.log('Comment content type:', typeof comment.content);
    console.log('Comment content value:', comment.content);
    
    ticket.comments.push(comment);
    ticket.updatedAt = new Date();
    await ticket.save();
    
    // Populate and return the complete ticket object with processed author information
    await ticket.populate('businessId', 'businessName contactPerson email businessOwner');
    await ticket.populate('createdBy', 'firstName lastName email');
    await ticket.populate({
      path: 'assignedTo',
      select: 'firstName lastName email businessName contactPerson email'
    });
    await ticket.populate('assignedBy', 'firstName lastName email');
    
    // Process comments and replies to have consistent author structure
    const processedTicket = ticket.toObject();
    processedTicket.comments = processedTicket.comments.map(comment => ({
      ...comment,
      author: {
        _id: comment.authorId,
        name: comment.authorName,
        type: comment.authorType
      }
    }));
    
    processedTicket.comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = comment.replies.map(reply => ({
          ...reply,
          author: {
            _id: reply.authorId,
            name: reply.authorName,
            type: reply.authorType
          }
        }));
      }
    });
    
    return successResponseHelper(res, {
      message: 'Comment added successfully',
      data: processedTicket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /business/query-tickets/:id/comments/:commentId - Edit comment
export const editComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    let { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    // Debug logging to understand the issue
    console.log('Request body for edit comment:', req.body);
    console.log('Content from body for edit comment:', content);
    console.log('Content type for edit comment:', typeof content);
    console.log('Content value for edit comment:', content);
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    // Ensure content is a string
    if (typeof content !== 'string') {
      console.log('Edit comment content is not a string, attempting to extract string value');
      
      // Handle different possible content formats
      let extractedContent = null;
      
      if (content && typeof content === 'object') {
        // Try different possible property names
        if (content.content) {
          extractedContent = content.content;
        } else if (content.text) {
          extractedContent = content.text;
        } else if (content.message) {
          extractedContent = content.message;
        } else if (content.value) {
          extractedContent = content.value;
        }
        
        console.log('Extracted edit comment content from object:', extractedContent);
        
        if (extractedContent && typeof extractedContent === 'string') {
          content = extractedContent;
        } else {
          console.log('Could not extract valid string content from object');
          return errorResponseHelper(res, { 
            message: 'Comment content must be a string. Received: ' + JSON.stringify(content), 
            code: '00400' 
          });
        }
      } else {
        console.log('Edit comment content is not an object, cannot extract string value');
        return errorResponseHelper(res, { 
          message: 'Comment content must be a string. Received: ' + JSON.stringify(content), 
          code: '00400' 
        });
      }
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
    
    // Populate and return the complete ticket object with processed author information
    await ticket.populate('businessId', 'businessName contactPerson email businessOwner');
    await ticket.populate('createdBy', 'firstName lastName email');
    await ticket.populate({
      path: 'assignedTo',
      select: 'firstName lastName email businessName contactPerson email'
    });
    await ticket.populate('assignedBy', 'firstName lastName email');
    
    // Process comments and replies to have consistent author structure
    const processedTicket = ticket.toObject();
    processedTicket.comments = processedTicket.comments.map(comment => ({
      ...comment,
      author: {
        _id: comment.authorId,
        name: comment.authorName,
        type: comment.authorType
      }
    }));
    
    processedTicket.comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = comment.replies.map(reply => ({
          ...reply,
          author: {
            _id: reply.authorId,
            name: reply.authorName,
            type: reply.authorType
          }
        }));
      }
    });
    
    return successResponseHelper(res, {
      message: 'Comment updated successfully',
      data: processedTicket
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
    
    // Remove comment using array filter approach (modern Mongoose method)
    ticket.comments = ticket.comments.filter(c => c._id.toString() !== commentId);
    ticket.updatedAt = new Date();
    await ticket.save();
    
    // Populate and return the complete ticket object with processed author information
    await ticket.populate('businessId', 'businessName contactPerson email businessOwner');
    await ticket.populate('createdBy', 'firstName lastName email');
    await ticket.populate({
      path: 'assignedTo',
      select: 'firstName lastName email businessName contactPerson email'
    });
    await ticket.populate('assignedBy', 'firstName lastName email');
    
    // Process comments and replies to have consistent author structure
    const processedTicket = ticket.toObject();
    processedTicket.comments = processedTicket.comments.map(comment => ({
      ...comment,
      author: {
        _id: comment.authorId,
        name: comment.authorName,
        type: comment.authorType
      }
    }));
    
    processedTicket.comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = comment.replies.map(reply => ({
          ...reply,
          author: {
            _id: reply.authorId,
            name: reply.authorName,
            type: reply.authorType
          }
        }));
      }
    });
    
    return successResponseHelper(res, {
      message: 'Comment deleted successfully',
      data: processedTicket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// POST /business/query-tickets/comments/:commentId/replies - Add reply to comment
export const addReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    let { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    // Debug logging to understand the issue
    console.log('Request body for reply:', req.body);
    console.log('Content from body for reply:', content);
    console.log('Content type for reply:', typeof content);
    console.log('Content value for reply:', content);
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    // Ensure content is a string
    if (typeof content !== 'string') {
      console.log('Reply content is not a string, attempting to extract string value');
      
      // Handle different possible content formats
      let extractedContent = null;
      
      if (content && typeof content === 'object') {
        // Try different possible property names
        if (content.content) {
          extractedContent = content.content;
        } else if (content.text) {
          extractedContent = content.text;
        } else if (content.message) {
          extractedContent = content.message;
        } else if (content.value) {
          extractedContent = content.value;
        }
        
        console.log('Extracted reply content from object:', extractedContent);
        
        if (extractedContent && typeof extractedContent === 'string') {
          content = extractedContent;
        } else {
          console.log('Could not extract valid string content from object');
          return errorResponseHelper(res, { 
            message: 'Reply content must be a string. Received: ' + JSON.stringify(content), 
            code: '00400' 
          });
        }
      } else {
        console.log('Reply content is not an object, cannot extract string value');
        return errorResponseHelper(res, { 
          message: 'Reply content must be a string. Received: ' + JSON.stringify(content), 
          code: '00400' 
        });
      }
    }
    
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid comment ID', code: '00400' });
    }
    
    // Find the comment and its parent ticket
    const ticket = await QueryTicket.findOne({
      'comments._id': commentId,
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
    let authorName = 'Business User';
    
    if (business) {
      if (business.contactPerson && business.businessName) {
        authorName = `${business.contactPerson} (${business.businessName})`;
      } else if (business.businessName) {
        authorName = business.businessName;
      } else if (business.contactPerson) {
        authorName = business.contactPerson;
      }
    }
    
    const reply = {
      content,
      authorId: businessOwnerId,
      authorType: 'business',
      authorName,
      businessOwner: businessOwnerId, // Store businessOwner instead of businessId
      createdAt: new Date()
    };
    
    console.log('Reply object to be added:', reply);
    console.log('Reply content type:', typeof reply.content);
    console.log('Reply content value:', reply.content);
    
    comment.replies.push(reply);
    ticket.updatedAt = new Date();
    await ticket.save();
    
    // Populate and return the complete ticket object with processed author information
    await ticket.populate('businessId', 'businessName contactPerson email businessOwner');
    await ticket.populate('createdBy', 'firstName lastName email');
    await ticket.populate({
      path: 'assignedTo',
      select: 'firstName lastName email businessName contactPerson email'
    });
    await ticket.populate('assignedBy', 'firstName lastName email');
    
    // Process comments and replies to have consistent author structure
    const processedTicket = ticket.toObject();
    processedTicket.comments = processedTicket.comments.map(comment => ({
      ...comment,
      author: {
        _id: comment.authorId,
        name: comment.authorName,
        type: comment.authorType
      }
    }));
    
    processedTicket.comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = comment.replies.map(reply => ({
          ...reply,
          author: {
            _id: reply.authorId,
            name: reply.authorName,
            type: reply.authorType
          }
        }));
      }
    });
    
    return successResponseHelper(res, {
      message: 'Reply added successfully',
      data: processedTicket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /business/query-tickets/comments/:commentId/replies/:replyId - Edit reply
export const editReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    let { content } = req.body;
    const businessOwnerId = req.businessOwner?._id;
    
    // Debug logging to understand the issue
    console.log('Request body for edit reply:', req.body);
    console.log('Content from body for edit reply:', content);
    console.log('Content type for edit reply:', typeof content);
    console.log('Content value for edit reply:', content);
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    // Ensure content is a string
    if (typeof content !== 'string') {
      console.log('Edit reply content is not a string, attempting to extract string value');
      
      // Handle different possible content formats
      let extractedContent = null;
      
      if (content && typeof content === 'object') {
        // Try different possible property names
        if (content.content) {
          extractedContent = content.content;
        } else if (content.text) {
          extractedContent = content.text;
        } else if (content.message) {
          extractedContent = content.message;
        } else if (content.value) {
          extractedContent = content.value;
        }
        
        console.log('Extracted edit reply content from object:', extractedContent);
        
        if (extractedContent && typeof extractedContent === 'string') {
          content = extractedContent;
        } else {
          console.log('Could not extract valid string content from object');
          return errorResponseHelper(res, { 
            message: 'Reply content must be a string. Received: ' + JSON.stringify(content), 
            code: '00400' 
          });
        }
      } else {
        console.log('Edit reply content is not an object, cannot extract string value');
        return errorResponseHelper(res, { 
          message: 'Reply content must be a string. Received: ' + JSON.stringify(content), 
          code: '00400' 
        });
      }
    }
    
    if (!mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return errorResponseHelper(res, { message: 'Invalid comment or reply ID', code: '00400' });
    }
    
    // Find the comment and its parent ticket
    const ticket = await QueryTicket.findOne({
      'comments._id': commentId,
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
    
    // Populate and return the complete ticket object with processed author information
    await ticket.populate('businessId', 'businessName contactPerson email businessOwner');
    await ticket.populate('createdBy', 'firstName lastName email');
    await ticket.populate({
      path: 'assignedTo',
      select: 'firstName lastName email businessName contactPerson email'
    });
    await ticket.populate('assignedBy', 'firstName lastName email');
    
    // Process comments and replies to have consistent author structure
    const processedTicket = ticket.toObject();
    processedTicket.comments = processedTicket.comments.map(comment => ({
      ...comment,
      author: {
        _id: comment.authorId,
        name: comment.authorName,
        type: comment.authorType
      }
    }));
    
    processedTicket.comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = comment.replies.map(reply => ({
          ...reply,
          author: {
            _id: reply.authorId,
            name: reply.authorName,
            type: reply.authorType
          }
        }));
      }
    });
    
    return successResponseHelper(res, {
      message: 'Reply updated successfully',
      data: processedTicket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// DELETE /business/query-tickets/comments/:commentId/replies/:replyId - Delete reply
export const deleteReply = async (req, res) => {
  try {
    const { commentId, replyId } = req.params;
    const businessOwnerId = req.businessOwner?._id;
    
    if (!businessOwnerId) {
      return errorResponseHelper(res, { message: 'Business owner not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return errorResponseHelper(res, { message: 'Invalid comment or reply ID', code: '00400' });
    }
    
    // Find the comment and its parent ticket
    const ticket = await QueryTicket.findOne({
      'comments._id': commentId,
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
    
    // Remove reply using array filter approach (modern Mongoose method)
    comment.replies = comment.replies.filter(r => r._id.toString() !== replyId);
    ticket.updatedAt = new Date();
    await ticket.save();
    
    // Populate and return the complete ticket object with processed author information
    await ticket.populate('businessId', 'businessName contactPerson email businessOwner');
    await ticket.populate('createdBy', 'firstName lastName email');
    await ticket.populate({
      path: 'assignedTo',
      select: 'firstName lastName email businessName contactPerson email'
    });
    await ticket.populate('assignedBy', 'firstName lastName email');
    
    // Process comments and replies to have consistent author structure
    const processedTicket = ticket.toObject();
    processedTicket.comments = processedTicket.comments.map(comment => ({
      ...comment,
      author: {
        _id: comment.authorId,
        name: comment.authorName,
        type: comment.authorType
      }
    }));
    
    processedTicket.comments.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = comment.replies.map(reply => ({
          ...reply,
          author: {
            _id: reply.authorId,
            name: reply.authorName,
            type: reply.authorType
          }
        }));
      }
    });
    
    return successResponseHelper(res, {
      message: 'Reply deleted successfully',
      data: processedTicket
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};
