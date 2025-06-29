import mongoose from "mongoose";
import { GLOBAL_ENV } from "../config/globalConfig.js";

export default async () => {
  mongoose.set("strictQuery", false);
  await mongoose
    .connect(GLOBAL_ENV.dbUri, {})
    .then(() => {
      console.log("Mongodb Connection Success.");
    })
    .catch((err) => {
      console.log(err);
    });
};
