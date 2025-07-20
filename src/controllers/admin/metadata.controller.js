import Metadata from '../../models/admin/metadata.js';
import {successResponseHelper as  successResponse, errorResponseHelper as errorResponse  } from '../../helpers/utilityHelper.js';

// Create metadata
export const createMetadata = async (req, res) => {
    try {
        const {
            pageName,
            pageUrl,
            title,
            description,
            focusKeywords,
            ogTitle,
            ogDescription,
            ogImage,
            canonicalUrl
        } = req.body;

        // Check if metadata already exists for this page
        const existingMetadata = await Metadata.findOne({ pageName });
        if (existingMetadata) {
            return errorResponse(res, 'Metadata for this page already exists', 400);
        }

        const metadata = new Metadata({
            pageName,
            pageUrl,
            title,
            description,
            focusKeywords: focusKeywords || [],
            ogTitle,
            ogDescription,
            ogImage,
            canonicalUrl,
            createdBy: req.admin._id
        });

        await metadata.save();

        return successResponse(res, 'Metadata created successfully', metadata);
    } catch (error) {
        console.error('Create metadata error:', error);
        return errorResponse(res, 'Failed to create metadata', 500);
    }
};

// Get all metadata
export const getAllMetadata = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        const skip = (page - 1) * limit;

        let query = {};
        
        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { pageName: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const metadata = await Metadata.find(query)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Metadata.countDocuments(query);

        return successResponse(res, 'Metadata retrieved successfully', {
            metadata,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get all metadata error:', error);
        return errorResponse(res, 'Failed to retrieve metadata', 500);
    }
};

// Get metadata by ID
export const getMetadataById = async (req, res) => {
    try {
        const { id } = req.params;

        const metadata = await Metadata.findById(id)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!metadata) {
            return errorResponse(res, 'Metadata not found', 404);
        }

        return successResponse(res, 'Metadata retrieved successfully', metadata);
    } catch (error) {
        console.error('Get metadata by ID error:', error);
        return errorResponse(res, 'Failed to retrieve metadata', 500);
    }
};

// Get metadata by page URL
export const getMetadataByUrl = async (req, res) => {
    try {
        const { url } = req.params;

        const metadata = await Metadata.findOne({ 
            pageUrl: url, 
            status: 'active' 
        });

        if (!metadata) {
            return errorResponse(res, 'Metadata not found for this URL', 404);
        }

        return successResponse(res, 'Metadata retrieved successfully', metadata);
    } catch (error) {
        console.error('Get metadata by URL error:', error);
        return errorResponse(res, 'Failed to retrieve metadata', 500);
    }
};

// Update metadata
export const updateMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            pageName,
            pageUrl,
            title,
            description,
            focusKeywords,
            ogTitle,
            ogDescription,
            ogImage,
            canonicalUrl,
            status
        } = req.body;

        const metadata = await Metadata.findById(id);
        if (!metadata) {
            return errorResponse(res, 'Metadata not found', 404);
        }

        // Check if pageName is being changed and if it already exists
        if (pageName && pageName !== metadata.pageName) {
            const existingMetadata = await Metadata.findOne({ 
                pageName, 
                _id: { $ne: id } 
            });
            if (existingMetadata) {
                return errorResponse(res, 'Metadata for this page name already exists', 400);
            }
        }

        const updateData = {
            pageName,
            pageUrl,
            title,
            description,
            focusKeywords,
            ogTitle,
            ogDescription,
            ogImage,
            canonicalUrl,
            status,
            updatedBy: req.admin._id
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => 
            updateData[key] === undefined && delete updateData[key]
        );

        const updatedMetadata = await Metadata.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'name email')
         .populate('updatedBy', 'name email');

        return successResponse(res, 'Metadata updated successfully', updatedMetadata);
    } catch (error) {
        console.error('Update metadata error:', error);
        return errorResponse(res, 'Failed to update metadata', 500);
    }
};

// Delete metadata
export const deleteMetadata = async (req, res) => {
    try {
        const { id } = req.params;

        const metadata = await Metadata.findById(id);
        if (!metadata) {
            return errorResponse(res, 'Metadata not found', 404);
        }

        await Metadata.findByIdAndDelete(id);

        return successResponse(res, 'Metadata deleted successfully');
    } catch (error) {
        console.error('Delete metadata error:', error);
        return errorResponse(res, 'Failed to delete metadata', 500);
    }
};

// Bulk update metadata status
export const bulkUpdateStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return errorResponse(res, 'Please provide valid IDs array', 400);
        }

        if (!['active', 'inactive'].includes(status)) {
            return errorResponse(res, 'Invalid status value', 400);
        }

        const result = await Metadata.updateMany(
            { _id: { $in: ids } },
            { 
                status,
                updatedBy: req.admin._id
            }
        );

        return successResponse(res, `Status updated for ${result.modifiedCount} metadata entries`);
    } catch (error) {
        console.error('Bulk update status error:', error);
        return errorResponse(res, 'Failed to update metadata status', 500);
    }
};

// Get metadata statistics
export const getMetadataStats = async (req, res) => {
    try {
        const totalMetadata = await Metadata.countDocuments();
        const activeMetadata = await Metadata.countDocuments({ status: 'active' });
        const inactiveMetadata = await Metadata.countDocuments({ status: 'inactive' });

        const recentMetadata = await Metadata.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('pageName title status createdAt');

        return successResponse(res, 'Metadata statistics retrieved successfully', {
            total: totalMetadata,
            active: activeMetadata,
            inactive: inactiveMetadata,
            recent: recentMetadata
        });
    } catch (error) {
        console.error('Get metadata stats error:', error);
        return errorResponse(res, 'Failed to retrieve metadata statistics', 500);
    }
}; 