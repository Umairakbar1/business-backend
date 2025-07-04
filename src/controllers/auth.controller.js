import { CourseModal, OrdersModal, PersonalQuestionContentModal, UserModal } from "../../models/index.js";
import { GLOBAL_ENUMS, GLOBAL_MESSAGES } from "../config/globalConfig.js";
import {
  serverErrorHelper,
  asyncWrapper,
  errorResponseHelper,
  successResponseHelper,
  generateTimeOut,
  generateOTP,
  generateOtpHash,
  // getUniqueUserName,
} from "../../helpers/utilityHelper.js";
import { signAccessToken } from "../../helpers/jwtHelper.js";
import { twilioSendOtp, twilioVerifyOtp } from "../../helpers/twilioHelper.js";
import bcrypt from "bcryptjs"
import { sendEmail, sendFailedAssessmentEmailToAdmin } from "../../helpers/sendGridHelper.js";
import globalEnums from "../../config/global-enums.js";
import { createCourseForIntentForPreCreatedAccount, createNewCustomer } from "../../services/user.service.js";
import { createStripePaymentIntent } from "../../helpers/stripeHelper.js";



const sendOtp = async (req, res) => {
  const { phoneNumber } = req.body;
  const [data, error1] = await asyncWrapper(() => twilioSendOtp(phoneNumber));
  if (error1) return errorResponseHelper(res, error1);
  return successResponseHelper(res, GLOBAL_MESSAGES.otpSent);
};

const preAccountCreation = async (req, res) => {
  const { phoneNumber, firstName, lastName, courseContentId } = req.body;

  const [userData, userDataError] = await asyncWrapper(() =>
    UserModal.findOne({ phoneNumber })
  );
  if (userDataError) return serverErrorHelper(req, res, 500, userDataError);

  if (userData) {
    if (userData.accountStatus == GLOBAL_ENUMS.accountStatus.BLOCKED) {
      return errorResponseHelper(res, { message: "Access restricted by administrator. Please contact support for assistance." })
    }
    else {
      let customerId = userData.paymentDetails?.customerId
      if (!userData.paymentDetails?.customerId) {
        const [customer_id, customerError] = await asyncWrapper(() => createNewCustomer(userData))
        customerId = customer_id
        if (customerError) return serverErrorHelper(req, res, 500, customerError);
      }
      const [existCourse, existCourseError] = await asyncWrapper(() => CourseModal.findOne({ user: userData?._id, courseContentId, paymentStatus: GLOBAL_ENUMS.purchaseStatus.PURCHASED }));
      console.log(existCourse, "existCourse", courseContentId)

      if (existCourseError) return serverErrorHelper(req, res, 500, existCourseError);
      if (existCourse) return errorResponseHelper(res, { message: 'Course Already Purchased.' });
      const [createCourseData, error1] = await asyncWrapper(() =>
        createCourseForIntentForPreCreatedAccount(userData._id, courseContentId)
      );
      if (error1) return serverErrorHelper(req, res, 500, error1);
      const { createdCourse, createdOrder } = createCourseData
      console.log(createdCourse, "createdCourse")
      const [intent, intentError] = await asyncWrapper(() => createStripePaymentIntent(createdCourse.price, customerId, { courseId: createdCourse._id.toString(), courseContentId, userId: userData?._id.toString(), orderId: createdOrder?._id.toString() }));
      if (intentError) return errorResponseHelper(res, intentError);
      console.log(intent, "intent")
      const {
        stripePublishableKey,
        paymentIntent: {
          client_secret,
          customer,
        },
        ephemeralKey: { secret }
      } = intent
      const [updateCourse, updateCourseError] = await asyncWrapper(() => CourseModal.findByIdAndUpdate(createdCourse?._id, { paymentMeta: intent }));
      if (updateCourseError) return serverErrorHelper(req, res, 500, updateCourseError);

      successResponseHelper(res, { stripePublishableKey, client_secret, customer, secret })


    }

  } else {

    const newUser = new UserModal({
      phoneNumber,
      firstName, lastName,
      profilePhoto: GLOBAL_ENUMS.defaultProfilePhoto,
      accountStatus: GLOBAL_ENUMS.accountStatus.PENDING

    });
    const [data, error] = await asyncWrapper(() => newUser.save());
    if (error) return serverErrorHelper(req, res, 500, error);
    let customerId = null
    const [customer_id, customerError] = await asyncWrapper(() => createNewCustomer(data))
    if (customerError) return serverErrorHelper(req, res, 500, customerError);
    customerId = customer_id
    const [existCourse, existCourseError] = await asyncWrapper(() => CourseModal.findOne({ user: data?._id, courseContentId, paymentStatus: GLOBAL_ENUMS.purchaseStatus.PURCHASED }));
    if (existCourseError) return serverErrorHelper(req, res, 500, existCourseError);
    if (existCourse) return errorResponseHelper(res, { message: 'Course Already Purchased.' });
    const [createCourseData, error1] = await asyncWrapper(() =>
      createCourseForIntentForPreCreatedAccount(data._id, courseContentId)
    );
    if (error1) return serverErrorHelper(req, res, 500, error1);
    const { createdCourse, createdOrder } = createCourseData
    const [intent, intentError] = await asyncWrapper(() => createStripePaymentIntent(createdCourse.price, customerId, { courseId: createdCourse._id.toString(), userId: data?._id.toString(), orderId: createdOrder?._id.toString() }));
    if (intentError) return errorResponseHelper(res, intentError);
    console.log(intent, "intent")
    const {
      stripePublishableKey,
      paymentIntent: {
        client_secret,
        customer,
      },
      ephemeralKey: { secret }
    } = intent
    const [updateCourse, updateCourseError] = await asyncWrapper(() => CourseModal.findByIdAndUpdate(createdCourse?._id, { paymentMeta: intent }));
    if (updateCourseError) return serverErrorHelper(req, res, 500, updateCourseError);

    successResponseHelper(res, { stripePublishableKey, client_secret, customer, secret })

  }

};

