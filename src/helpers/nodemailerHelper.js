import nodemailer from "nodemailer"
import { GLOBAL_ENV } from "../config/globalConfig.js";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GLOBAL_ENV.nodemailerEmail,
        pass: GLOBAL_ENV.nodemailerAppPassword,
    },
});

const sendEmail = (email, description, otp) => {
    return new Promise((resolve, reject) => {
        const mailOptions = {
            from: GLOBAL_ENV.nodemailerEmail,
            to: email,
            subject: 'Email Verification',
            text: `Your OTP is: ${otp}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject(error)
            } else {
                console.log('Email sent: ' + info.response);
                resolve(info.response)
            }
        });
    })

};


export {
    sendEmail
}