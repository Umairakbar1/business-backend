import BrandLogo from '../../models/admin/brandLogo.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { uploadImage, deleteFile } from '../../helpers/cloudinaryHelper.js';

// Upload or replace brand logo (single logo system)
const uploadBrandLogo = async (req, res) => {
    try {
        const { name, description } = req.body;
        const adminId = req.admin._id;

        if (!req.file) {
            return errorResponseHelper(res, { 
                message: "Logo file is required", 
                code: '00400' 
            });
        }

        // Find existing logo (if any)
        const existingLogo = await BrandLogo.findOne();
        
        // Delete existing logo from Cloudinary if it exists
        if (existingLogo && existingLogo.logo.public_id) {
            try {
                await deleteFile(existingLogo.logo.public_id);
            } catch (deleteError) {
                console.error('Error deleting old logo from Cloudinary:', deleteError);
            }
        }

        // Upload new logo to Cloudinary
        let uploadResult;
        try {
            uploadResult = await uploadImage(req.file.buffer, 'business-app/brand-logo');
        } catch (uploadError) {
            console.error('Logo upload error:', uploadError);
            return errorResponseHelper(res, { 
                message: 'Failed to upload logo file', 
                code: '00500' 
            });
        }

        // If existing logo exists, update it instead of creating new one
        if (existingLogo) {
            existingLogo.name = name || "Brand Logo";
            existingLogo.description = description;
            existingLogo.logo = {
                url: uploadResult.url,
                public_id: uploadResult.public_id,
                width: uploadResult.width,
                height: uploadResult.height,
                format: uploadResult.format,
                bytes: uploadResult.bytes
            };
            existingLogo.uploadedBy = adminId;
            existingLogo.version += 1;
            existingLogo.updatedAt = new Date();
            
            await existingLogo.save();

            return successResponseHelper(res, { 
                message: "Brand logo updated successfully", 
                data: existingLogo 
            });
        } else {
            // Create new brand logo if none exists
            const brandLogoData = {
                name: name || "Brand Logo",
                description,
                logo: {
                    url: uploadResult.url,
                    public_id: uploadResult.public_id,
                    width: uploadResult.width,
                    height: uploadResult.height,
                    format: uploadResult.format,
                    bytes: uploadResult.bytes
                },
                uploadedBy: adminId,
                version: 1
            };

            const brandLogo = await BrandLogo.create(brandLogoData);

            return successResponseHelper(res, { 
                message: "Brand logo uploaded successfully", 
                data: brandLogo 
            });
        }
    } catch (error) {
        console.error('Upload brand logo error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get current brand logo (public endpoint)
const getBrandLogo = async (req, res) => {
    try {
        const brandLogo = await BrandLogo.findOne()
            .select('name description logo version createdAt')
            .sort({ createdAt: -1 });

        if (!brandLogo) {
            return errorResponseHelper(res, { 
                message: "No brand logo found", 
                code: '00404' 
            });
        }

        return successResponseHelper(res, { 
            message: "Brand logo retrieved successfully", 
            data: brandLogo 
        });
    } catch (error) {
        console.error('Get brand logo error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Delete brand logo
const deleteBrandLogo = async (req, res) => {
    try {
        const brandLogo = await BrandLogo.findOne();

        if (!brandLogo) {
            return errorResponseHelper(res, { 
                message: "No brand logo found to delete", 
                code: '00404' 
            });
        }

        // Delete from Cloudinary
        if (brandLogo.logo.public_id) {
            try {
                await deleteFile(brandLogo.logo.public_id);
            } catch (deleteError) {
                console.error('Error deleting logo from Cloudinary:', deleteError);
            }
        }

        await BrandLogo.findByIdAndDelete(brandLogo._id);

        return successResponseHelper(res, { 
            message: "Brand logo deleted successfully" 
        });
    } catch (error) {
        console.error('Delete brand logo error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

export {
    uploadBrandLogo,
    getBrandLogo,
    deleteBrandLogo
};
