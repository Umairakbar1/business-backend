import mongoose from "mongoose";
const { Schema, model } = mongoose;

const adminSchema = new Schema({
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    password: { type: String, select: false },
    profilePhoto: {
        avatar: { url: String, key: String },
        image: { url: String, key: String },
    },
    notificationSettings: {
        showNotifications: { type: Boolean, default: false },
    },
    notificationTokens: [
        { deviceType: { type: String }, token: { type: String } },
    ],
    courseNeedToSync: { type: Boolean, default: false },
    phone: { type: String },
    address: { type: String },
    country: { type: String },
    state: { type: String },
    zip: { type: String },
},
    {
        timestamps: true,
    }
)


const Admin = model("Admin", adminSchema);
export default Admin;
