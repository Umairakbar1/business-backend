import { GLOBAL_ENV } from './src/config/globalConfig.js';

// Test Cloudinary configuration
const testCloudinaryConfig = () => {
    console.log('🧪 Testing Cloudinary Configuration...\n');
    
    // Check environment variables
    console.log('Environment Variables:');
    console.log('✅ CLOUDINARY_CLOUD_NAME:', GLOBAL_ENV.cloudinaryCloudName ? 'SET' : '❌ MISSING');
    console.log('✅ CLOUDINARY_API_KEY:', GLOBAL_ENV.cloudinaryApiKey ? 'SET' : '❌ MISSING');
    console.log('✅ CLOUDINARY_API_SECRET:', GLOBAL_ENV.cloudinaryApiSecret ? 'SET' : '❌ MISSING');
    
    // Check if all required variables are set
    const allSet = GLOBAL_ENV.cloudinaryCloudName && GLOBAL_ENV.cloudinaryApiKey && GLOBAL_ENV.cloudinaryApiSecret;
    
    if (allSet) {
        console.log('\n✅ All Cloudinary environment variables are set!');
        console.log('✅ Configuration should work properly');
        
        // Mask sensitive values for security
        const maskedApiKey = GLOBAL_ENV.cloudinaryApiKey ? 
            GLOBAL_ENV.cloudinaryApiKey.substring(0, 4) + '...' + GLOBAL_ENV.cloudinaryApiKey.substring(GLOBAL_ENV.cloudinaryApiKey.length - 4) : 
            'NOT SET';
        const maskedApiSecret = GLOBAL_ENV.cloudinaryApiSecret ? 
            GLOBAL_ENV.cloudinaryApiSecret.substring(0, 4) + '...' + GLOBAL_ENV.cloudinaryApiSecret.substring(GLOBAL_ENV.cloudinaryApiSecret.length - 4) : 
            'NOT SET';
        
        console.log('✅ Cloud Name:', GLOBAL_ENV.cloudinaryCloudName);
        console.log('✅ API Key:', maskedApiKey);
        console.log('✅ API Secret:', maskedApiSecret);
        
    } else {
        console.log('\n❌ Some Cloudinary environment variables are missing!');
        console.log('❌ This will cause upload failures');
        
        if (!GLOBAL_ENV.cloudinaryCloudName) {
            console.log('❌ CLOUDINARY_CLOUD_NAME is missing');
        }
        if (!GLOBAL_ENV.cloudinaryApiKey) {
            console.log('❌ CLOUDINARY_API_KEY is missing');
        }
        if (!GLOBAL_ENV.cloudinaryApiSecret) {
            console.log('❌ CLOUDINARY_API_SECRET is missing');
        }
        
        console.log('\n💡 To fix this:');
        console.log('1. Create a .env file in the business-backend-V1 directory');
        console.log('2. Add your Cloudinary credentials:');
        console.log('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
        console.log('   CLOUDINARY_API_KEY=your_api_key');
        console.log('   CLOUDINARY_API_SECRET=your_api_secret');
        console.log('3. Restart your server');
    }
    
    // Check if .env file exists
    console.log('\n📁 Environment File Check:');
    try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env');
        
        if (fs.existsSync(envPath)) {
            console.log('✅ .env file found');
            const envContent = fs.readFileSync(envPath, 'utf8');
            const hasCloudinary = envContent.includes('CLOUDINARY');
            console.log('✅ Contains Cloudinary variables:', hasCloudinary);
        } else {
            console.log('❌ .env file not found');
            console.log('💡 Create a .env file with your Cloudinary credentials');
        }
    } catch (error) {
        console.log('⚠️ Could not check .env file:', error.message);
    }
    
    return allSet;
};

// Run the test
console.log('🚀 Starting Cloudinary configuration test...\n');
const configValid = testCloudinaryConfig();

console.log('\n📋 Summary:');
if (configValid) {
    console.log('✅ Cloudinary configuration is valid');
    console.log('✅ File uploads should work');
    console.log('✅ The issue is likely in the middleware or frontend');
} else {
    console.log('❌ Cloudinary configuration is invalid');
    console.log('❌ File uploads will fail');
    console.log('❌ Fix the environment variables first');
}

console.log('\n🔧 Next steps:');
if (configValid) {
    console.log('1. Check the file upload middleware');
    console.log('2. Verify the frontend form is correct');
    console.log('3. Check browser network tab for request details');
    console.log('4. Test with the HTML test form');
} else {
    console.log('1. Set up Cloudinary credentials in .env file');
    console.log('2. Restart the server');
    console.log('3. Test the configuration again');
}

console.log('\n✅ Test completed');
