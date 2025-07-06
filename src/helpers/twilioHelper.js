import twilio from "twilio";
import { GLOBAL_ENV } from "../config/globalConfig.js";

const client = twilio(GLOBAL_ENV.twilioAccountSid, GLOBAL_ENV.twilioAuthToken);

const twilioSendOtp = async (phoneNumber) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const message = await client.messages.create({
      body: `Your verification code is: ${otp}`,
      from: GLOBAL_ENV.twilioPhoneNumber,
      to: phoneNumber
    });

    // In a real application, you would store this OTP in your database
    // with an expiration time and verify it later
    console.log(`OTP sent to ${phoneNumber}: ${otp}`);
    
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('Twilio error:', error);
    throw new Error('Failed to send OTP');
  }
};

const twilioVerifyOtp = async (phoneNumber, code) => {
  try {
    // In a real application, you would verify the OTP against what's stored in your database
    // For now, we'll just return a mock verification
    // You should implement proper OTP verification logic here
    
    // Mock verification - replace with actual database lookup
    const mockStoredOtp = "123456"; // This should come from your database
    
    if (code === mockStoredOtp) {
      return { status: "approved" };
    } else {
      return { status: "rejected" };
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    throw new Error('Failed to verify OTP');
  }
};

export { twilioSendOtp, twilioVerifyOtp }; 