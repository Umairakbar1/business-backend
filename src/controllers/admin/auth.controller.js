import { GLOBAL_ENUMS, GLOBAL_MESSAGES } from "../../config/globalConfig.js";
import { signAccessTokenAdmin } from "../../helpers/jwtHelper.js";
import { asyncWrapper, errorResponseHelper, serverErrorHelper, successResponseHelper } from "../../helpers/utilityHelper.js";
import { Admin } from "../../models/index.js";


const createAdmin = async (req, res) => {
    const newUser = new Admin({
        profilePhoto: GLOBAL_ENUMS.defaultProfilePhoto,
        firstName: "Alex",
        lastName: "Andrew",
        email: "admin@gmail.com",
        password:"admin123"
    });
    const [data, error] = await asyncWrapper(() => newUser.save());
    if (error) return serverErrorHelper(req, res, 500, error);
    return successResponseHelper(res, {
        message: 'Admin created successfully',
        admin: data,
    });

}


const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    const [admin, error] = await asyncWrapper(() =>
        Admin.findOne({ email }).select("+password")
    );
    if (error) return serverErrorHelper(req, res, 500, error);
    if (!admin) return errorResponseHelper(res, { message: GLOBAL_MESSAGES.emailNotFound, code: '00404' });
    // const match = await compare(password, admin.password);
    if (password != admin.password) return errorResponseHelper(res, { message: GLOBAL_MESSAGES.invalidCredentials, code: '00400' });
    const accessToken = signAccessTokenAdmin(admin?._id);
    delete admin._doc.password; //remove password form returned object
    return successResponseHelper(res, {
        message: 'Login successful',
        admin: admin._doc,
        token: accessToken,
    });
};

const updateAdminProfile = async (req, res) => {
    const adminId = req.user._id; // assuming req.user is set by auth middleware
    const { firstName, lastName, phone, address, country, state, zip } = req.body;
    const [admin, error] = await asyncWrapper(() =>
        Admin.findByIdAndUpdate(
            adminId,
            { $set: { firstName, lastName, phone, address, country, state, zip } },
            { new: true }
        )
    );
    if (error) return serverErrorHelper(req, res, 500, error);
    if (!admin) return errorResponseHelper(res, { message: 'Admin not found', code: '00404' });
    return successResponseHelper(res, { 
        message: 'Admin profile updated successfully',
        admin 
    });
};

const updateAdminPassword = async (req, res) => {
    const adminId = req.user._id; // assuming req.user is set by auth middleware
    const { currentPassword, newPassword } = req.body;
    const [admin, error] = await asyncWrapper(() =>
        Admin.findById(adminId).select("+password")
    );
    if (error) return serverErrorHelper(req, res, 500, error);
    if (!admin) return errorResponseHelper(res, { message: 'Admin not found', code: '00404' });
    if (admin.password !== currentPassword) {
        return errorResponseHelper(res, { message: 'Current password is incorrect', code: '00400' });
    }
    admin.password = newPassword;
    const [updatedAdmin, saveError] = await asyncWrapper(() => admin.save());
    if (saveError) return serverErrorHelper(req, res, 500, saveError);
    return successResponseHelper(res, { message: "Password updated successfully" });
};

export {
    loginAdmin,
    createAdmin,
    updateAdminProfile,
    updateAdminPassword,
};