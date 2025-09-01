import GLOBAL_ENV from "./envConfig.js";
import GLOBAL_MESSAGES from "./global-messages.js"
const GLOBAL_ENUMS = {
  defaultProfilePhoto: "https://res.cloudinary.com/dxxrz7b4y/image/upload/v1724560800/default-profile-photo.png",
  userStatus: ["active", "inactive", "blocked", "pending"],
  features: {
    QUERY: "query",
    REVIEW: "review",
    EMBEDDED: "embedded",
    BOOST: "boost",
  }
};

export {
  GLOBAL_ENV,
  GLOBAL_ENUMS,
  GLOBAL_MESSAGES
};
