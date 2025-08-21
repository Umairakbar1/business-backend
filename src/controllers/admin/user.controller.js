import User from '../../models/user/user.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { GLOBAL_ENUMS } from '../../config/globalConfig.js';

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, queryText, status, startDate, endDate } = req.query;
    const filter = {};

    // Text search (name, userName, email)
    if (queryText) {
      filter.$or = [
        { name: { $regex: queryText, $options: 'i' } },
        { userName: { $regex: queryText, $options: 'i' } },
        { email: { $regex: queryText, $options: 'i' } }
      ];
    }

    // Status filter
    if (status && GLOBAL_ENUMS.userStatus.includes(status)) {
      filter.status = status;
    }

    // Registration date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(filter, '-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    return successResponseHelper(res, {
      message: 'Users fetched successfully',
      data: users,
      pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      
    });
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch users', code: '00500' });
  }
};

// Get single user by ID
export const getSingleUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId, '-password');
    if (!user) {
      return errorResponseHelper(res, { message: 'User not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'User fetched successfully', data: user });
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch user', code: '00500' });
  }
};

// Change user status
export const changeStatusOfUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    if (!status || !GLOBAL_ENUMS.userStatus.includes(status)) {
      return errorResponseHelper(res, { message: 'Invalid status value', code: '00400' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true, runValidators: true, select: '-password' }
    );
    
    if (!user) {
      return errorResponseHelper(res, { message: 'User not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'User status updated successfully', data: user });
  } catch (error) {
    console.error('Update user status error:', error);
    return errorResponseHelper(res, { message: 'Failed to update user status', code: '00500' });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return errorResponseHelper(res, { message: 'User not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponseHelper(res, { message: 'Failed to delete user', code: '00500' });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.email; // Email should be updated through a separate verification process
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true, select: '-password' }
    );
    
    if (!user) {
      return errorResponseHelper(res, { message: 'User not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'User updated successfully', data: user });
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponseHelper(res, { message: 'Failed to update user', code: '00500' });
  }
};

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const inactiveUsers = await User.countDocuments({ status: 'inactive' });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    
    // Get users registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    // Get users by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    const stats = {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      suspended: suspendedUsers,
      recentUsers,
      monthlyStats
    };
    
    return successResponseHelper(res, { message: 'User statistics fetched successfully', data: stats });
  } catch (error) {
    console.error('Get user stats error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch user statistics', code: '00500' });
  }
};

// Bulk update user status
export const bulkUpdateUserStatus = async (req, res) => {
  try {
    const { userIds, status } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return errorResponseHelper(res, { message: 'User IDs array is required', code: '00400' });
    }
    
    if (!status || !GLOBAL_ENUMS.userStatus.includes(status)) {
      return errorResponseHelper(res, { message: 'Valid status is required', code: '00400' });
    }
    
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { status, updatedAt: new Date() }
    );
    
    return successResponseHelper(res, {
      message: `Successfully updated ${result.modifiedCount} user(s) status`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Bulk update user status error:', error);
    return errorResponseHelper(res, { message: 'Failed to bulk update user status', code: '00500' });
  }
};
