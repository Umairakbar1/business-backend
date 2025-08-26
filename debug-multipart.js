// Debug Script for Multipart Form Error
// This script helps identify the exact cause of the "Unexpected end of form" error

const debugMultipartError = async () => {
    const baseUrl = 'http://localhost:3000'; // Adjust to your server URL
    const adminToken = 'YOUR_ADMIN_TOKEN_HERE'; // Replace with actual admin token
    
    console.log('🔍 Debugging Multipart Form Error');
    console.log('==================================\n');
    
    // Test 1: Simple JSON request (should work)
    console.log('1️⃣ Testing Simple JSON Request...');
    try {
        const response = await fetch(`${baseUrl}/admin/auth/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firstName: 'Test'
            })
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', result);
        
        if (response.ok) {
            console.log('✅ JSON request successful');
        } else {
            console.log('❌ JSON request failed:', result.message);
        }
    } catch (error) {
        console.log('❌ JSON request error:', error.message);
    }
    
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Test 2: Empty multipart form (should fail gracefully)
    console.log('2️⃣ Testing Empty Multipart Form...');
    try {
        const formData = new FormData();
        // Don't add any fields
        
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
            console.log('✅ Empty multipart handled correctly');
        } else {
            console.log('✅ Expected failure with proper error message');
        }
    } catch (error) {
        console.log('❌ Empty multipart error:', error.message);
    }
    
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Test 3: Multipart with only text fields (no file)
    console.log('3️⃣ Testing Multipart with Text Only...');
    try {
        const formData = new FormData();
        formData.append('firstName', 'John');
        formData.append('lastName', 'Doe');
        
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
            console.log('✅ Text-only multipart successful');
        } else {
            console.log('❌ Text-only multipart failed:', result.message);
        }
    } catch (error) {
        console.log('❌ Text-only multipart error:', error.message);
    }
    
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Test 4: Check server logs
    console.log('4️⃣ Server Log Analysis...');
    console.log('Check your server console for these log messages:');
    console.log('- Request headers');
    console.log('- Request body');
    console.log('- Request file');
    console.log('- Content-Type');
    console.log('- Any error messages');
    
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Test 5: Manual cURL test
    console.log('5️⃣ Manual cURL Test...');
    console.log('Try this cURL command manually:');
    console.log(`
curl -X PUT \\
  -H "Authorization: Bearer ${adminToken}" \\
  -F "firstName=John" \\
  -F "lastName=Doe" \\
  ${baseUrl}/admin/auth/profile
    `);
    
    console.log('\n' + '─'.repeat(50) + '\n');
    console.log('🎯 Debug Complete!');
    console.log('\nCommon causes of "Unexpected end of form":');
    console.log('1. Incomplete form data');
    console.log('2. Network interruption during upload');
    console.log('3. Client-side form construction issues');
    console.log('4. Server middleware configuration problems');
    console.log('5. Content-Type header mismatch');
};

// Instructions
console.log(`
📋 How to Use This Debug Script:

1. Replace 'YOUR_ADMIN_TOKEN_HERE' with an actual admin JWT token
2. Make sure your backend server is running
3. Adjust the baseUrl if your server runs on a different port
4. Run this script: node debug-multipart.js
5. Check both the script output and your server console logs

🔧 What This Script Tests:
- JSON requests (baseline)
- Empty multipart forms
- Text-only multipart forms
- Server logging
- Manual cURL testing

⚠️  Note: This script helps identify where the error occurs in the request chain.
`);

// Export for use in other modules
export { debugMultipartError };

// If running directly, execute the debug
if (typeof window === 'undefined') {
    // Node.js environment
    debugMultipartError().catch(console.error);
}
