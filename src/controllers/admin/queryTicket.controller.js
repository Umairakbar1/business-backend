import QueryTicket from '../../models/admin/queryTicket.js';
import Admin from '../../models/admin/admin.js';
import Business from '../../models/business/business.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import mongoose from 'mongoose';

// GET /admin/query-tickets - Get all query tickets (admin can see all)
export const getAllQueryTickets = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const { page = 1, limit = 10, status, createdByType, assignedTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (createdByType) filter.createdByType = createdByType;
    if (assignedTo) filter.assignedTo = assignedTo;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get tickets with populated information
    const tickets = await QueryTicket.find(filter)
      .populate('businessId', 'businessName contactPerson email')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await QueryTicket.countDocuments(filter);
    
    return successResponseHelper(res, {
      message: 'Query tickets fetched successfully',
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
    
    const ticket = await QueryTicket.findById(id)
      .populate('businessId', 'businessName contactPerson email')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName email');
    
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
    const { title, businessName, description, childIssue, linkedIssue, websiteUrl } = req.body;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    // Validate required fields
    if (!title || !businessName || !description) {
      return errorResponseHelper(res, { message: 'Title, business name, and description are required', code: '00400' });
    }
    
    // Get admin details
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return errorResponseHelper(res, { message: 'Admin not found', code: '00404' });
    }
    
    // Handle file upload if present
    let attachment = null;
    if (req.file) {
      attachment = {
        url: req.file.location || req.file.path,
        key: req.file.key,
        originalName: req.file.originalname
      };
    }
    
    const ticketData = {
      title,
      businessName,
      description,
      childIssue,
      linkedIssue,
      websiteUrl,
      attachment,
      createdBy: adminId,
      createdByType: 'admin'
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

// PUT /admin/query-tickets/:id - Update query ticket
export const updateQueryTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    const { title, businessName, description, childIssue, linkedIssue, websiteUrl } = req.body;
    
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
    
    // Update fields
    if (title) ticket.title = title;
    if (businessName) ticket.businessName = businessName;
    if (description) ticket.description = description;
    if (childIssue !== undefined) ticket.childIssue = childIssue;
    if (linkedIssue !== undefined) ticket.linkedIssue = linkedIssue;
    if (websiteUrl !== undefined) ticket.websiteUrl = websiteUrl;
    
    // Handle file upload if present
    if (req.file) {
      ticket.attachment = {
        url: req.file.location || req.file.path,
        key: req.file.key,
        originalName: req.file.originalname
      };
    }
    
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
    
    const ticket = await QueryTicket.findById(id);
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
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
    
    const ticket = await QueryTicket.findById(id);
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
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
    
    const ticket = await QueryTicket.findById(id);
    
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
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

// PATCH /admin/query-tickets/:id/assign - Assign ticket to admin
export const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const adminId = req.user?._id;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponseHelper(res, { message: 'Invalid ticket ID', code: '00400' });
    }
    
    if (!assignedTo) {
      return errorResponseHelper(res, { message: 'Assigned admin ID is required', code: '00400' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return errorResponseHelper(res, { message: 'Invalid assigned admin ID', code: '00400' });
    }
    
    // Check if ticket exists
    const ticket = await QueryTicket.findById(id);
    if (!ticket) {
      return errorResponseHelper(res, { message: 'Query ticket not found', code: '00404' });
    }
    
    // Check if assigned admin exists
    const assignedAdmin = await Admin.findById(assignedTo);
    if (!assignedAdmin) {
      return errorResponseHelper(res, { message: 'Assigned admin not found', code: '00404' });
    }
    
    // Check if ticket is already assigned to the same admin
    if (ticket.assignedTo && ticket.assignedTo.toString() === assignedTo) {
      return errorResponseHelper(res, { message: 'Ticket is already assigned to this admin', code: '00400' });
    }
    
    // Update ticket assignment
    ticket.assignedTo = assignedTo;
    ticket.assignedAt = new Date();
    ticket.assignedBy = adminId;
    ticket.updatedAt = new Date();
    
    // If ticket is pending, change status to in_progress when assigned
    if (ticket.status === 'pending') {
      ticket.status = 'in_progress';
    }
    
    await ticket.save();
    
    // Populate assigned admin details for response
    await ticket.populate('assignedTo', 'firstName lastName email');
    await ticket.populate('assignedBy', 'firstName lastName email');
    
    return successResponseHelper(res, {
      message: 'Ticket assigned successfully',
      data: {
        ticket,
        assignedTo: {
          _id: assignedAdmin._id,
          firstName: assignedAdmin.firstName,
          lastName: assignedAdmin.lastName,
          email: assignedAdmin.email
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