import sgMail from "@sendgrid/mail"
import { GLOBAL_ENV } from "../config/globalConfig.js";

sgMail.setApiKey(GLOBAL_ENV.sendGridApiKey);


const sendEmail = (email, description, otp) => {
    return new Promise((resolve, reject) => {
        const msg = {
            to: email,
            from: GLOBAL_ENV.sendGridEmailSendFrom,
            subject: 'Email Verification For Business',
            text: `Your OTP is: ${otp}`,
            // html: '<strong>and easy to do anywhere, even with Node.js</strong>',
        }
        sgMail
            .send(msg)
            .then((result) => {
                resolve(true)
            })
            .catch((error) => {
                console.error(error, "My Error")
                reject(error)
            })

    })

};

const sendFailedAssessmentEmailToAdmin = (name, phone, questions,) => {
    return new Promise((resolve, reject) => {
        const msg = {
            from: { email: process.env.SEND_GRID_ASSESSMENT_EMAIL_FROM },
            to: { email: process.env.SEND_GRID_EMAIL_ADMIN },
            subject: 'Mobile User Assessment Notification',
            // text: `A SoberIn40 user requires Inpatient Treatment.

            // Name: ${name}
            // Phone Number: ${phone}

            // Reason:
            // ${questions.map((question, index) => `Q${index + 1}: ${question}`).join('\n')}
            // `,
            html: `
            <p>A SoberIn40 user requires Inpatient Treatment.</p>
    
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Phone Number:</strong> ${phone}</p>
    
            <p><strong>Reason:</strong></p>
            <ul>
                ${questions.map((question, index) => `<li><strong>Q${index + 1}:</strong> ${question}</li>`).join('')}
            </ul>
        `,
        }
        sgMail
            .send(msg)
            .then((result) => {
                resolve(true)
            })
            .catch((error) => {
                console.log(error?.response?.body || error, "My Error")
                reject(error)
            })

    })

};


export {
    sendEmail,
    sendFailedAssessmentEmailToAdmin
}