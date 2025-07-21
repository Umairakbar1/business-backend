import { GLOBAL_MESSAGES, GLOBAL_ENV } from "../config/globalConfig.js";
import { 
  uploadImage, 
  uploadVideo, 
  uploadImageWithThumbnail 
} from "../helpers/cloudinaryHelper.js";
import {
  asyncWrapper,
  errorResponseHelper,
  successResponseHelper,
} from "../helpers/utilityHelper.js";

const uploadSingleImage = async (req, res) => {
  if (!req.file)
    return errorResponseHelper(res, GLOBAL_MESSAGES.invalidRequest);

  try {
    const [result, error] = await asyncWrapper(() => 
      uploadImageWithThumbnail(req.file.buffer, 'business-app/images')
    );
    
    if (error) return errorResponseHelper(res, { message: error.message });

    let response = {
      original: {
        public_id: result.original.public_id,
        url: result.original.url,
        width: result.original.width,
        height: result.original.height
      },
      thumbnail: {
        public_id: result.thumbnail.public_id,
        url: result.thumbnail.url,
        width: result.thumbnail.width,
        height: result.thumbnail.height
      }
    };

    return successResponseHelper(res, response);
  } catch (error) {
    return errorResponseHelper(res, { message: error.message });
  }
};

const uploadSingleVideo = async (req, res) => {
  if (!req.file)
    return errorResponseHelper(res, GLOBAL_MESSAGES.invalidRequest);

  try {
    const [result, error] = await asyncWrapper(() => 
      uploadVideo(req.file.buffer, 'business-app/videos')
    );
    
    if (error) return errorResponseHelper(res, { message: error.message });

    let response = {
      video: {
        public_id: result.public_id,
        url: result.url,
        duration: result.duration,
        format: result.format,
        bytes: result.bytes
      },
    };

    return successResponseHelper(res, response);
  } catch (error) {
    return errorResponseHelper(res, { message: error.message });
  }
};

const uploadImagesVideos = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return errorResponseHelper(res, { message: 'No files uploaded' });
  }

  const requestFiles = req.files;
  const videos = [];
  const images = [];

  try {
    for (const file of requestFiles) {
      if (file.mimetype.startsWith("video/")) {
        const [videoResult, videoError] = await asyncWrapper(() =>
          uploadVideo(file.buffer, 'business-app/videos')
        );
        
        if (videoError) {
          console.error('Video upload error:', videoError);
          continue;
        }
        
        videos.push({
          video: {
            public_id: videoResult.public_id,
            url: videoResult.url,
            duration: videoResult.duration,
            format: videoResult.format,
            bytes: videoResult.bytes
          },
          mediaType: "video",
        });
      } else if (file.mimetype.startsWith("image/")) {
        const [imageResult, imageError] = await asyncWrapper(() =>
          uploadImageWithThumbnail(file.buffer, 'business-app/images')
        );
        
        if (imageError) {
          console.error('Image upload error:', imageError);
          continue;
        }
        
        images.push({
          original: {
            public_id: imageResult.original.public_id,
            url: imageResult.original.url,
            width: imageResult.original.width,
            height: imageResult.original.height
          },
          thumbnail: {
            public_id: imageResult.thumbnail.public_id,
            url: imageResult.thumbnail.url,
            width: imageResult.thumbnail.width,
            height: imageResult.thumbnail.height
          },
          mediaType: "image",
        });
      }
    }
    
    const allMedia = [...images, ...videos];
    return successResponseHelper(res, allMedia);
  } catch (error) {
    return errorResponseHelper(res, { message: error.message });
  }
};

export {
  uploadSingleImage,
  uploadSingleVideo,
  uploadImagesVideos
};
