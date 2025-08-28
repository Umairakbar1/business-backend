# User Password Recovery API Documentation

This document describes the API endpoints for user password recovery functionality.

## Overview

The password recovery system consists of three main steps:
1. **Request Password Reset** - Send OTP to user's email
2. **Verify OTP** - Verify the OTP and get final reset token
3. **Reset Password** - Set new password using the final token

## Base URL

```
POST /user/auth
```

## Endpoints

### 1. Request Password Reset

**Endpoint:** `POST /forgot-password`

**Description:** Sends an OTP to the user's email for password reset verification.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP sent to your email. Please verify to complete password reset.",
  "data": {
    "email": "user@example.com",
    "passwordResetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Email is required",
  "code": "00400"
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "No account found with this email address",
  "code": "00404"
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Your account is not active. Please contact support.",
  "code": "00401"
}
```

**Notes:**
- The `passwordResetToken` expires in 15 minutes
- OTP expires in 10 minutes
- For testing, OTP is always "775511"
- **Important**: Each new password reset request generates a fresh token and OTP
- Previous tokens and OTPs are invalidated when a new request is made

---

### 2. Verify Password Reset OTP

**Endpoint:** `POST /verify-reset-otp`

**Description:** Verifies the OTP sent to the user's email and generates a final password reset token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "775511",
  "passwordResetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP verified successfully. You can now reset your password.",
  "data": {
    "email": "user@example.com",
    "finalPasswordResetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Email, OTP, and password reset token are required",
  "code": "00400"
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid or expired password reset token. Please request a new one.",
  "code": "00401"
}
```

**Notes:**
- The `finalPasswordResetToken` expires in 15 minutes
- OTP is cleared after successful verification

---

### 3. Reset Password

**Endpoint:** `POST /reset-password`

**Description:** Sets a new password for the user account using the final password reset token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!",
  "finalPasswordResetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password.",
  "data": {
    "email": "user@example.com"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Email, new password, confirm password, and reset token are required",
  "code": "00400"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "New password and confirm password do not match",
  "code": "00400"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Password must contain at least 8 characters with uppercase, lowercase, number, and special character",
  "code": "00400"
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid or expired password reset token. Please request a new one.",
  "code": "00401"
}
```

**Notes:**
- Password must meet strength requirements (8+ chars, uppercase, lowercase, number, special char)
- Passwords must match exactly
- Final token expires in 15 minutes

---

## Password Requirements

The new password must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&)

## Security Features

1. **Token Expiration:** All tokens expire in 15 minutes
2. **OTP Expiration:** OTP expires in 10 minutes
3. **Email Verification:** OTP is sent to the registered email address
4. **Token Validation:** Each step validates the previous token
5. **Password Strength:** Enforces strong password requirements
6. **Account Status Check:** Only active accounts can reset passwords

## Error Codes

- **00400:** Bad Request (validation errors)
- **00401:** Unauthorized (invalid/expired tokens, inactive account)
- **00404:** Not Found (user not found)
- **00500:** Internal Server Error (email sending failures)

## Testing

For testing purposes:
- OTP is always "775511"
- Email sending is commented out (logs to console)
- All validation and security checks are active

## Flow Diagram

```
User Request Reset → Send OTP → Verify OTP → Reset Password
       ↓              ↓          ↓           ↓
   Check Email    Generate   Validate    Update
   & Status      OTP &      OTP &       Password
                 Token      Token
```

## Example Usage

### Complete Password Reset Flow

1. **Request Reset:**
   ```bash
   curl -X POST /api/user/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com"}'
   ```

2. **Verify OTP:**
   ```bash
   curl -X POST /api/user/auth/verify-reset-otp \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "otp": "775511",
       "passwordResetToken": "token_from_step_1"
     }'
   ```

3. **Reset Password:**
   ```bash
   curl -X POST /api/user/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "newPassword": "NewPassword123!",
       "confirmPassword": "NewPassword123!",
       "finalPasswordResetToken": "token_from_step_2"
     }'
   ```

## Notes

- This system is designed for regular users (not business owners)
- All endpoints are public (no authentication required)
- Tokens are JWT-based with specific expiration times
- OTP verification is required before password reset
- Password strength validation is enforced
- Account status is checked at each step
