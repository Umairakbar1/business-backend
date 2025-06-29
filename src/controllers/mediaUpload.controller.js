import { GLOBAL_MESSAGES, GLOBAL_ENV } from "../config/globalConfig.js";
import { getAvatarImage } from "../helpers/awsHelper.js";
import {
  asyncWrapper,
  errorResponseHelper,
  successResponseHelper,
} from "../helpers/utilityHelper.js";

const uploadSingleImage = async (req, res) => {
  if (!req.file)
    return errorResponseHelper(res, GLOBAL_MESSAGES.invalidRequest);

  const [data, error] = await asyncWrapper(() => getAvatarImage(req.file.key));
  if (error) return serverErrorHelper(req, res, 500, error);

  let response = {
    avatar: { key: data.key, url: data.Location },
    image: {
      key: req.file.key,
      url: req.file.location,
    },
  };

  return successResponseHelper(res, response);
};

const uploadSingleVideo = async (req, res) => {
  if (!req.file)
    return errorResponseHelper(res, GLOBAL_MESSAGES.invalidRequest);
  let response = {
    video: {
      key: req.file.key,
      url: req.file.location,
    },
  };

  return successResponseHelper(res, response);
};


const uploadImagesVideos = async (req, res) => {
  if (req.files && req.files?.length > 0) {
    const requestFiles = req.files;
    const videos = [];
    const images = [];
    const ImagesWithAvatar = [];

    for (const file of requestFiles) {
      if (file.mimetype.startsWith("video/")) {
        videos.push({
          video: { key: file.key, url: file.location },
          mediaType: "video",
        });
      } else if (file.mimetype.startsWith("image/")) {
        images.push(file);
      }
    }

    for (const image of images) {
      const [avatar, error] = await asyncWrapper(() =>
        getAvatarImage(image.key)
      );
      if (error) return serverErrorHelper(req, res, 500, error);
      ImagesWithAvatar.push({
        avatar: { key: avatar.key, url: avatar.Location },
        image: {
          key: image.key,
          url: image.location,
        },
        mediaType: "image",
      });
    }
    successResponseHelper(res, [...ImagesWithAvatar, ...videos]);
  } else {
    return errorResponseHelper(res, GLOBAL_MESSAGES.invalidRequest);
  }
};

export { uploadSingleImage, uploadSingleVideo, uploadImagesVideos };
