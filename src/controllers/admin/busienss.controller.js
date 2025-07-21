import Business from '../../models/business/business.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';

// Get all businesses
export const getAllBusinesses = async (req, res) => {
  try {
    const { page = 1, limit = 10, queryText, status, startDate, endDate } = req.query;
    const filter = {};

    // Text search (businessName, contactPerson, email, phone, website)
    if (queryText) {
      filter.$or = [
        { businessName: { $regex: queryText, $options: 'i' } },
        { contactPerson: { $regex: queryText, $options: 'i' } },
        { email: { $regex: queryText, $options: 'i' } },
        { phone: { $regex: queryText, $options: 'i' } },
        { website: { $regex: queryText, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Registration date filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const businesses = await Business.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Business.countDocuments(filter);

    return successResponseHelper(res, {
      message: 'Businesses fetched successfully',
      data: {
        businesses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get businesses error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch businesses', code: '00500' });
  }
};

// Get single business by ID
export const getSingleBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const business = await Business.findById(businessId);
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'Business fetched successfully', data: business });
  } catch (error) {
    console.error('Get business error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch business', code: '00500' });
  }
};

// Change business status
export const changeStatusOfBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return errorResponseHelper(res, { message: 'Status is required', code: '00400' });
    }
    
    const business = await Business.findByIdAndUpdate(
      businessId,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'Business status updated successfully', data: business });
  } catch (error) {
    console.error('Update business status error:', error);
    return errorResponseHelper(res, { message: 'Failed to update business status', code: '00500' });
  }
};

// Delete business
export const deleteBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const business = await Business.findByIdAndDelete(businessId);
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Delete business error:', error);
    return errorResponseHelper(res, { message: 'Failed to delete business', code: '00500' });
  }
};

// Update business information
export const updateBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const updateData = req.body;
    
    const business = await Business.findByIdAndUpdate(
      businessId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!business) {
      return errorResponseHelper(res, { message: 'Business not found', code: '00404' });
    }
    
    return successResponseHelper(res, { message: 'Business updated successfully', data: business });
  } catch (error) {
    console.error('Update business error:', error);
    return errorResponseHelper(res, { message: 'Failed to update business', code: '00500' });
  }
};

// Get business statistics
export const getBusinessStats = async (req, res) => {
  try {
    const totalBusinesses = await Business.countDocuments();
    const activeBusinesses = await Business.countDocuments({ status: 'active' });
    const inactiveBusinesses = await Business.countDocuments({ status: 'inactive' });
    const pendingBusinesses = await Business.countDocuments({ status: 'pending' });
    const suspendedBusinesses = await Business.countDocuments({ status: 'suspended' });
    
    // Get businesses registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBusinesses = await Business.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    // Get businesses by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyStats = await Business.aggregate([
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
    
    // Get businesses by category
    const categoryStats = await Business.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const stats = {
      total: totalBusinesses,
      active: activeBusinesses,
      inactive: inactiveBusinesses,
      pending: pendingBusinesses,
      suspended: suspendedBusinesses,
      recentBusinesses,
      monthlyStats,
      categoryStats
    };
    
    return successResponseHelper(res, { message: 'Business statistics fetched successfully', data: stats });
  } catch (error) {
    console.error('Get business stats error:', error);
    return errorResponseHelper(res, { message: 'Failed to fetch business statistics', code: '00500' });
  }
};

// Bulk update business status
export const bulkUpdateBusinessStatus = async (req, res) => {
  try {
    const { businessIds, status } = req.body;
    
    if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
      return errorResponseHelper(res, { message: 'Business IDs array is required', code: '00400' });
    }
    
    if (!status) {
      return errorResponseHelper(res, { message: 'Status is required', code: '00400' });
    }
    
    const result = await Business.updateMany(
      { _id: { $in: businessIds } },
      { status, updatedAt: new Date() }
    );
    
    return successResponseHelper(res, {
      message: `Successfully updated ${result.modifiedCount} business(es) status`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Bulk update business status error:', error);
    return errorResponseHelper(res, { message: 'Failed to bulk update business status', code: '00500' });
  }
};
