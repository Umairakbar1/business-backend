// Simple test to verify server can start without validation errors
// Run with: node test-server-start.js

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing server startup...');

try {
  // Test importing the routes
  console.log('📁 Testing route imports...');
  const userAuthRoutes = await import('./src/routes/user/auth.js');
  console.log('✅ User auth routes imported successfully');
  
  // Test importing the validators
  console.log('📋 Testing validator imports...');
  const validators = await import('./src/validators/user.js');
  console.log('✅ User validators imported successfully');
  
  // Test importing the controllers
  console.log('🎮 Testing controller imports...');
  const controllers = await import('./src/controllers/user/auth.controller.js');
  console.log('✅ User auth controllers imported successfully');
  
  console.log('\n🎉 All imports successful! Server should start without errors.');
  console.log('\n📋 Available password reset functions:');
  console.log('- requestPasswordReset:', typeof controllers.requestPasswordReset);
  console.log('- verifyPasswordResetOtp:', typeof controllers.verifyPasswordResetOtp);
  console.log('- resetPassword:', typeof controllers.resetPassword);
  
  console.log('\n🔒 Available validation middleware:');
  console.log('- requestPasswordResetValidation:', typeof validators.requestPasswordResetValidation);
  console.log('- verifyPasswordResetOtpValidation:', typeof validators.verifyPasswordResetOtpValidation);
  console.log('- resetPasswordValidation:', typeof validators.resetPasswordValidation);
  
} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
