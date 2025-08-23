import QueryTicket from '../../models/admin/queryTicket.js';
import Admin from '../../models/admin/admin.js';
import Business from '../../models/business/business.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { uploadImage, uploadVideo, deleteMultipleFiles } from '../../helpers/cloudinaryHelper.js';
import mongoose from 'mongoose';

// GET /admin/query-tickets - Get all query tickets (admin can see only assigned or created by them)
export const getAllQueryTickets = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const { page = 1, limit = 10, status, createdByType, assignedTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    // Build filter object - admin can see tickets assigned to them, created by them, OR assigned to any admin
    const filter = {
      $or: [
        { assignedTo: adminId, assignedToType: 'admin' },
        { createdBy: adminId, createdByType: 'admin' },
        { assignedToType: 'admin' } // Show all tickets assigned to any admin
      ]
    };
    
    if (status) filter.status = status;
    if (createdByType) filter.createdByType = createdByType;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get tickets with populated information
    const tickets = await QueryTicket.find(filter)
      .populate('businessId', 'businessId contactPerson email businessOwner')
      .populate('createdBy', 'firstName lastName email')
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
      message: 'Query tickets fetched successfully',
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

// GET /admin/query-tickets/:id - Get single query ticket details
export const getQueryTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({
      _id: id,
      $or: [
        { assignedTo: adminId, assignedToType: 'admin' },
        { createdBy: adminId, createdByType: 'admin' },
        { assignedToType: 'admin' } // Show all tickets assigned to any admin
      ]
    })
      .populate('businessId', 'businessId contactPerson email businessOwner')
      .populate('createdBy', 'firstName lastName email')
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

// POST /admin/query-tickets - Create new query ticket
export const createQueryTicket = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const { title, businessId, description, childIssue, linkedIssue, websiteUrl, assignedToType } = req.body;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    // Validate required fields
    if (!title || !businessId || !description) {
      return errorResponseHelper(res, { message: 'Title, business ID, and description are required', code: '00400' });
    }
    
    // Get admin details
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponseHelper(res, { message: 'Admin not found', code: '00404' });
    }
    
    // Get business details and verify it exists
    const business = await Business.findById(businessId).populate('businessOwner');
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
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
            const videoResult = await uploadVideo(file.buffer, 'admin-app/tickets/videos');
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
            const imageResult = await uploadImage(file.buffer, 'admin-app/tickets/documents');
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
          const videoResult = await uploadVideo(req.file.buffer, 'admin-app/tickets/videos');
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
          const imageResult = await uploadImage(req.file.buffer, 'admin-app/tickets/documents');
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
    
    if (assignedToType) {
      if (assignedToType === '1') {
        // Assign to business owner (use the businessOwner from the business)
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
      } else if (assignedToType === '2') {
        // Assign to me (current admin)
        finalAssignedTo = adminId;
        finalAssignedToType = 'admin';
        finalAssignedToModel = 'Admin';
        console.log('Auto-assigning to admin (me):', finalAssignedTo?.toString());
      } else {
        return errorResponseHelper(res, { 
          message: 'Invalid assignedToType. Must be 1 (assign to business) or 2 (assign to me)', 
          code: '00400' 
        });
      }
    }
    
    const ticketData = {
      title,
      businessId: businessId,
      businessName: business.businessName, // Get business name from business object
      description,
      childIssue,
      linkedIssue,
      websiteUrl,
      createdBy: adminId,
      createdByType: 'admin',
      assignedTo: finalAssignedTo,
      assignedToType: finalAssignedToType,
      assignedToModel: finalAssignedToModel
    };
    
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

