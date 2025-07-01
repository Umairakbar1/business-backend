import User from '../../models/user/user.js';
import { GLOBAL_ENUMS } from '../../config/globalConfig.js';

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const { queryText, status, startDate, endDate } = req.query;
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

    const users = await User.find(filter, '-password'); // Exclude password
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
};

// Get single user by ID
export const getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId, '-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
  }
};

// Change user status
export const changeStatusOfUser = async (req, res) => {
  try {
    const { status } = req.body;
    if (!GLOBAL_ENUMS.userStatus.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status },
      { new: true, runValidators: true, select: '-password' }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: 'User status updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user status', error: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
};
