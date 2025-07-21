import { v2 as cloudinary } from 'cloudinary';
import { GLOBAL_ENV } from './src/config/globalConfig.js';

// Test Cloudinary configuration
const testCloudinaryConfig = async () => {
  console.log('Testing Cloudinary configuration...');
  
  // Check environment variables
  console.log('Environment variables:');
  console.log('- CLOUDINARY_CLOUD_NAME:', GLOBAL_ENV.cloudinaryCloudName ? 'SET' : 'MISSING');
  console.log('- CLOUDINARY_API_KEY:', GLOBAL_ENV.cloudinaryApiKey ? 'SET' : 'MISSING');
  console.log('- CLOUDINARY_API_SECRET:', GLOBAL_ENV.cloudinaryApiSecret ? 'SET' : 'MISSING');
  
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: GLOBAL_ENV.cloudinaryCloudName,
    api_key: GLOBAL_ENV.cloudinaryApiKey,
    api_secret: GLOBAL_ENV.cloudinaryApiSecret,
  });
  
  try {
    // Test connection by getting account info
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful:', result);
    
    // Test upload with a simple text file
    console.log('Testing upload functionality...');
    const testBuffer = Buffer.from('test image content');
    
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'test',
          resource_type: 'image',
          public_id: 'test-upload-' + Date.now()
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      uploadStream.end(testBuffer);
    });
    
    console.log('✅ Upload test successful:', uploadResult.public_id);
    
    // Clean up test file
    await cloudinary.uploader.destroy(uploadResult.public_id);
    console.log('✅ Test file cleaned up');
    
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
    console.error('Error details:', error);
  }
};

// Run the test
testCloudinaryConfig().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 