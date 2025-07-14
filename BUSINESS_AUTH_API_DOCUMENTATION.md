# Business Authentication API Documentation

## Overview
This API provides comprehensive authentication and profile management for business owners. The system includes email verification, OTP-based authentication, Google OAuth integration, and profile management features.

## Base URL
```
http://localhost:3000/api/business/auth
```

## Authentication Flow

### 1. Business Signup Flow
1. **Signup** - Submit basic information (first name, last name, email, phone)
2. **OTP Verification** - Verify email with OTP and set username/password
3. **Admin Approval** - Wait for admin to approve the account
4. **Login** - Access the system once approved

### 2. Google Authentication Flow
1. **Google Signup** - Submit Google credentials
2. **Admin Approval** - Wait for admin to approve the account
3. **Login** - Access the system once approved

## API Endpoints

### 1. Business Signup
**POST** `/signup`

Creates a new business account with basic information.

**Request Body:**
```json
{
  "ownerFirstName": "John",
  "ownerLastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Business account created successfully. Please check your email for verification code.",
  "data": {
    "email": "john.doe@example.com",
    "ownerFirstName": "John",
    "ownerLastName": "Doe"
  }
}
```

### 2. Verify OTP and Set Credentials
**POST** `/verify-otp`

Verifies the OTP sent to email and sets username/password.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456",
  "username": "johndoe_business",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account verified successfully. Your account is pending admin approval.",
  "data": {
    "email": "john.doe@example.com",
    "username": "johndoe_business",
    "status": "pending"
  }
}
```

### 3. Business Login
**POST** `/login`

Authenticates business owner with email and password.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "business": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "ownerFirstName": "John",
      "ownerLastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "+1234567890",
      "username": "johndoe_business",
      "businessName": "John's Business",
      "status": "approved",
      "profilePhoto": "https://example.com/photo.jpg",
      "isEmailVerified": true,
      "isPhoneVerified": false
    }
  }
}
```

### 4. Google Authentication
**POST** `/google`

Authenticates or creates business account using Google credentials.

**Request Body:**
```json
{
  "googleId": "google_user_id_123",
  "ownerFirstName": "John",
  "ownerLastName": "Doe",
  "email": "john.doe@gmail.com",
  "profilePhoto": "https://lh3.googleusercontent.com/photo.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "business": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "ownerFirstName": "John",
      "ownerLastName": "Doe",
      "email": "john.doe@gmail.com",
      "phoneNumber": "+1234567890",
      "username": "johndoe_business",
      "businessName": "John's Business",
      "status": "approved",
      "profilePhoto": "https://lh3.googleusercontent.com/photo.jpg",
      "isEmailVerified": true,
      "isPhoneVerified": false
    }
  }
}
```

### 5. Send OTP for Email Verification
**POST** `/send-otp`

Sends OTP to email for verification.

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email"
}
```

### 6. Verify OTP for Email
**POST** `/verify-otp-email`

Verifies OTP for email verification.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### 7. Forgot Password
**POST** `/forgot-password`

Sends OTP for password reset.

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset OTP sent to your email"
}
```

### 8. Reset Password
**POST** `/reset-password`

Resets password using OTP.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### 9. Get Profile (Protected)
**GET** `/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "ownerFirstName": "John",
    "ownerLastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1234567890",
    "username": "johndoe_business",
    "businessName": "John's Business",
    "address": "123 Business St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "profilePhoto": "https://example.com/photo.jpg",
    "status": "approved",
    "isEmailVerified": true,
    "isPhoneVerified": false
  }
}
```

### 10. Update Password (Protected)
**PUT** `/update-password`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

### 11. Update Profile (Protected)
**PUT** `/update-profile`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
ownerFirstName: John
ownerLastName: Doe
phoneNumber: +1234567890
businessName: John's Business
address: 123 Business St
city: New York
state: NY
zipCode: 10001
country: USA
profilePhoto: [file upload]
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "ownerFirstName": "John",
    "ownerLastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1234567890",
    "username": "johndoe_business",
    "businessName": "John's Business",
    "address": "123 Business St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "profilePhoto": "https://example.com/photo.jpg",
    "status": "approved",
    "isEmailVerified": true,
    "isPhoneVerified": false
  }
}
```

## Error Responses

### Common Error Codes
- `00400` - Bad Request (missing or invalid parameters)
- `00401` - Unauthorized (invalid credentials or token)
- `00404` - Not Found (resource not found)
- `00409` - Conflict (resource already exists)
- `00500` - Internal Server Error

### Example Error Response
```json
{
  "success": false,
  "message": "Invalid email or password",
  "code": "00401"
}
```

## Business Account Status

### Status Values
- `pending` - Account created, waiting for admin approval
- `approved` - Account approved by admin, can access system
- `rejected` - Account rejected by admin
- `suspended` - Account suspended by admin

## Security Features

### Password Requirements
- Minimum 8 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter
- Must contain at least one number
- Must contain at least one special character

### OTP Features
- 6-digit numeric OTP
- 10-minute expiration time
- One-time use only
- Sent via email

### JWT Token
- 7-day expiration
- Business-specific secret key
- Includes business ID for authorization

## File Upload

### Profile Photo Upload
- Supported formats: JPG, PNG, GIF
- Maximum size: 5MB
- Stored in cloud storage (AWS S3)
- Returns public URL for access

## Integration Examples

### Frontend Integration (JavaScript)
```javascript
// Business Signup
const signupBusiness = async (businessData) => {
  const response = await fetch('/api/business/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(businessData)
  });
  return response.json();
};

// Business Login
const loginBusiness = async (credentials) => {
  const response = await fetch('/api/business/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials)
  });
  return response.json();
};

// Update Profile with File Upload
const updateProfile = async (profileData, token) => {
  const formData = new FormData();
  Object.keys(profileData).forEach(key => {
    formData.append(key, profileData[key]);
  });

  const response = await fetch('/api/business/auth/update-profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData
  });
  return response.json();
};
```

### Mobile App Integration (React Native)
```javascript
// Google Authentication
const googleAuth = async (googleUser) => {
  const response = await fetch('/api/business/auth/google', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      googleId: googleUser.id,
      ownerFirstName: googleUser.givenName,
      ownerLastName: googleUser.familyName,
      email: googleUser.email,
      profilePhoto: googleUser.photo
    })
  });
  return response.json();
};
```

## Testing

### Test Business Account
```
Email: test.business@example.com
Password: TestPassword123!
Username: test_business
```

### Test OTP
For development/testing, you can use any 6-digit number as OTP.

## Notes

1. **Admin Approval Required**: All new business accounts require admin approval before they can access the system.

2. **Email Verification**: Email verification is required for all accounts except those created via Google OAuth.

3. **Google OAuth**: Google-authenticated accounts are automatically email-verified.

4. **Profile Updates**: Profile updates are restricted to approved accounts only.

5. **Password Security**: Passwords are hashed using bcrypt with salt rounds of 10.

6. **Token Management**: JWT tokens should be stored securely and refreshed as needed.

7. **Error Handling**: Always handle API errors gracefully in your frontend application.

8. **Rate Limiting**: Consider implementing rate limiting for OTP requests to prevent abuse. 