// PUT /admin/query-tickets/:id - Update query ticket
// Attachment handling:
// - If removeAttachmentIds array is provided, those attachments are removed from Cloudinary and ticket
// - If new files are uploaded (req.files or req.file), they are added to existing attachments
// - If keepExistingAttachment is true and no new files, existing attachments are preserved
// - If no changes requested, existing attachments remain unchanged
export const updateQueryTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    const { status, title, businessId, description, childIssue, linkedIssue, websiteUrl, assignedToType, attachment, comments } = req.body;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findById(id);
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    // Check if admin created this ticket
    if (ticket.createdBy.toString() !== adminId.toString() || ticket.createdByType !== 'admin') {
      return errorResponseHelper(res, { message: 'You can only update tickets you created', code: '00403' });
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
            const videoResult = await uploadVideo(file.buffer, 'admin-app/tickets/videos');
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
            const imageResult = await uploadImage(file.buffer, 'admin-app/tickets/documents');
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
          const videoResult = await uploadVideo(req.file.buffer, 'admin-app/tickets/videos');
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
          const imageResult = await uploadImage(req.file.buffer, 'admin-app/tickets/documents');
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
        // Assign to business owner (use the businessOwner from the business)
        const targetBusinessId = businessId || ticket.businessId;
        // Get business to access businessOwner
        const targetBusiness = await Business.findById(targetBusinessId).populate('businessOwner');
        if (!targetBusiness) {
          return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
        }
        ticket.assignedTo = targetBusiness.businessOwner;
        ticket.assignedToType = 'business';
        ticket.assignedToModel = 'Business';
        console.log('Auto-assigning to business owner:', targetBusiness.businessOwner?.toString());
        console.log('Target business owner ID type:', typeof targetBusiness.businessOwner);
        console.log('Target business owner ID value:', targetBusiness.businessOwner);
        console.log('Target business object:', {
          _id: targetBusiness._id?.toString(),
          businessName: targetBusiness.businessName,
          businessOwner: targetBusiness.businessOwner?.toString()
        });
      } else if (assignedToType === '2') {
        // Assign to me (current admin)
        ticket.assignedTo = adminId;
        ticket.assignedToType = 'admin';
        ticket.assignedToModel = 'Admin';
        console.log('Auto-assigning to admin (me):', adminId?.toString());
      } else {
        return errorResponseHelper(res, { 
          message: 'Invalid assignedToType. Must be 1 (assign to business) or 2 (assign to me)', 
          code: '00400' 
        });
      }
    }
    
    // Update fields
    if (title) ticket.title = title;
    if (businessId) {
      // Verify business exists and update both businessId and businessName
      const business = await Business.findById(businessId);
      if (!business) {
        return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
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

// DELETE /admin/query-tickets/:id - Delete query ticket
export const deleteQueryTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findById(id);
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    // Check if admin created this ticket
    if (ticket.createdBy.toString() !== adminId.toString() || ticket.createdByType !== 'admin') {
      return errorResponseHelper(res, { message: 'You can only delete tickets you created', code: '00403' });
    }
    
    await QueryTicket.findByIdAndDelete(id);
    
    return successResponseHelper(res, {
      message: 'Query ticket deleted successfully'
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
};

// PUT /admin/query-tickets/:id/close - Close query ticket (only creator can close)
export const closeQueryTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    const ticket = await QueryTicket.findOne({ 
      _id: id, 
      createdBy: adminId,
      createdByType: 'admin'
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

// PUT /admin/query-tickets/:id/status - Update ticket status (admin can update any ticket)
export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    if (!status || !['pending', 'in_progress', 'completed', 'not_completed'].includes(status)) {
      return errorResponseHelper(res, { message: 'Invalid status. Must be pending, in_progress, completed, or not_completed', code: '00400' });
    }
    
    const ticket = await QueryTicket.findById(id);
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    // Check permissions for status update
    const isCreator = ticket.createdBy.toString() === adminId.toString();
    const isAssignee = ticket.assignedTo && ticket.assignedTo.toString() === adminId.toString();
    
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

// GET /admin/query-tickets/stats - Get ticket statistics
export const getTicketStats = async (req, res) => {
  try {
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    const stats = await QueryTicket.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const total = await QueryTicket.countDocuments();
    
    // Get stats by creator type
    const creatorStats = await QueryTicket.aggregate([
      {
        $group: {
          _id: '$createdByType',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get assignment stats
    const assignmentStats = await QueryTicket.aggregate([
      {
        $group: {
          _id: {
            assigned: { $cond: [{ $eq: ['$assignedTo', null] }, 'unassigned', 'assigned'] }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get top assigned admins
    const topAssignedAdmins = await QueryTicket.aggregate([
      {
        $match: { assignedTo: { $ne: null } }
      },
      {
        $group: {
          _id: '$assignedTo',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'admins',
          localField: '_id',
          foreignField: '_id',
          as: 'admin'
        }
      },
      {
        $unwind: '$admin'
      },
      {
        $project: {
          _id: 1,
          count: 1,
          firstName: '$admin.firstName',
          lastName: '$admin.lastName',
          email: '$admin.email'
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
        assigned: 0,
        unassigned: 0
      },
      topAssignedAdmins
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

// PATCH /admin/query-tickets/:id/assign - Assign ticket to admin or business
export const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedToType } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    if (!assignedToType) {
      return errorResponseHelper(res, { message: 'AssignedToType is required', code: '00400' });
    }
    
    // Check if ticket exists
    const ticket = await QueryTicket.findById(id);
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    let assignedUserId = null;
    let assignedUserName = '';
    let assignedUserType = '';
    let assignedUserModel = '';
    
    if (assignedToType === '1') {
              // Assign to business owner (use the businessOwner from the business)
        // Get business to access businessOwner
        const assignedBusiness = await Business.findById(ticket.businessId).populate('businessOwner');
        if (!assignedBusiness) {
          return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
        }
        assignedUserId = assignedBusiness.businessOwner;
        assignedUserType = 'business';
        assignedUserModel = 'Business';
        assignedUserName = assignedBusiness.businessName;
        
        console.log('Assigning to business owner:', {
          businessId: ticket.businessId?.toString(),
          businessName: assignedBusiness.businessName,
          businessOwner: assignedBusiness.businessOwner?.toString(),
          businessOwnerType: typeof assignedBusiness.businessOwner
        });
      
    } else if (assignedToType === '2') {
      // Assign to me (current admin)
      assignedUserId = adminId;
      assignedUserType = 'admin';
      assignedUserModel = 'Admin';
      
      // Get admin details for name
      const assignedAdmin = await Admin.findById(assignedUserId);
      if (!assignedAdmin) {
        return errorResponseHelper(res, { message: 'Admin not found', code: '00404' });
      }
      assignedUserName = `${assignedAdmin.firstName} ${assignedAdmin.lastName}`;
      
    } else {
      return errorResponseHelper(res, { message: 'Invalid assignment type. Must be 1 (business) or 2 (admin)', code: '00400' });
    }
    
    // Check if ticket is already assigned to the same user
    if (ticket.assignedTo && ticket.assignedTo.toString() === assignedUserId.toString()) {
      return errorResponseHelper(res, { message: 'Ticket is already assigned to this user', code: '00400' });
    }
    
    // Update ticket assignment
    ticket.assignedTo = assignedUserId;
    ticket.assignedToType = assignedUserType;
    ticket.assignedToModel = assignedUserModel;
    ticket.assignedAt = new Date();
    ticket.assignedBy = adminId;
    ticket.updatedAt = new Date();
    
    // If ticket is pending, change status to in_progress when assigned
    if (ticket.status === 'pending') {
      ticket.status = 'in_progress';
    }
    
    await ticket.save();
    
    // Debug logging after assignment
    console.log('Ticket assigned successfully. Database values:', {
      _id: ticket._id?.toString(),
      assignedTo: ticket.assignedTo?.toString(),
      assignedToType: ticket.assignedToType,
      assignedToModel: ticket.assignedToModel,
      createdBy: ticket.createdBy?.toString(),
      createdByType: ticket.createdByType,
      businessId: ticket.businessId?.toString()
    });
    
    // Populate assigned user details for response
    if (assignedUserType === 'admin') {
      await ticket.populate('assignedTo', 'firstName lastName email');
    } else {
      await ticket.populate('assignedTo', 'businessName contactPerson email');
    }
    await ticket.populate('assignedBy', 'firstName lastName email');
    await ticket.populate({
      path: 'comments',
      populate: {
        path: 'replies'
      }
    });
    
    return successResponseHelper(res, {
      message: 'Ticket assigned successfully',
      data: {
        ticket,
        assignedTo: {
          _id: assignedUserId,
          name: assignedUserName,
          type: assignedUserType
        },
        assignedBy: {
          _id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
};

// PATCH /admin/query-tickets/bulk-status - Bulk update ticket status
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { ticketIds, status } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return errorResponseHelper(res, { message: 'Ticket IDs array is required', code: '00400' });
    }
    
    if (!status || !['pending', 'in_progress', 'completed', 'not_completed'].includes(status)) {
      return errorResponseHelper(res, { message: 'Valid status is required', code: '00400' });
    }
    
    // Validate all ticket IDs
    for (const ticketId of ticketIds) {
      if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        return errorResponseHelper(res, { message: `Invalid ticket ID: ${ticketId}`, code: '00400' });
      }
    }
    
    // Update tickets
    const result = await QueryTicket.updateMany(
      { _id: { $in: ticketIds } },
      { 
        status,
        updatedAt: new Date()
      }
    );
    
    return successResponseHelper(res, {
      message: `${result.modifiedCount} tickets updated successfully`,
      data: {
        updatedCount: result.modifiedCount,
        totalCount: ticketIds.length
      }
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
  }
}; 

// POST /admin/query-tickets/:id/comments - Add comment to ticket
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    // Admin can comment on tickets assigned to them, created by them, or assigned to any admin
    const ticket = await QueryTicket.findOne({
      _id: id,
      $or: [
        { assignedTo: adminId, assignedToType: 'admin' },
        { createdBy: adminId, createdByType: 'admin' },
        { assignedToType: 'admin' } // Show all tickets assigned to any admin
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found or access denied', code: '00404' });
    }
    
    // Get admin details for author name
    const admin = await Admin.findById(adminId);
    const authorName = admin ? `${admin.firstName} ${admin.lastName} (Admin)` : 'Admin User';
    
    const comment = {
      content,
      authorId: adminId,
      authorType: 'admin',
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

// PUT /admin/query-tickets/:id/comments/:commentId - Edit comment
export const editComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { content } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Comment content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket or comment ID', code: '00400' });
    }
    
    // Admin can edit comments on tickets assigned to them, created by them, or assigned to any admin
    const ticket = await QueryTicket.findOne({
      _id: id,
      $or: [
        { assignedTo: adminId, assignedToType: 'admin' },
        { createdBy: adminId, createdByType: 'admin' },
        { assignedToType: 'admin' } // Show all tickets assigned to any admin
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found or access denied', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Check if comment belongs to this admin
    if (comment.authorId.toString() !== adminId.toString()) {
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

// DELETE /admin/query-tickets/:id/comments/:commentId - Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket or comment ID', code: '00400' });
    }
    
    // Admin can delete comments on tickets assigned to them, created by them, or assigned to any admin
    const ticket = await QueryTicket.findOne({
      _id: id,
      $or: [
        { assignedTo: adminId, assignedToType: 'admin' },
        { createdBy: adminId, createdByType: 'admin' },
        { assignedToType: 'admin' } // Show all tickets assigned to any admin
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found or access denied', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Check if comment belongs to this admin
    if (comment.authorId.toString() !== adminId.toString()) {
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

// POST /admin/query-tickets/:id/comments/:commentId/replies - Add reply to comment
export const addReply = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { content } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket or comment ID', code: '00400' });
    }
    
    // Admin can reply to comments on tickets assigned to them, created by them, or assigned to any admin
    const ticket = await QueryTicket.findOne({
      _id: id,
      $or: [
        { assignedTo: adminId, assignedToType: 'admin' },
        { createdBy: adminId, createdByType: 'admin' },
        { assignedToType: 'admin' } // Show all tickets assigned to any admin
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found or access denied', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    // Get admin details for author name
    const admin = await Admin.findById(adminId);
    const authorName = admin ? `${admin.firstName} ${admin.lastName} (Admin)` : 'Admin User';
    
    const reply = {
      content,
      authorId: adminId,
      authorType: 'admin',
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

// PUT /admin/query-tickets/:id/comments/:commentId/replies/:replyId - Edit reply
export const editReply = async (req, res) => {
  try {
    const { id, commentId, replyId } = req.params;
    const { content } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!content) {
      return errorResponseHelper(res, { message: 'Reply content is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket, comment, or reply ID', code: '00400' });
    }
    
    // Admin can edit replies on tickets assigned to them, created by them, or assigned to any admin
    const ticket = await QueryTicket.findOne({
      _id: id,
      $or: [
        { assignedTo: adminId, assignedToType: 'admin' },
        { createdBy: adminId, createdByType: 'admin' },
        { assignedToType: 'admin' } // Show all tickets assigned to any admin
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found or access denied', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const reply = comment.replies.id(replyId);
    if (!reply) {
      return errorResponseHelper(res, { message: 'Reply not found', code: '00404' });
    }
    
    // Check if reply belongs to this admin
    if (reply.authorId.toString() !== adminId.toString()) {
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

// DELETE /admin/query-tickets/:id/comments/:commentId/replies/:replyId - Delete reply
export const deleteReply = async (req, res) => {
  try {
    const { id, commentId, replyId } = req.params;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return errorResponseHelper(res, { message: 'Invalid ticket, comment, or reply ID', code: '00400' });
    }
    
    // Admin can delete replies on tickets assigned to them, created by them, or assigned to any admin
    const ticket = await QueryTicket.findOne({
      _id: id,
      $or: [
        { assignedTo: adminId, assignedToType: 'admin' },
        { createdBy: adminId, createdByType: 'admin' },
        { assignedToType: 'admin' } // Show all tickets assigned to any admin
      ]
    });
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found or access denied', code: '00404' });
    }
    
    const comment = ticket.comments.id(commentId);
    if (!comment) {
      return errorResponseHelper(res, { message: 'Comment not found', code: '00404' });
    }
    
    const reply = comment.replies.id(replyId);
    if (!reply) {
      return errorResponseHelper(res, { message: 'Reply not found', code: '00404' });
    }
    
    // Check if reply belongs to this admin
    if (reply.authorId.toString() !== adminId.toString()) {
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