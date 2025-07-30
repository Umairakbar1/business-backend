import BusinessOwner from '../../models/business/businessOwner.js';
import { 
  errorResponseHelper, 
  successResponseHelper, 
  serverErrorHelper,
} from '../../helpers/utilityHelper.js';
import { uploadImageWithThumbnail } from '../../helpers/cloudinaryHelper.js';

// Get Business Owner Profile
export const getBusinessOwnerProfile = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner._id;

    const businessOwner = await BusinessOwner.findById(businessOwnerId)
      .select('-password')
      .populate('businesses', 'businessName category status plan');

    if (!businessOwner) {
      return errorResponseHelper(res, { 
        message: 'Business owner not found',
        code: '00404'
      });
    }

    return successResponseHelper(res, {
      message: 'Business owner profile retrieved successfully',
      data: {
        businessOwner: businessOwner.getBusinessOwnerInfo(),
        businesses: businessOwner.businesses || []
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Update Business Owner Profile
export const updateBusinessOwnerProfile = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner._id;
    const updateData = req.body;

    // Handle profile photo upload
    if (req.file) {
      try {
        const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-owners/profiles');
        updateData.profilePhoto = uploadResult.original.url;
      } catch (uploadError) {
        console.error('Profile photo upload error:', uploadError);
        return errorResponseHelper(res, { 
          message: 'Failed to upload profile photo. Please try again.',
          code: '00500'
        });
      }
    }

    // Validate email if being updated
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return errorResponseHelper(res, { 
          message: 'Please enter a valid email address',
          code: '00400'
        });
      }

      // Check if email is already taken by another business owner
      const existingBusinessOwner = await BusinessOwner.findOne({ 
        email: updateData.email,
        _id: { $ne: businessOwnerId }
      });
      
      if (existingBusinessOwner) {
        return errorResponseHelper(res, { 
          message: 'Email is already taken by another business owner',
          code: '00409'
        });
      }
    }

    // Validate phone number if being updated
    if (updateData.phoneNumber) {
      const existingPhone = await BusinessOwner.findOne({ 
        phoneNumber: updateData.phoneNumber,
        _id: { $ne: businessOwnerId }
      });
      
      if (existingPhone) {
        return errorResponseHelper(res, { 
          message: 'Phone number is already taken by another business owner',
          code: '00409'
        });
      }
    }

    const updatedBusinessOwner = await BusinessOwner.findByIdAndUpdate(
      businessOwnerId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedBusinessOwner) {
      return errorResponseHelper(res, { 
        message: 'Business owner not found',
        code: '00404'
      });
    }

    return successResponseHelper(res, {
      message: 'Business owner profile updated successfully',
      data: {
        businessOwner: updatedBusinessOwner.getBusinessOwnerInfo()
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Change Business Owner Password
export const changeBusinessOwnerPassword = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner._id;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return errorResponseHelper(res, { 
        message: 'Current password and new password are required',
        code: '00400'
      });
    }

    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
      return errorResponseHelper(res, { 
        message: 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character',
        code: '00400'
      });
    }

    const businessOwner = await BusinessOwner.findById(businessOwnerId).select('+password');
    if (!businessOwner) {
      return errorResponseHelper(res, { 
        message: 'Business owner not found',
        code: '00404'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await businessOwner.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return errorResponseHelper(res, { 
        message: 'Current password is incorrect',
        code: '00401'
      });
    }

    // Update password
    businessOwner.password = newPassword;
    await businessOwner.save();

    return successResponseHelper(res, {
      message: 'Password changed successfully'
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Delete Business Owner Account
export const deleteBusinessOwnerAccount = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner._id;
    const { password } = req.body;

    // Validate password
    if (!password) {
      return errorResponseHelper(res, { 
        message: 'Password is required to delete account',
        code: '00400'
      });
    }

    const businessOwner = await BusinessOwner.findById(businessOwnerId).select('+password');
    if (!businessOwner) {
      return errorResponseHelper(res, { 
        message: 'Business owner not found',
        code: '00404'
      });
    }

    // Verify password
    const isPasswordValid = await businessOwner.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponseHelper(res, { 
        message: 'Password is incorrect',
        code: '00401'
      });
    }

    // Delete business owner account
    await BusinessOwner.findByIdAndDelete(businessOwnerId);

    return successResponseHelper(res, {
      message: 'Business owner account deleted successfully'
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
};

// Get Business Owner Dashboard Stats
export const getBusinessOwnerDashboardStats = async (req, res) => {
  try {
    const businessOwnerId = req.businessOwner._id;

    const businessOwner = await BusinessOwner.findById(businessOwnerId)
      .populate('businesses');

    if (!businessOwner) {
      return errorResponseHelper(res, { 
        message: 'Business owner not found',
        code: '00404'
      });
    }

    // Calculate stats
    const totalBusinesses = businessOwner.businesses?.length || 0;
    const activeBusinesses = businessOwner.businesses?.filter(b => b.status === 'active').length || 0;
    const pendingBusinesses = businessOwner.businesses?.filter(b => b.status === 'pending').length || 0;

    return successResponseHelper(res, {
      message: 'Dashboard stats retrieved successfully',
      data: {
        stats: {
          totalBusinesses,
          activeBusinesses,
          pendingBusinesses,
          accountStatus: businessOwner.status,
          subscriptionPlan: businessOwner.subscription?.plan || 'bronze'
        }
      }
    });
  } catch (error) {
    return serverErrorHelper(req, res, 500, error);
  }
}; 