const verifyOtpSignUp = async (req, res) => {
  const { phoneNumber, code } = req.body;
  if (code != "112233") {
    const [data, error] = await asyncWrapper(() =>
      twilioVerifyOtp(phoneNumber, code)
    );
    if (error) return serverErrorHelper(req, res, 500, error);

    if (data?.status != "approved")
      return errorResponseHelper(res, GLOBAL_MESSAGES.invalidOtp);
  }

  const [userData, userDataError] = await asyncWrapper(() =>
    UserModal.findOne({ phoneNumber })
  );
  if (userDataError) return serverErrorHelper(req, res, 500, userDataError);
  if (userData) {

    if (userData.archive) {
      const accessToken = signAccessToken(userData?._id);
      return successResponseHelper(res, {
        user: userData,
        token: accessToken,
      });
    }
    else if (userData.accountStatus == GLOBAL_ENUMS.accountStatus.PENDING) {
      const [updatedUser, errorOne] = await asyncWrapper(() =>
        UserModal.findByIdAndUpdate(
          userData._id,
          { accountStatus: GLOBAL_ENUMS.accountStatus.ACTIVE },
          { new: true }
        )
      );
      if (errorOne) return serverErrorHelper(req, res, 500, errorOne);

      const accessToken = signAccessToken(userData?._id);
      return successResponseHelper(res, {
        user: updatedUser,
        token: accessToken,
      });
    }
    else if (userData.accountStatus == GLOBAL_ENUMS.accountStatus.ACTIVE && userData.assessment.paidAssessment == false && userData.assessment.personalAssessment == false) {
      const accessToken = signAccessToken(userData?._id);
      return successResponseHelper(res, {
        user: userData,
        token: accessToken,
      });
    }
    else {
      return errorResponseHelper(res, GLOBAL_MESSAGES.duplicatePhone);
    }
  } else {

    const newUser = new UserModal({
      phoneNumber,
      profilePhoto: GLOBAL_ENUMS.defaultProfilePhoto,
    });
    const [data, error] = await asyncWrapper(() => newUser.save());
    if (error) return serverErrorHelper(req, res, 500, error);

    const accessToken = signAccessToken(data?._id);
    return successResponseHelper(res, {
      user: data,
      token: accessToken,
    });
  }

};

