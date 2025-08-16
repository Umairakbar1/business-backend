# Password Recovery API Documentation

This document describes the password recovery endpoints for business owners.

## Base URL
```
POST /api/business/auth/
```

## Endpoints

### 1. Request Password Reset
**Endpoint:** `POST /forgot-password`

**Description:** Initiates the password recovery process by sending an OTP to the user's email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "passwordResetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Notes:**
- The OTP is sent to the user's email
- The `passwordResetToken` expires in 15 minutes
- Store this token for the next step

### 2. Verify Password Reset OTP
**Endpoint:** `POST /verify-reset-otp`

**Description:** Verifies the OTP sent to the user's email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "passwordResetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "finalPasswordResetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Notes:**
- The OTP must be exactly 6 digits
- A new `finalPasswordResetToken` is generated for the final step
- This token also expires in 15 minutes

### 3. Reset Password
**Endpoint:** `POST /reset-password`

**Description:** Sets the new password for the user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!",
  "finalPasswordResetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com"
  }
}
```

**Notes:**
- Password must be at least 8 characters
- Password must contain uppercase, lowercase, number, and special character
- `newPassword` and `confirmPassword` must match

## Password Requirements

The new password must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&)

## Error Codes

- `00400`: Bad Request (validation errors)
- `00401`: Unauthorized (invalid tokens, suspended accounts)
- `00404`: Not Found (email not found)
- `00500`: Internal Server Error (email sending failures)

## Security Features

1. **Token Expiration**: All tokens expire in 15 minutes
2. **Email Verification**: OTP is sent to the registered email
3. **Token Validation**: Each step validates the previous token
4. **Account Status Check**: Suspended/rejected accounts cannot reset passwords

## Implementation Notes

### For Production:
1. **OTP Storage**: Implement proper OTP storage (Redis/database) with expiration
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Audit Logging**: Log all password reset attempts
4. **Email Templates**: Use proper HTML email templates
5. **OTP Verification**: Implement proper OTP verification from storage

### Current Implementation:
- Uses hardcoded OTP for testing
- Accepts any 6-digit OTP in verification step
- Logs OTP to console for testing purposes

## Testing

For testing purposes, the system:
- Generates random 6-digit OTPs
- Logs OTPs to console
- Accepts any 6-digit OTP in verification
- Uses 15-minute token expiration

## Example Flow

1. User requests password reset → receives OTP via email
2. User enters OTP → receives final reset token
3. User sets new password → password is updated
4. User can login with new password
