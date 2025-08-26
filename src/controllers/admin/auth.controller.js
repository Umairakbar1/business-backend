import { GLOBAL_ENUMS, GLOBAL_MESSAGES } from "../../config/globalConfig.js";
import { signAccessTokenAdmin } from "../../helpers/jwtHelper.js";
import { asyncWrapper, errorResponseHelper, serverErrorHelper, successResponseHelper } from "../../helpers/utilityHelper.js";
import { Admin } from "../../models/index.js";
import { uploadImage, deleteFile } from "../../helpers/cloudinaryHelper.js";


const createAdmin = async (req, res) => {
    const newUser = new Admin({
        profilePhoto: {
            avatar: { url: GLOBAL_ENUMS.defaultProfilePhoto, key: "default-profile-photo" },
            image: { url: GLOBAL_ENUMS.defaultProfilePhoto, key: "default-profile-photo" }
        },
        firstName: "Alex",
        lastName: "Andrew",
        email: "admin@gmail.com",
        phoneNumber: "1234567890", // Changed from 'phone' to 'phoneNumber'
        password:"admin123"
    });
    const [data, error] = await asyncWrapper(() => newUser.save());
    if (error) return serverErrorHelper(req, res, 500, error);
    return successResponseHelper(res, {
        message: 'Admin created successfully',
        admin: data,
    });

}


const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    const [admin, error] = await asyncWrapper(() =>
        Admin.findOne({ email }).select("+password")
    );
    if (error) return serverErrorHelper(req, res, 500, error);
    if (!admin) return errorResponseHelper(res, { message: GLOBAL_MESSAGES.emailNotFound, code: '00404' });
    // const match = await compare(password, admin.password);
    if (password != admin.password) return errorResponseHelper(res, { message: GLOBAL_MESSAGES.invalidCredentials, code: '00400' });
    const accessToken = signAccessTokenAdmin(admin?._id);
    delete admin._doc.password; //remove password form returned object
    return successResponseHelper(res, {
        message: 'Login successful',
        admin: admin._doc,
        token: accessToken,
    });
};

