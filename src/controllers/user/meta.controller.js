import { errorResponseHelper, successResponseHelper } from '../../helpers/utilityHelper.js';
import Metadata from '../../models/admin/metadata.js';

// Get metadata by page URL
export const getMetadataByUrl = async (req, res) => {
  try {
    const { url } = req.query;   // ✅ will now receive "?url=/home"
    console.log(url, "@url");

    const metadata = await Metadata.findOne({
      pageUrl: url,
      status: "active",
    });

    if (!metadata) {
      return errorResponseHelper(res, {
        message: "Metadata not found for this URL",
        code: "00404",
      });
    }

    return successResponseHelper(res, {
      message: "Metadata retrieved successfully",
      data: metadata,
    });
  } catch (error) {
    console.error("Get metadata by URL error:", error);
    return errorResponseHelper(res, {
      message: "Failed to retrieve metadata",
      code: "00500",
    });
  }
};

