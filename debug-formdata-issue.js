// Debug Script for Form Data Incomplete Issue
// This script helps identify why the multipart form is being cut off

const debugFormDataIssue = async () => {
    const baseUrl = 'http://localhost:3000'; // Adjust to your server URL
    const adminToken = 'YOUR_ADMIN_TOKEN_HERE'; // Replace with actual admin token
    
    console.log('🔍 Debugging Form Data Incomplete Issue');
    console.log('=======================================\n');
    
    // Test 1: Create a minimal test image
    console.log('1️⃣ Creating Test Image...');
    let testImage;
    try {
        // Create a simple 1x1 pixel PNG image
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 1, 1);
        
        // Convert to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        testImage = new File([blob], 'test.png', { type: 'image/png' });
        console.log('✅ Test image created:', testImage.name, testImage.size, testImage.type);
    } catch (error) {
        console.log('❌ Failed to create test image:', error.message);
        // Fallback: create a simple text file
        testImage = new File(['test'], 'test.txt', { type: 'text/plain' });
        console.log('⚠️ Using fallback text file:', testImage.name, testImage.size, testImage.type);
    }
    
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Test 2: Test with minimal form data
    console.log('2️⃣ Testing Minimal Form Data...');
    try {
        const formData = new FormData();
        formData.append('firstName', 'Alex');
        formData.append('lastName', 'Andrew');
        
        console.log('FormData created with fields:', Array.from(formData.keys()));
        
        const response = await fetch(`${baseUrl}/admin/auth/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            body: formData
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', result);
        
        if (response.ok) {
            console.log('✅ Minimal form successful');
        } else {
            console.log('❌ Minimal form failed:', result.message);
            if (result.suggestions) {
                console.log('Suggestions:', result.suggestions);
            }
        }
    } catch (error) {
        console.log('❌ Minimal form error:', error.message);
    }
    
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Test 3: Test with image file
    console.log('3️⃣ Testing with Image File...');
    try {
        const formData = new FormData();
        formData.append('firstName', 'Alex');
        formData.append('lastName', 'Andrew');
        formData.append('email', 'admin@gmail.com');
        formData.append('phoneNumber', '1234543');
        formData.append('image', testImage);
        
        console.log('FormData created with fields:', Array.from(formData.keys()));
        console.log('Image details:', {
            name: testImage.name,
            size: testImage.size,
            type: testImage.type
        });
        
        const response = await fetch(`${baseUrl}/admin/auth/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            },
            body: formData
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', result);
        
        if (response.ok) {
            console.log('✅ Form with image successful');
        } else {
            console.log('❌ Form with image failed:', result.message);
            if (result.suggestions) {
                console.log('Suggestions:', result.suggestions);
            }
        }
    } catch (error) {
        console.log('❌ Form with image error:', error.message);
    }
    
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Test 4: Check FormData construction
    console.log('4️⃣ FormData Construction Check...');
    try {
        const formData = new FormData();
        
        // Add fields one by one and check
        const fields = [
            ['firstName', 'Alex'],
            ['lastName', 'Andrew'],
            ['email', 'admin@gmail.com'],
            ['phoneNumber', '1234543']
        ];
        
        fields.forEach(([key, value]) => {
            formData.append(key, value);
            console.log(`Added field: ${key} = ${value}`);
        });
        
        // Add image
        formData.append('image', testImage);
        console.log(`Added image: ${testImage.name}`);
        
        // Check FormData contents
        console.log('FormData keys:', Array.from(formData.keys()));
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        }
        
    } catch (error) {
        console.log('❌ FormData construction error:', error.message);
    }
    
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Test 5: Manual cURL test
    console.log('5️⃣ Manual cURL Test...');
    console.log('Try this cURL command manually:');
    console.log(`
curl -X PUT \\
  -H "Authorization: Bearer ${adminToken}" \\
  -F "firstName=Alex" \\
  -F "lastName=Andrew" \\
  -F "email=admin@gmail.com" \\
  -F "phoneNumber=1234543" \\
  -F "image=@test.png" \\
  ${baseUrl}/admin/auth/profile
    `);
    
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Test 6: Common issues and solutions
    console.log('6️⃣ Common Issues & Solutions...');
    console.log('❌ Issue: "Form data incomplete"');
    console.log('🔧 Possible Causes:');
    console.log('   1. Form submitted before all data loaded');
    console.log('   2. Invalid File object');
    console.log('   3. Network interruption');
    console.log('   4. FormData construction error');
    console.log('   5. File size too large');
    console.log('   6. Browser compatibility issues');
    
    console.log('\n🔧 Solutions to Try:');
    console.log('   1. Add delay before form submission');
    console.log('   2. Validate File object before adding to FormData');
    console.log('   3. Check file size limits');
    console.log('   4. Test with different browsers');
    console.log('   5. Try without image first');
    console.log('   6. Check network stability');
    
    console.log('\n' + '─'.repeat(50) + '\n');
    console.log('🎯 Debug Complete!');
    console.log('\nCheck your server console for detailed middleware logs.');
    console.log('Look for lines starting with 🔍 Middleware: and ❌ Middleware:');
};

// Instructions
console.log(`
📋 How to Use This Debug Script:

1. Replace 'YOUR_ADMIN_TOKEN_HERE' with an actual admin JWT token
2. Make sure your backend server is running and restarted
3. Adjust the baseUrl if your server runs on a different port
4. Run this script in a browser console (not Node.js)
5. Check both the script output and your server console logs

🔧 What This Script Tests:
- FormData construction step by step
- Minimal form submission
- Form with image file
- Common form data issues
- Manual cURL testing

⚠️  Note: This script must run in a browser environment due to FormData and File APIs.
`);

// Export for use in other modules
export { debugFormDataIssue };

// If running in browser, execute the debug
if (typeof window !== 'undefined') {
    // Browser environment
    debugFormDataIssue().catch(console.error);
} else {
    console.log('⚠️ This script must run in a browser environment due to FormData and File APIs.');
}