const updateAdminProfile = async (req, res) => {
    try {
        console.log('=== ADMIN PROFILE UPDATE START ===');
        console.log('Request method:', req.method);
        console.log('Request URL:', req.url);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Content-Length:', req.headers['content-length']);
        console.log('Request body keys:', Object.keys(req.body || {}));
        console.log('Request body values:', req.body);
        console.log('Request file:', req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            fieldname: req.file.fieldname
        } : 'No file');
        console.log('User ID:', req.user?._id);
        console.log('Request completed middleware stack:', req.file ? 'File upload middleware completed' : 'No file upload middleware used');
        
        // Check if we had partial data recovery
        if (req.partialDataRecovery) {
            console.log('⚠️ Partial data recovery mode - file upload failed but text fields recovered');
            console.log('⚠️ Proceeding with profile update without image upload');
        }
        
        // Check if we're using raw body fallback
        if (req.rawBodyFallback) {
            console.log('⚠️ Raw body fallback mode - using alternative parsing method');
            console.log('⚠️ File upload will be skipped, text fields may be limited');
        }

        const adminId = req.user._id;

        // Check if adminId exists
        if (!adminId) {
            console.log('❌ Admin ID not found in request');
            return errorResponseHelper(res, {
                message: 'Admin ID not found in request',
                code: '00400'
            });
        }

        // Validate request body exists
        if (!req.body || typeof req.body !== 'object') {
            console.log('❌ Invalid request body:', req.body);
            return errorResponseHelper(res, {
                message: 'Invalid request body',
                code: '00400'
            });
        }

        // Parse form data safely
        const { firstName, lastName, email, phoneNumber, address, country, state, zip, removeProfilePhoto } = req.body;
        console.log('Parsed form data:', { firstName, lastName, email, phoneNumber, address, country, state, zip, removeProfilePhoto });

        // Get current admin data to check existing profile photo
        const [currentAdmin, currentError] = await asyncWrapper(() =>
            Admin.findById(adminId)
        );
        if (currentError) {
            console.log('❌ Error finding admin:', currentError);
            return serverErrorHelper(req, res, 500, currentError);
        }
        if (!currentAdmin) {
            console.log('❌ Admin not found');
            return errorResponseHelper(req, res, { message: 'Admin not found', code: '00404' });
        }

        // Prepare update data
        const updateData = {};

        // Only add fields that are provided and not empty strings
        if (firstName !== undefined && firstName !== '') updateData.firstName = firstName;
        if (lastName !== undefined && lastName !== '') updateData.lastName = lastName;
        if (email !== undefined && email !== '') {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return errorResponseHelper(res, { 
                    message: 'Please enter a valid email address', 
                    code: '00400' 
                });
            }
            
            // Check if email is already taken by another admin
            const existingAdmin = await Admin.findOne({ 
                email: email,
                _id: { $ne: adminId }
            });
            
            if (existingAdmin) {
                return errorResponseHelper(res, { 
                    message: 'Email is already taken by another admin', 
                    code: '00409' 
                });
            }
            
            updateData.email = email;
        }
        if (phoneNumber !== undefined && phoneNumber !== '') updateData.phoneNumber = phoneNumber;
        if (address !== undefined && address !== '') updateData.address = address;
        if (country !== undefined && country !== '') updateData.country = country;
        if (state !== undefined && state !== '') updateData.state = state;
        if (zip !== undefined && zip !== '') updateData.zip = zip;

        console.log('Fields to update:', updateData);
        console.log('Current admin data before update:', {
            firstName: currentAdmin.firstName,
            lastName: currentAdmin.lastName,
            email: currentAdmin.email,
            phoneNumber: currentAdmin.phoneNumber,
            profilePhoto: currentAdmin.profilePhoto,
            address: currentAdmin.address,
            country: currentAdmin.country,
            state: currentAdmin.state,
            zip: currentAdmin.zip
        });

        // Handle profile photo logic
        if (removeProfilePhoto === 'true' || removeProfilePhoto === true) {
            console.log('🖼️ Removing profile photo');
            // Remove profile photo - delete from Cloudinary if exists
            if (currentAdmin.profilePhoto && currentAdmin.profilePhoto.image && currentAdmin.profilePhoto.image.key) {
                try {
                    await deleteFile(currentAdmin.profilePhoto.image.key, 'image');
                    console.log('✅ Old profile photo deleted from Cloudinary:', currentAdmin.profilePhoto.image.key);
                } catch (deleteError) {
                    console.error('❌ Failed to delete old profile photo from Cloudinary:', deleteError);
                    // Continue with update even if deletion fails
                }
            }

            // Set to default profile photo
            updateData.profilePhoto = {
                avatar: { url: GLOBAL_ENUMS.defaultProfilePhoto, key: "default-profile-photo" },
                image: { url: GLOBAL_ENUMS.defaultProfilePhoto, key: "default-profile-photo" }
            };
        } else if (req.file) {
            console.log('🖼️ Processing uploaded file:', req.file.originalname);

            // Validate file type and size
            if (!req.file.mimetype.startsWith('image/')) {
                console.log('❌ Invalid file type:', req.file.mimetype);
                return errorResponseHelper(res, {
                    message: 'Invalid file type. Only image files are allowed.',
                    code: '00400'
                });
            }

            // Check file size (5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (req.file.size > maxSize) {
                console.log('❌ File too large:', req.file.size, 'bytes');
                return errorResponseHelper(res, {
                    message: 'File too large. Maximum size is 5MB.',
                    code: '00400'
                });
            }

            // New profile photo uploaded
            try {
                console.log('☁️ Uploading to Cloudinary...');
                // Upload new image to Cloudinary
                const uploadResult = await uploadImage(req.file.buffer, 'business-app/admin-profiles');

                // Delete old profile photo from Cloudinary if exists
                if (currentAdmin.profilePhoto && currentAdmin.profilePhoto.image && currentAdmin.profilePhoto.image.key && currentAdmin.profilePhoto.image.key !== "default-profile-photo") {
                    try {
                        await deleteFile(currentAdmin.profilePhoto.image.key, 'image');
                        console.log('✅ Old profile photo deleted from Cloudinary:', currentAdmin.profilePhoto.image.key);
                    } catch (deleteError) {
                        console.error('❌ Failed to delete old profile photo from Cloudinary:', deleteError);
                        // Continue with update even if deletion fails
                    }
                }

                // Update profile photo data
                updateData.profilePhoto = {
                    avatar: { url: uploadResult.url, key: uploadResult.public_id },
                    image: { url: uploadResult.url, key: uploadResult.public_id }
                };

                console.log('✅ New profile photo uploaded to Cloudinary:', uploadResult.public_id);
                console.log('✅ Profile photo data set:', updateData.profilePhoto);
            } catch (uploadError) {
                console.error('❌ Profile photo upload failed:', uploadError);
                return errorResponseHelper(res, {
                    message: 'Failed to upload profile photo: ' + uploadError.message,
                    code: '00400'
                });
            }
        } else {
            console.log('ℹ️ No file uploaded and no photo removal requested');
            console.log('ℹ️ Keeping existing profile photo');
            
            // Keep existing profile photo if no changes
            if (currentAdmin.profilePhoto && currentAdmin.profilePhoto.avatar && currentAdmin.profilePhoto.avatar.url) {
                updateData.profilePhoto = currentAdmin.profilePhoto;
                console.log('✅ Keeping existing profile photo:', currentAdmin.profilePhoto);
            } else {
                // If no existing profile photo, set default
                console.log('⚠️ No existing profile photo found, setting default');
                updateData.profilePhoto = {
                    avatar: { url: GLOBAL_ENUMS.defaultProfilePhoto, key: "default-profile-photo" },
                    image: { url: GLOBAL_ENUMS.defaultProfilePhoto, key: "default-profile-photo" }
                };
            }
        }

        // Check if there's anything to update
        if (Object.keys(updateData).length === 0) {
            console.log('❌ No data provided for update');
            return errorResponseHelper(res, {
                message: 'No data provided for update',
                code: '00400'
            });
        }

        // Validate profile photo data structure if it's being updated
        if (updateData.profilePhoto) {
            // Check if profile photo has the required structure
            if (!updateData.profilePhoto.avatar || typeof updateData.profilePhoto.avatar !== 'object') {
                console.log('❌ Invalid profile photo avatar structure:', updateData.profilePhoto.avatar);
                return errorResponseHelper(res, {
                    message: 'Invalid profile photo data structure',
                    code: '00400'
                });
            }
            
            if (!updateData.profilePhoto.image || typeof updateData.profilePhoto.image !== 'object') {
                console.log('❌ Invalid profile photo image structure:', updateData.profilePhoto.image);
                return errorResponseHelper(res, {
                    message: 'Invalid profile photo data structure',
                    code: '00400'
                });
            }
            
            // Check if URLs and keys are present and valid
            if (!updateData.profilePhoto.avatar.url || !updateData.profilePhoto.avatar.key) {
                console.log('❌ Missing avatar URL or key:', updateData.profilePhoto.avatar);
                return errorResponseHelper(res, {
                    message: 'Invalid profile photo avatar data',
                    code: '00400'
                });
            }
            
            if (!updateData.profilePhoto.image.url || !updateData.profilePhoto.image.key) {
                console.log('❌ Missing image URL or key:', updateData.profilePhoto.image);
                return errorResponseHelper(res, {
                    message: 'Invalid profile photo image data',
                    code: '00400'
                });
            }
            
            console.log('✅ Profile photo data validated:', updateData.profilePhoto);
        }

        console.log('📝 Updating admin profile with:', updateData);

        // Update admin profile
        const [admin, error] = await asyncWrapper(() =>
            Admin.findByIdAndUpdate(
                adminId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-__v') // Exclude version key but include all other fields
        );

        if (error) {
            console.log('❌ Database update error:', error);
            return serverErrorHelper(req, res, 500, error);
        }
        if (!admin) {
            console.log('❌ Admin not found after update');
            return errorResponseHelper(req, res, { message: 'Admin not found', code: '00404' });
        }

        console.log('✅ Admin profile updated successfully');
        console.log('✅ Updated admin data:', {
            _id: admin._id,
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
            phoneNumber: admin.phoneNumber,
            profilePhoto: admin.profilePhoto,
            address: admin.address,
            country: admin.country,
            state: admin.state,
            zip: admin.zip
        });
        console.log('=== ADMIN PROFILE UPDATE END ===');

        return successResponseHelper(res, {
            message: 'Admin profile updated successfully',
            admin: {
                _id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                phoneNumber: admin.phoneNumber,
                profilePhoto: admin.profilePhoto,
                address: admin.address,
                country: admin.country,
                state: admin.state,
                zip: admin.zip,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt
            }
        });

    } catch (error) {
        console.error('❌ Update admin profile error:', error);

        // Handle specific multipart errors
        if (error.message && error.message.includes('Unexpected end of form')) {
            return errorResponseHelper(res, {
                message: 'Invalid form data. Please check your request format.',
                code: '00400'
            });
        }

        return serverErrorHelper(req, res, 500, error);
    }
};

