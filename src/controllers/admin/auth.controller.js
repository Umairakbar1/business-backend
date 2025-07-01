import { GLOBAL_ENUMS, GLOBAL_MESSAGES } from "../../config/globalConfig.js";
import { signAccessTokenAdmin } from "../../helpers/jwtHelper.js";
import { asyncWrapper, errorResponseHelper, serverErrorHelper, successResponseHelper } from "../../helpers/utilityHelper.js";
import { AdminModal } from "../../models/index.js";


const createAdmin = async (req, res) => {
    const newUser = new AdminModal({
        profilePhoto: GLOBAL_ENUMS.defaultProfilePhoto,
        firstName: "Alex",
        lastName: "Andrew",
        email: "admin@gmail.com",
        password:"admin123"
    });
    const [data, error] = await asyncWrapper(() => newUser.save());
    if (error) return serverErrorHelper(req, res, 500, error);
    return successResponseHelper(res, {
        admin: data,
    });

}


const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    const [admin, error] = await asyncWrapper(() =>
        AdminModal.findOne({ email }).select("+password")
    );
    if (error) return serverErrorHelper(req, res, 500, error);
    if (!admin) return errorResponseHelper(res, GLOBAL_MESSAGES.emailNotFound);
    // const match = await compare(password, admin.password);
    if (password != admin.password) return errorResponseHelper(res, GLOBAL_MESSAGES.invalidCredentials);
    const accessToken = signAccessTokenAdmin(admin?._id);
    delete admin._doc.password; //remove password form returned object
    return successResponseHelper(res, {
        admin: admin._doc,
        token: accessToken,
    });
};

export {
    loginAdmin,
    createAdmin,
};