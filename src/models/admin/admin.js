import mongoose from "mongoose";
const { Schema, model } = mongoose;

const adminSchema = new Schema({
    firstName: { type: String },
    lastName: { type: String },
    email: { type: String },
    password: { type: String, select: false },
    phoneNumber: { type: String }, // Changed from 'phone' to 'phoneNumber'
    profilePhoto: {
        avatar: { url: String, key: String },
        image: { url: String, key: String },
    },
    address: { type: String },
    country: { type: String },
    state: { type: String },
    zip: { type: String },
    notificationSettings: {
        showNotifications: { type: Boolean, default: false },
    },
    notificationTokens: [
        { deviceType: { type: String }, token: { type: String } },
    ],
    courseNeedToSync: { type: Boolean, default: false },
},
    {
        timestamps: true,
    }
)


const Admin = model("Admin", adminSchema);
export default Admin;
