import Business from '../../models/business/business.js';

// Get all businesses
export const getAllBusinesses = async (req, res) => {
  try {
    const { queryText, status, startDate, endDate } = req.query;
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

    const businesses = await Business.find(filter);
    res.status(200).json({ success: true, businesses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch businesses', error: error.message });
  }
};

// Get single business by ID
export const getSingleBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.status(200).json({ success: true, business });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch business', error: error.message });
  }
};

// Change business status
export const changeStatusOfBusiness = async (req, res) => {
  try {
    const { status } = req.body;
    const business = await Business.findByIdAndUpdate(
      req.params.businessId,
      { status },
      { new: true, runValidators: true }
    );
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.status(200).json({ success: true, message: 'Business status updated', business });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update business status', error: error.message });
  }
};

// Delete business
export const deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findByIdAndDelete(req.params.businessId);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.status(200).json({ success: true, message: 'Business deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete business', error: error.message });
  }
};

// Update business information
export const updateBusiness = async (req, res) => {
  try {
    const updateData = req.body;
    const business = await Business.findByIdAndUpdate(
      req.params.businessId,
      updateData,
      { new: true, runValidators: true }
    );
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
    res.status(200).json({ success: true, message: 'Business updated successfully', business });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update business', error: error.message });
  }
};