const updateAdminPassword = async (req, res) => {
    const adminId = req.user._id; // assuming req.user is set by auth middleware
    const { currentPassword, newPassword } = req.body;
    const [admin, error] = await asyncWrapper(() =>
        Admin.findById(adminId).select("+password")
    );
    if (error) return serverErrorHelper(req, res, 500, error);
    if (!admin) return errorResponseHelper(res, { message: 'Admin not found', code: '00404' });
    if (admin.password !== currentPassword) {
        return errorResponseHelper(res, { message: 'Current password is incorrect', code: '00400' });
    }
    admin.password = newPassword;
    const [updatedAdmin, saveError] = await asyncWrapper(() => admin.save());
    if (saveError) return serverErrorHelper(req, res, 500, saveError);
    return successResponseHelper(res, { message: "Password updated successfully" });
};

/**
 * Helper function to clean up admin profile photo from Cloudinary
 * @param {Object} profilePhoto - The profile photo object from admin document
 */
const cleanupAdminProfilePhoto = async (profilePhoto) => {
    if (profilePhoto && profilePhoto.image && profilePhoto.image.key) {
        try {
            await deleteFile(profilePhoto.image.key, 'image');
            console.log('Admin profile photo cleaned up from Cloudinary:', profilePhoto.image.key);
            return true;
        } catch (error) {
            console.error('Failed to cleanup admin profile photo from Cloudinary:', error);
            return false;
        }
    }
    return true; // No photo to clean up
};

export {
    loginAdmin,
    createAdmin,
    updateAdminProfile,
    updateAdminPassword,
    cleanupAdminProfilePhoto,
};