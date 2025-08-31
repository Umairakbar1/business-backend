import LegalDocument from '../../models/admin/legalDocument.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';

// Create or update legal document
const createOrUpdateLegalDocument = async (req, res) => {
    try {
        const { type, title, content, meta } = req.body;
        const adminId = req.admin._id;

        if (!type || !title || !content) {
            return errorResponseHelper(res, { 
                message: "Type, title, and content are required", 
                code: '00400' 
            });
        }

        // Validate document type
        const validTypes = ['privacy-policy', 'terms-conditions', 'cookies'];
        if (!validTypes.includes(type)) {
            return errorResponseHelper(res, { 
                message: "Invalid document type. Must be one of: privacy-policy, terms-conditions, cookies", 
                code: '00400' 
            });
        }

        // Check if document already exists
        let existingDocument = await LegalDocument.findOne({ type });

        if (existingDocument) {
            // Update existing document
            existingDocument.title = title;
            existingDocument.content = content;
            existingDocument.updatedBy = adminId;
            existingDocument.version += 1;
            
            if (meta) {
                existingDocument.meta = { ...existingDocument.meta, ...meta };
            }

            await existingDocument.save();

            return successResponseHelper(res, { 
                message: "Legal document updated successfully", 
                data: existingDocument 
            });
        } else {
            // Create new document
            const documentData = {
                type,
                title,
                content,
                createdBy: adminId,
                updatedBy: adminId,
                meta: meta || {}
            };

            const newDocument = await LegalDocument.create(documentData);

            return successResponseHelper(res, { 
                message: "Legal document created successfully", 
                data: newDocument 
            });
        }
    } catch (error) {
        console.error('Create/Update legal document error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get legal document by type (public endpoint)
const getLegalDocumentByType = async (req, res) => {
    try {
        const { type } = req.params;

        const document = await LegalDocument.findOne({ 
            type, 
            isActive: true 
        }).select('title content version lastUpdated meta');

        if (!document) {
            return errorResponseHelper(res, { 
                message: "Legal document not found", 
                code: '00404' 
            });
        }

        return successResponseHelper(res, { 
            message: "Legal document retrieved successfully", 
            data: document 
        });
    } catch (error) {
        console.error('Get legal document error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get all legal documents (admin only)
const getAllLegalDocuments = async (req, res) => {
    try {
        const documents = await LegalDocument.find()
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ lastUpdated: -1 });

        return successResponseHelper(res, { 
            message: "Legal documents retrieved successfully", 
            data: documents 
        });
    } catch (error) {
        console.error('Get all legal documents error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get legal document by ID (admin only)
const getLegalDocumentById = async (req, res) => {
    try {
        const { id } = req.params;

        const document = await LegalDocument.findById(id)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!document) {
            return errorResponseHelper(res, { 
                message: "Legal document not found", 
                code: '00404' 
            });
        }

        return successResponseHelper(res, { 
            message: "Legal document retrieved successfully", 
            data: document 
        });
    } catch (error) {
        console.error('Get legal document by ID error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Update legal document
const updateLegalDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, meta, isActive } = req.body;
        const adminId = req.admin._id;

        const document = await LegalDocument.findById(id);

        if (!document) {
            return errorResponseHelper(res, { 
                message: "Legal document not found", 
                code: '00404' 
            });
        }

        // Update fields
        if (title !== undefined) document.title = title;
        if (content !== undefined) document.content = content;
        if (isActive !== undefined) document.isActive = isActive;
        if (meta !== undefined) {
            document.meta = { ...document.meta, ...meta };
        }

        document.updatedBy = adminId;
        document.version += 1;

        await document.save();

        return successResponseHelper(res, { 
            message: "Legal document updated successfully", 
            data: document 
        });
    } catch (error) {
        console.error('Update legal document error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Delete legal document
const deleteLegalDocument = async (req, res) => {
    try {
        const { id } = req.params;

        const document = await LegalDocument.findById(id);

        if (!document) {
            return errorResponseHelper(res, { 
                message: "Legal document not found", 
                code: '00404' 
            });
        }

        await LegalDocument.findByIdAndDelete(id);

        return successResponseHelper(res, { 
            message: "Legal document deleted successfully" 
        });
    } catch (error) {
        console.error('Delete legal document error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Toggle document active status
const toggleDocumentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.admin._id;

        const document = await LegalDocument.findById(id);

        if (!document) {
            return errorResponseHelper(res, { 
                message: "Legal document not found", 
                code: '00404' 
            });
        }

        document.isActive = !document.isActive;
        document.updatedBy = adminId;

        await document.save();

        return successResponseHelper(res, { 
            message: `Legal document ${document.isActive ? 'activated' : 'deactivated'} successfully`, 
            data: document 
        });
    } catch (error) {
        console.error('Toggle document status error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get all active legal documents (public endpoint)
const getAllActiveLegalDocuments = async (req, res) => {
    try {
        const documents = await LegalDocument.find({ 
            isActive: true 
        }).select('type title version lastUpdated meta.description');

        return successResponseHelper(res, { 
            message: "Active legal documents retrieved successfully", 
            data: documents 
        });
    } catch (error) {
        console.error('Get active legal documents error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get document history (admin only)
const getDocumentHistory = async (req, res) => {
    try {
        const { type } = req.params;

        const documents = await LegalDocument.find({ type })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ version: -1 });

        if (documents.length === 0) {
            return errorResponseHelper(res, { 
                message: "No document history found", 
                code: '00404' 
            });
        }

        return successResponseHelper(res, { 
            message: "Document history retrieved successfully", 
            data: documents 
        });
    } catch (error) {
        console.error('Get document history error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

export {
    createOrUpdateLegalDocument,
    getLegalDocumentByType,
    getAllLegalDocuments,
    getLegalDocumentById,
    updateLegalDocument,
    deleteLegalDocument,
    toggleDocumentStatus,
    getAllActiveLegalDocuments,
    getDocumentHistory
};