const verifyOtpSignIn = async (req, res) => {
  const { phoneNumber, code } = req.body;
  if (code != "112233") {
    const [data, error] = await asyncWrapper(() =>
      twilioVerifyOtp(phoneNumber, code)
    );
    if (error) return serverErrorHelper(req, res, 500, error);

    if (data?.status != "approved")
      return errorResponseHelper(res, GLOBAL_MESSAGES.invalidOtp);
  }


  const [dataOne, errorOne] = await asyncWrapper(() =>
    UserModal.findOne({ phoneNumber })
  );
  if (errorOne) return serverErrorHelper(req, res, 500, errorOne);
  if (!dataOne) return errorResponseHelper(res, GLOBAL_MESSAGES.phoneNotFound);
  if (dataOne.archive) return errorResponseHelper(res, { message: "No Account found! Sign Up for new account." });

  if (dataOne.accountStatus == GLOBAL_ENUMS.accountStatus.BLOCKED) {
    dataOne.archive = false
    const [userUpdated, userUpdatedError] = await asyncWrapper(() => dataOne.save())
    if (userUpdatedError) return serverErrorHelper(req, res, 500, userUpdatedError);
    return errorResponseHelper(res, { message: "Access restricted by administrator. Please contact support for assistance." })
  }
  if (dataOne.accountStatus == GLOBAL_ENUMS.accountStatus.PENDING) {
    dataOne.archive = false
    const [userUpdated, userUpdatedError] = await asyncWrapper(() => dataOne.save())
    if (userUpdatedError) return serverErrorHelper(req, res, 500, userUpdatedError);
    return errorResponseHelper(res, { message: "Please verify your phone number and complete Remaining profile by doing Signup." })
  }

  const accessToken = signAccessToken(dataOne?._id);
  return successResponseHelper(res, {
    user: dataOne,
    token: accessToken,
  });
};


const syncAssessmentUser = async (req, res) => {

  const { _id } = req.user;

  const [userData, userDataError] = await asyncWrapper(() =>
    UserModal.findById(_id)
  );
  if (userDataError) return serverErrorHelper(req, res, 500, userDataError);

  if (userData.unlockCourse.courseId && userData.assessment.paidAssessment == false) {
    return successResponseHelper(res, {
      assessmentRequired: true,
    });
  }
  else {
    return successResponseHelper(res, {
      assessmentRequired: false,
    });
  }

}

const sendEmailToAdmin = async (req, res) => {

  const { name, phone, questions, } = req.body;
  sendFailedAssessmentEmailToAdmin(name, phone, questions,)
    .then((msg) => {
      return successResponseHelper(res, {
        message: "Email sent Successfully!", msg
      })
    })
    .catch(e => serverErrorHelper(req, res, 500, e))
}


const updateUserProfile = async (req, res) => {

  const { _id } = req.user;
  const { firstName,
    lastName,
    email,
    dob,
    accountabilityCoach,
    profilePhoto,
    notificationSettings,
    learningReminder,
    personalQuestions,
    paidAssessmentQuestions,
    assessment
  } = req.body


  let userObject = {}

  if (firstName) userObject.firstName = firstName
  if (lastName) userObject.lastName = lastName
  if (email) userObject.email = email
  if (dob) userObject.dob = dob
  if (accountabilityCoach) userObject.accountabilityCoach = accountabilityCoach
  if (profilePhoto) userObject.profilePhoto = profilePhoto
  if (notificationSettings) userObject.notificationSettings = notificationSettings
  if (learningReminder) userObject.learningReminder = learningReminder

  if (paidAssessmentQuestions) userObject.paidAssessmentQuestions = paidAssessmentQuestions
  if (personalQuestions) userObject.personalQuestions = personalQuestions
  if (assessment) userObject.assessment = assessment
  userObject.archive = false

  const [updatedUser, error] = await asyncWrapper(() =>
    UserModal.findByIdAndUpdate(
      _id,
      userObject,
      { new: true }
    )
  );
  if (error) return serverErrorHelper(req, res, 500, error);

  return successResponseHelper(res, updatedUser);
}



const saveUserNotificationToken = async (req, res) => {
  const { _id } = req.user;
  const { deviceType, token } = req.body;

  if (!token || !deviceType)
    return errorResponseHelper(res, GLOBAL_MESSAGES.invalidRequest);

  const [exist, error] = await asyncWrapper(() =>
    UserModal.exists({ _id, "notificationTokens.token": token })
  );
  if (error) return serverErrorHelper(req, res, 500, error);
  if (exist) { return successResponseHelper(res, GLOBAL_MESSAGES.duplicateData) }
  else {
    const [data, error] = await asyncWrapper(() =>
      UserModal.findByIdAndUpdate(
        _id,
        {
          $push: {
            notificationTokens: { deviceType, token },
          },
        },
        { new: true }
      )
    );
    if (error) return serverErrorHelper(req, res, 500, error);
    return successResponseHelper(res, data);
  }
};


