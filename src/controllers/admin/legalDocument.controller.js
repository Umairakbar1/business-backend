import LegalDocument from '../../models/admin/legalDocument.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { uploadImage, deleteFile } from '../../helpers/cloudinaryHelper.js';

// Create legal document
const createLegalDocument = async (req, res) => {
    try {
        const { title, type, description, content, isPublic = true } = req.body;
        const adminId = req.admin._id;

        // Create new document
        const documentData = {
            title,
            type,
            description,
            content,
            isPublic,
            uploadedBy: adminId,
            version: 1
        };

        // Handle file upload if provided
        if (req.file) {
            let uploadResult;
            try {
                uploadResult = await uploadImage(req.file.buffer, 'business-app/legal-documents');
            } catch (uploadError) {
                console.error('Document upload error:', uploadError);
                return errorResponseHelper(res, { 
                    message: 'Failed to upload document file', 
                    code: '00500' 
                });
            }

            documentData.documentFile = {
                url: uploadResult.url,
                public_id: uploadResult.public_id,
                filename: req.file.originalname,
                size: req.file.size,
                format: uploadResult.format
            };
        }

        const legalDocument = await LegalDocument.create(documentData);

        return successResponseHelper(res, { 
            message: "Legal document created successfully", 
            data: legalDocument 
        });
    } catch (error) {
        console.error('Create legal document error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get all legal documents (public endpoint)
const getAllLegalDocuments = async (req, res) => {
    try {
        const documents = await LegalDocument.find({ 
            isActive: true, 
            isPublic: true 
        }).select('-__v').sort({ type: 1, version: -1 });

        return successResponseHelper(res, { 
            message: "Legal documents retrieved successfully", 
            data: documents 
        });
    } catch (error) {
        console.error('Get legal documents error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get legal document by type (public endpoint)
const getLegalDocumentByType = async (req, res) => {
    try {
        const { type } = req.params;

        const document = await LegalDocument.findOne({ 
            type, 
            isActive: true, 
            isPublic: true 
        }).select('-__v');

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

// Get all legal documents (admin endpoint)
const getAllLegalDocumentsAdmin = async (req, res) => {
    try {
        const documents = await LegalDocument.find({ isActive: true })
            .select('-__v')
            .sort({ type: 1, version: -1 });

        return successResponseHelper(res, { 
            message: "Legal documents retrieved successfully", 
            data: documents 
        });
    } catch (error) {
        console.error('Get legal documents admin error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Update legal document
const updateLegalDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, content, isPublic } = req.body;
        const adminId = req.admin._id;

        const document = await LegalDocument.findById(id);

        if (!document) {
            return errorResponseHelper(res, { 
                message: "Legal document not found", 
                code: '00404' 
            });
        }

        // Update fields
        if (title) document.title = title;
        if (description !== undefined) document.description = description;
        if (content) document.content = content;
        if (isPublic !== undefined) document.isPublic = isPublic;
        document.uploadedBy = adminId;
        document.version += 1;
        document.lastUpdated = new Date();

        // Handle file upload if provided
        if (req.file) {
            // Delete old file if exists
            if (document.documentFile && document.documentFile.public_id) {
                try {
                    await deleteFile(document.documentFile.public_id);
                } catch (deleteError) {
                    console.error('Error deleting old document file:', deleteError);
                }
            }

            // Upload new file
            let uploadResult;
            try {
                uploadResult = await uploadImage(req.file.buffer, 'business-app/legal-documents');
            } catch (uploadError) {
                console.error('Document upload error:', uploadError);
                return errorResponseHelper(res, { 
                    message: 'Failed to upload document file', 
                    code: '00500' 
                });
            }

            document.documentFile = {
                url: uploadResult.url,
                public_id: uploadResult.public_id,
                filename: req.file.originalname,
                size: req.file.size,
                format: uploadResult.format
            };
        }

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

// Delete legal document (hard delete)
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

        // Delete file from Cloudinary if exists
        if (document.documentFile && document.documentFile.public_id) {
            try {
                await deleteFile(document.documentFile.public_id);
            } catch (deleteError) {
                console.error('Error deleting document file from Cloudinary:', deleteError);
            }
        }

        // Hard delete the document
        await LegalDocument.findByIdAndDelete(id);

        return successResponseHelper(res, { 
            message: "Legal document deleted successfully" 
        });
    } catch (error) {
        console.error('Delete legal document error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

export {
    createLegalDocument,
    getAllLegalDocuments,
    getLegalDocumentByType,
    getAllLegalDocumentsAdmin,
    updateLegalDocument,
    deleteLegalDocument
};
