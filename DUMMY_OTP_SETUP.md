# Dummy OTP Setup for Testing

## Current Configuration

The application is currently configured to use a **dummy OTP** for testing purposes instead of sending actual emails via SendGrid.

### Dummy OTP Code
**OTP: `775511`**

This OTP is used for all authentication flows:
- Business Owner Signup
- OTP Verification
- Password Reset
- OTP Resend

## What's Been Modified

### 1. SendGrid Email Sending Disabled
- All `sendEmail()` calls are commented out
- SendGrid import is commented out
- No actual emails are sent

### 2. Dummy OTP Implementation
- Business Owner Signup: Uses `"775511"`
- Password Reset: Uses `"775511"`
- OTP Verification: Checks against `"775511"`
- OTP Resend: Uses `"775511"`

### 3. Console Logging
- OTP values are logged to console for testing
- Look for `[TESTING] OTP for {email}: 775511` in your server logs

## Testing Flow

### Business Owner Signup
1. Call signup endpoint with user details
2. System generates OTP `775511` (no email sent)
3. Check console logs for OTP
4. Use `775511` for verification

### Password Reset
1. Call password reset endpoint with email
2. System generates OTP `775511` (no email sent)
3. Check console logs for OTP
4. Use `775511` for verification

## Environment Variables

To enable actual email sending later, you'll need these environment variables:

```bash
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_EMAIL_SEND_FROM=your_verified_sender_email@yourdomain.com
```

## Production Setup

When ready for production:

1. Uncomment the SendGrid import in `auth.controller.js`
2. Uncomment all `sendEmail()` calls
3. Replace dummy OTP with `generateOTP().toString()`
4. Set up proper environment variables
5. Implement proper OTP storage and verification (Redis/database)

## Current Status

✅ **Dummy OTP working** - Use `775511` for all OTP verifications  
✅ **SendGrid disabled** - No authentication errors  
✅ **Console logging** - Check server logs for OTP values  
⚠️ **No real emails** - All OTPs are dummy values
