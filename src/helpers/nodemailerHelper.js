import nodemailer from "nodemailer"
import GLOBAL_ENV from "../config/envConfig.js";

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GLOBAL_ENV.nodemailerEmail,
        pass: GLOBAL_ENV.nodemailerAppPassword,
    },
});

const sendEmail = (email, subject, description, otp) => {
    return new Promise((resolve, reject) => {
        const mailOptions = {
            from: GLOBAL_ENV.nodemailerEmail,
            to: email,
            subject: subject || 'Email Verification',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333; text-align: center;">${subject || 'Email Verification'}</h2>
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="color: #666; margin-bottom: 15px;">${description || 'Your verification code is:'}</p>
                        <div style="background-color: #007bff; color: white; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
                            ${otp}
                        </div>
                        <p style="color: #999; font-size: 12px; margin-top: 15px; text-align: center;">
                            This code will expire in 10 minutes.
                        </p>
                    </div>
                    <p style="color: #666; font-size: 14px; text-align: center;">
                        If you didn't request this code, please ignore this email.
                    </p>
                </div>
            `
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