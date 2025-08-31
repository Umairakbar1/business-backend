import mongooseLoader from "./moongoose.js";
import expressLoader from "./express.js";
import ScheduledTasks from "../utils/scheduledTasks.js";

export default async (app) => {
  await mongooseLoader();
  expressLoader(app);
  
  // Initialize scheduled tasks
  ScheduledTasks.init();
};