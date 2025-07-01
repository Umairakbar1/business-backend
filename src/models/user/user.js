import mongoose from "mongoose";
import { GLOBAL_ENUMS } from "../../config/globalConfig.js";
const { Schema, model } = mongoose;

const UserSchema = new Schema({
    name: { type: String, required: true },
    userName: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: GLOBAL_ENUMS.defaultProfilePhoto }, // URL to profile image
    lastVisit: { type: Date },
    visitCount: { type: Number, default: 0 },
    status: { type: String, enum: GLOBAL_ENUMS.userStatus, default: "Active" },
  }, {
    timestamps: true // adds createdAt and updatedAt
  });

  const User = model('User', UserSchema);
  export default User;