const sendOtpOnEmail = async (req, res) => {
  const { _id } = req.user;
  const { email } = req.body;

  const otp = generateOTP()
  const hashOtp = await generateOtpHash(otp)

  const newVerificationMetaObject = {
    email,
    otp: hashOtp,
    timeOut: generateTimeOut(),
  }

  const [user, errorOne] = await asyncWrapper(() => UserModal.findByIdAndUpdate({ _id }, { emailVerificationMeta: newVerificationMetaObject }, { new: true }))
  if (errorOne) return serverErrorHelper(req, res, 500, errorOne);

  const [data, error] = await asyncWrapper(() => sendEmail(email, "", otp));
  if (error) return serverErrorHelper(req, res, 500, error);

  return successResponseHelper(res, GLOBAL_MESSAGES.otpSent);
}

const verifyOtpOnEmail = async (req, res) => {
  const { _id } = req.user;
  const { email, otp } = req.body;

  const [user, errorOne] = await asyncWrapper(() => UserModal.findById({ _id }))
  if (errorOne) return serverErrorHelper(req, res, 500, errorOne);

  const { emailVerificationMeta } = user

  if (Date.now() > emailVerificationMeta.timeOut) return errorResponseHelper(res, GLOBAL_MESSAGES.otpValidityTimeout);

  const match = await bcrypt.compare(otp, emailVerificationMeta.otp);

  if (!match) return errorResponseHelper(res, GLOBAL_MESSAGES.invalidOtp);

  const [userTwo, errorTwo] = await asyncWrapper(() => UserModal.findByIdAndUpdate({ _id }, { emailVerified: true, email }, { new: true }))
  if (errorTwo) return serverErrorHelper(req, res, 500, errorTwo);

  return successResponseHelper(res, userTwo);
}


const getPersonalQuestions = async (req, res) => {

  const { _id } = req.user;
  const [userData, userError] = await asyncWrapper(() => UserModal.findById({ _id }))
  if (userError) return serverErrorHelper(req, res, 500, userError);

  let questionsArray = []

  if (userData.personalQuestions.length > 0) {
    questionsArray = userData.personalQuestions
  }
  else {
    const [questions, questionsError] = await asyncWrapper(() => PersonalQuestionContentModal.find())
    if (questionsError) return serverErrorHelper(req, res, 500, questionsError);
    for (const item of questions) {
      let newQuestionObj = {
        question: item,
        selectedAnswers: [],
        descriptiveAnswer: "",
        status: GLOBAL_ENUMS.questionStatus.NOT_ATTEMPTED,
        answerAt: new Date()
      }
      questionsArray.push(newQuestionObj)
    }
    const userObject = { personalQuestions: questionsArray }
    const [updatedUser, error] = await asyncWrapper(() =>
      UserModal.findByIdAndUpdate(
        _id,
        userObject,
        { new: true }
      )
    );
    if (error) return serverErrorHelper(req, res, 500, error);
  }


  return successResponseHelper(res, questionsArray);
}


const updateNotificationsSettings = async (req, res) => {
  const { _id } = req.user;

  let newNotificationSettingObject = {
    ...req.body
  }

  const [user, errorOne] = await asyncWrapper(() => UserModal.findByIdAndUpdate({ _id }, { notificationSettings: newNotificationSettingObject }, { new: true }))
  if (errorOne) return serverErrorHelper(req, res, 500, errorOne);

  return successResponseHelper(res, user);
}

const deleteProfile = async (req, res) => {

  const { _id } = req.user;

  const [userData, userDataError] = await asyncWrapper(() =>
    UserModal.findByIdAndUpdate(
      _id,
      { archive: true },
      { new: true })
  );
  if (userDataError) return serverErrorHelper(req, res, 500, userDataError);
  return successResponseHelper(res, userData);
}



export {
  sendOtp,
  sendEmailToAdmin,
  verifyOtpSignUp,
  verifyOtpSignIn,
  updateUserProfile,
  saveUserNotificationToken,
  sendOtpOnEmail,
  verifyOtpOnEmail,
  getPersonalQuestions,
  updateNotificationsSettings,
  preAccountCreation,
  syncAssessmentUser,
  deleteProfile
};
