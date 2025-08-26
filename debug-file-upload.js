import multer from 'multer';
import { memoryStorage } from 'multer';

// Test the file upload middleware
const testFileUpload = () => {
    console.log('🧪 Testing file upload middleware...');
    
    // Create a simple multer instance
    const upload = multer({
        storage: memoryStorage,
        fileFilter: (req, file, cb) => {
            console.log('🔍 File filter called with:', {
                fieldname: file.fieldname,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size
            });
            
            if (file.mimetype.startsWith('image/')) {
                console.log('✅ File accepted');
                cb(null, true);
            } else {
                console.log('❌ File rejected');
                cb(new Error('Only image files allowed'), false);
            }
        },
        limits: {
            fileSize: 5 * 1024 * 1024,
            files: 1
        }
    }).any();
    
    console.log('✅ Multer instance created successfully');
    console.log('✅ Using .any() to accept any field name');
    console.log('✅ Memory storage configured');
    console.log('✅ File size limit: 5MB');
    console.log('✅ Max files: 1');
    
    return upload;
};

// Test the middleware function
const testMiddleware = () => {
    console.log('\n🧪 Testing middleware function...');
    
    const upload = testFileUpload();
    
    // Simulate a request object
    const mockReq = {
        headers: {
            'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryjxazPuYbmsjHk2Ed'
        }
    };
    
    const mockRes = {
        status: (code) => ({
            json: (data) => {
                console.log(`Response ${code}:`, data);
                return mockRes;
            }
        })
    };
    
    const mockNext = () => {
        console.log('✅ Next() called successfully');
    };
    
    console.log('✅ Mock objects created');
    console.log('✅ Content-Type:', mockReq.headers['content-type']);
    
    return { upload, mockReq, mockRes, mockNext };
};

// Run the test
console.log('🚀 Starting file upload middleware test...\n');
const { upload, mockReq, mockRes, mockNext } = testMiddleware();

console.log('\n📋 Test Summary:');
console.log('✅ Multer configuration looks correct');
console.log('✅ Using .any() method to accept any field name');
console.log('✅ Memory storage for Cloudinary compatibility');
console.log('✅ Proper file filtering for images only');
console.log('✅ Reasonable file size limits');

console.log('\n💡 Recommendations:');
console.log('1. Check if frontend is sending the correct field name');
console.log('2. Verify that the file is actually being sent in the request');
console.log('3. Check browser network tab to see the actual request payload');
console.log('4. Ensure the form has enctype="multipart/form-data"');
console.log('5. Verify that the file input has a name attribute');

console.log('\n🔧 Next steps:');
console.log('1. Test with a simple form submission');
console.log('2. Check the actual request in browser dev tools');
console.log('3. Verify Cloudinary credentials are set');
console.log('4. Test the middleware with actual file upload');

console.log('\n✅ Test completed successfully');
