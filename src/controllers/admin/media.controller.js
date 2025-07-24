import Media from '../../models/admin/media.js';
import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import { deleteFile, uploadImageWithThumbnail, uploadVideo } from '../../helpers/cloudinaryHelper.js';

// Create a new media item with file upload
const createMedia = async (req, res) => {
    try {
        const { title, type, altText, published = true } = req.body;

        if (!title || !type) {
            return errorResponseHelper(res, { 
                message: "Title and type are required", 
                code: '00400' 
            });
        }

        if (!req.file) {
            return errorResponseHelper(res, { 
                message: "File is required", 
                code: '00400' 
            });
        }

        let uploadResult;
        let mediaData = {
            title,
            type,
            altText,
            published,
            uploaderModel: 'Admin'
        };

        // Upload to Cloudinary based on file type
        if (type === 'video') {
            try {
                uploadResult = await uploadVideo(req.file.buffer, 'business-app/media/videos');
                mediaData.file = {
                    url: uploadResult.url,
                    public_id: uploadResult.public_id,
                    duration: uploadResult.duration,
                    format: uploadResult.format,
                    bytes: uploadResult.bytes
                };
            } catch (uploadError) {
                console.error('Video upload error:', uploadError);
                return errorResponseHelper(res, { 
                    message: 'Failed to upload video file', 
                    code: '00500' 
                });
            }
        } else if (type === 'image') {
            try {
                uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/media/images');
                mediaData.file = {
                    url: uploadResult.original.url,
                    public_id: uploadResult.original.public_id,
                    width: uploadResult.original.width,
                    height: uploadResult.original.height,
                    format: uploadResult.original.format,
                    bytes: uploadResult.original.bytes
                };
                mediaData.thumbnail = {
                    url: uploadResult.thumbnail.url,
                    public_id: uploadResult.thumbnail.public_id,
                    width: uploadResult.thumbnail.width,
                    height: uploadResult.thumbnail.height
                };
            } catch (uploadError) {
                console.error('Image upload error:', uploadError);
                return errorResponseHelper(res, { 
                    message: 'Failed to upload image file', 
                    code: '00500' 
                });
            }
        } else {
            return errorResponseHelper(res, { 
                message: "Unsupported file type", 
                code: '00400' 
            });
        }

        const media = await Media.create(mediaData);

        return successResponseHelper(res, { 
            message: "Media created successfully", 
            data: media 
        });
    } catch (error) {
        console.error('Create media error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get all media items with pagination and filtering
const getAllMedia = async (req, res) => {
    try {
        const { page = 1, limit = 12, type, search, published } = req.query;
        
        const query = {};
        
        if (type) query.type = type;
        if (published !== undefined) query.published = published === 'true';
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { altText: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const media = await Media.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Media.countDocuments(query);

        return successResponseHelper(res, {
            message: "Media retrieved successfully",
            data: media,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get media error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get a single media item by ID
const getMediaById = async (req, res) => {
    try {
        const { id } = req.params;

        const media = await Media.findById(id);

        if (!media) {
            return errorResponseHelper(res, { message: "Media not found", code: '00404' });
        }

        return successResponseHelper(res, { message: "Media retrieved successfully", data: media });
    } catch (error) {
        console.error('Get media error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Update a media item with optional file upload
const updateMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, type, altText, published } = req.body;

        const media = await Media.findById(id);

        if (!media) {
            return errorResponseHelper(res, { message: "Media not found", code: '00404' });
        }

        // Update basic fields if provided
        if (title !== undefined) media.title = title;
        if (altText !== undefined) media.altText = altText;
        if (published !== undefined) media.published = published;

        // Handle file upload if new file is provided
        if (req.file) {
            // Delete old files from Cloudinary
            if (media.file && media.file.public_id) {
                try {
                    await deleteFile(media.file.public_id, media.type);
                } catch (deleteError) {
                    console.error('Error deleting old file from Cloudinary:', deleteError);
                }
            }

            if (media.thumbnail && media.thumbnail.public_id) {
                try {
                    await deleteFile(media.thumbnail.public_id, 'image');
                } catch (deleteError) {
                    console.error('Error deleting old thumbnail from Cloudinary:', deleteError);
                }
            }

            // Upload new file to Cloudinary
            if (type === 'video' || media.type === 'video') {
                try {
                    const uploadResult = await uploadVideo(req.file.buffer, 'business-app/media/videos');
                    media.file = {
                        url: uploadResult.url,
                        public_id: uploadResult.public_id,
                        duration: uploadResult.duration,
                        format: uploadResult.format,
                        bytes: uploadResult.bytes
                    };
                    media.thumbnail = null; // Videos don't have thumbnails
                } catch (uploadError) {
                    console.error('Video upload error:', uploadError);
                    return errorResponseHelper(res, { 
                        message: 'Failed to upload video file', 
                        code: '00500' 
                    });
                }
            } else if (type === 'image' || media.type === 'image') {
                try {
                    const uploadResult = await uploadImageWithThumbnail(req.file.buffer, 'business-app/media/images');
                    media.file = {
                        url: uploadResult.original.url,
                        public_id: uploadResult.original.public_id,
                        width: uploadResult.original.width,
                        height: uploadResult.original.height,
                        format: uploadResult.original.format,
                        bytes: uploadResult.original.bytes
                    };
                    media.thumbnail = {
                        url: uploadResult.thumbnail.url,
                        public_id: uploadResult.thumbnail.public_id,
                        width: uploadResult.thumbnail.width,
                        height: uploadResult.thumbnail.height
                    };
                } catch (uploadError) {
                    console.error('Image upload error:', uploadError);
                    return errorResponseHelper(res, { 
                        message: 'Failed to upload image file', 
                        code: '00500' 
                    });
                }
            } else {
                return errorResponseHelper(res, { 
                    message: "Unsupported file type", 
                    code: '00400' 
                });
            }
        }

        await media.save();

        return successResponseHelper(res, { message: "Media updated successfully", data: media });
    } catch (error) {
        console.error('Update media error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Delete a media item
const deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;

        const media = await Media.findById(id);

        if (!media) {
            return errorResponseHelper(res, { message: "Media not found", code: '00404' });
        }

        // Delete from Cloudinary if public_id exists
        if (media.file && media.file.public_id) {
            try {
                await deleteFile(media.file.public_id, media.type);
            } catch (deleteError) {
                console.error('Error deleting from Cloudinary:', deleteError);
                // Continue with deletion even if Cloudinary deletion fails
            }
        }

        if (media.thumbnail && media.thumbnail.public_id) {
            try {
                await deleteFile(media.thumbnail.public_id, 'image');
            } catch (deleteError) {
                console.error('Error deleting thumbnail from Cloudinary:', deleteError);
            }
        }

        await Media.findByIdAndDelete(id);

        return successResponseHelper(res, { message: "Media deleted successfully" });
    } catch (error) {
        console.error('Delete media error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Bulk delete media items
const bulkDeleteMedia = async (req, res) => {
    try {
        const { mediaIds } = req.body;

        if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
            return errorResponseHelper(res, { message: "Media IDs array is required", code: '00400' });
        }

        const mediaItems = await Media.find({ _id: { $in: mediaIds } });

        // Delete from Cloudinary
        for (const media of mediaItems) {
            if (media.file && media.file.public_id) {
                try {
                    await deleteFile(media.file.public_id, media.type);
                } catch (deleteError) {
                    console.error('Error deleting from Cloudinary:', deleteError);
                }
            }

            if (media.thumbnail && media.thumbnail.public_id) {
                try {
                    await deleteFile(media.thumbnail.public_id, 'image');
                } catch (deleteError) {
                    console.error('Error deleting thumbnail from Cloudinary:', deleteError);
                }
            }
        }

        const result = await Media.deleteMany({ _id: { $in: mediaIds } });

        return successResponseHelper(res, { 
            message: `Successfully deleted ${result.deletedCount} media item(s)`,
            data: { deletedCount: result.deletedCount }
        });
    } catch (error) {
        console.error('Bulk delete media error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Toggle media published status
const toggleMediaStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { published } = req.body;

        if (published === undefined) {
            return errorResponseHelper(res, { message: "Published status is required", code: '00400' });
        }

        const media = await Media.findById(id);

        if (!media) {
            return errorResponseHelper(res, { message: "Media not found", code: '00404' });
        }

        media.published = published;
        await media.save();

        return successResponseHelper(res, { 
            message: `Media ${published ? 'published' : 'unpublished'} successfully`, 
            data: media 
        });
    } catch (error) {
        console.error('Toggle media status error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Bulk upload media files
const bulkUploadMedia = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return errorResponseHelper(res, { message: "No files uploaded", code: '00400' });
        }

        const uploadedMedia = [];
        const errors = [];

        for (const file of req.files) {
            try {
                let uploadResult;
                let mediaData = {
                    title: file.originalname.split('.')[0], // Use filename as title
                    type: file.mimetype.startsWith('video/') ? 'video' : 'image',
                    altText: file.originalname,
                    published: true,
                    uploaderModel: 'Admin'
                };

                if (mediaData.type === 'video') {
                    uploadResult = await uploadVideo(file.buffer, 'business-app/media/videos');
                    mediaData.file = {
                        url: uploadResult.url,
                        public_id: uploadResult.public_id,
                        duration: uploadResult.duration,
                        format: uploadResult.format,
                        bytes: uploadResult.bytes
                    };
                } else {
                    uploadResult = await uploadImageWithThumbnail(file.buffer, 'business-app/media/images');
                    mediaData.file = {
                        url: uploadResult.original.url,
                        public_id: uploadResult.original.public_id,
                        width: uploadResult.original.width,
                        height: uploadResult.original.height,
                        format: uploadResult.original.format,
                        bytes: uploadResult.original.bytes
                    };
                    mediaData.thumbnail = {
                        url: uploadResult.thumbnail.url,
                        public_id: uploadResult.thumbnail.public_id,
                        width: uploadResult.thumbnail.width,
                        height: uploadResult.thumbnail.height
                    };
                }

                const media = await Media.create(mediaData);
                uploadedMedia.push(media);
            } catch (error) {
                console.error('Error uploading file:', file.originalname, error);
                errors.push({
                    filename: file.originalname,
                    error: error.message
                });
            }
        }

        return successResponseHelper(res, {
            message: `Successfully uploaded ${uploadedMedia.length} files${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
            data: {
                data: uploadedMedia,
                errors: errors
            }
        });
    } catch (error) {
        console.error('Bulk upload media error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

// Get media statistics
const getMediaStats = async (req, res) => {
    try {
        const totalMedia = await Media.countDocuments();
        const publishedMedia = await Media.countDocuments({ published: true });
        const unpublishedMedia = await Media.countDocuments({ published: false });
        
        const typeStats = await Media.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        const recentMedia = await Media.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title type published createdAt');

        const stats = {
            total: totalMedia,
            published: publishedMedia,
            unpublished: unpublishedMedia,
            typeStats,
            recentMedia
        };

        return successResponseHelper(res, { message: "Media statistics retrieved successfully", data: stats });
    } catch (error) {
        console.error('Get media stats error:', error);
        return errorResponseHelper(res, { message: 'Internal server error', code: '00500' });
    }
};

export {
    createMedia,
    getAllMedia,
    getMediaById,
    updateMedia,
    deleteMedia,
    bulkDeleteMedia,
    bulkUploadMedia,
    toggleMediaStatus,
    getMediaStats
}; 