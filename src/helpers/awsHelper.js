import aws from "aws-sdk";
import sharp from "sharp";
import { GLOBAL_ENUMS, GLOBAL_ENV } from "../config/globalConfig.js";

const s3 = new aws.S3({
  accessKeyId: GLOBAL_ENV.awsAccessKey,
  secretAccessKey: GLOBAL_ENV.awsSecretKey,
  signatureVersion: GLOBAL_ENV.awsSignatureVersion,
  region: GLOBAL_ENV.awsRegion,
  Bucket: GLOBAL_ENV.bucketName,
});

const getSignedUrl = (key) =>
  s3.getSignedUrl("getObject", {
    Bucket: GLOBAL_ENV.bucketName,
    Key: key,
    Expires: 7200, //seconds
  });

const getAvatarImage = (key) => {
  return new Promise(async (resolve, reject) => {
    let image = s3
      .getObject({
        Bucket: GLOBAL_ENV.bucketName,
        Key: key,
      })
      .promise();

    const compressedImageBuffer = await sharp((await image).Body)
      .resize({
        width: 50,
        height: 50,
        fit: "cover",
      })
      .toBuffer();

    let splitted = `${key}`.split("-");

    const uploadParams = {
      ACL: "public-read",
      Body: compressedImageBuffer,
      Bucket: GLOBAL_ENV.bucketName,
      Key: `${splitted[0]}-${Date.now()}` + ".png",
    };

    s3.upload(uploadParams, (err, avatar) => {
      if (err) {
        reject({ message: "Internal Server Error" });
      } else {
        resolve(avatar);
      }
    });
  });
};

const deleteS3File = (allKeysToDelete) => {
  let doNotDeleteKeys = GLOBAL_ENUMS.doNotDeleteKeys;
  let filteredKeysToDelete = allKeysToDelete
    .filter((item) => !doNotDeleteKeys.includes(item))
    .map((item) => ({ Key: item }));

  let params = {
    Bucket: GLOBAL_ENV.bucketName,
    Delete: {
      Objects: filteredKeysToDelete,
      Quiet: false,
    },
  };
  s3.deleteObjects(params, function (err, data) {
    console.log({ err, data });
  });
};

export { getAvatarImage, deleteS3File, getSignedUrl };
