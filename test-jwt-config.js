// Test JWT Configuration
import { GLOBAL_ENV } from "./src/config/globalConfig.js";
import { signOtpVerificationToken } from "./src/helpers/jwtHelper.js";

console.log('=== JWT Configuration Test ===');
console.log('GLOBAL_ENV:', GLOBAL_ENV);

try {
  // Test OTP verification token generation
  const testToken = signOtpVerificationToken('test@example.com', '123456');
  console.log('✅ JWT Configuration is working!');
  console.log('Test token generated:', testToken.substring(0, 50) + '...');
} catch (error) {
  console.error('❌ JWT Configuration Error:', error.message);
  console.log('Please check your .env file and ensure JWT_SECRET_KEY is set.');
} 