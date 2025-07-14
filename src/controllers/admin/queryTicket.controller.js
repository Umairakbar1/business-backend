import QueryTicket from '../../models/admin/queryTicket.js';
import Admin from '../../models/admin/admin.js';
import Business from '../../models/business/business.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import mongoose from 'mongoose';

// GET /admin/query-tickets - Get all query tickets (admin can see all)
export const getAllQueryTickets = async (req, res) => {
  try {
    const adminId = req.user?._id;
    const { page = 1, limit = 10, status, createdByType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    if (!adminId) {
      return errorResponseHelper(res, { message: 'Admin not authenticated', code: '00401' });
    }
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (createdByType) filter.createdByType = createdByType;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get tickets with populated information
    const tickets = await QueryTicket.find(filter)
      .populate('businessId', 'businessName contactPerson email')
      .populate('createdBy', 'firstName lastName email')
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
      .populate('createdBy', 'firstName lastName email');
    
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
      }
    };
    
    stats.forEach(stat => {
      statsObj[stat._id] = stat.count;
    });
    
    creatorStats.forEach(stat => {
      statsObj.byCreator[stat._id] = stat.count;
    });
    
    return successResponseHelper(res, {
      message: 'Ticket statistics fetched successfully',
      data: statsObj
    });
  } catch (error) {
    return errorResponseHelper(res, { message: error.message, code: '00500' });
  }
}; 