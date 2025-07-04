import mongooseLoader from "./moongoose.js";
import expressLoader from "./express.js";

export default async (app) => {
  await mongooseLoader();
  expressLoader(app);
};