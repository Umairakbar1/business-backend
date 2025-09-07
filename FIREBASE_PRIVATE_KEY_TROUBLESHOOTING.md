# Firebase Private Key Troubleshooting Guide

## The Problem
You're getting: "Failed to parse private key: Error: Invalid PEM formatted message"

This happens when the private key in your `.env` file is not formatted correctly.

## How to Fix

### Step 1: Get Your Private Key from Firebase
1. Go to Firebase Console → Your Project → Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file

### Step 2: Extract the Private Key
Open the downloaded JSON file and find the `private_key` field. It should look like this:

```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
}
```

### Step 3: Format for .env File

**Option A: Use the entire JSON (Recommended)**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"business-website-c0710","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@business-website-c0710.iam.gserviceaccount.com",...}
```

**Option B: Use individual variables**
```bash
FIREBASE_PROJECT_ID=business-website-c0710
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@business-website-c0710.iam.gserviceaccount.com
```

## Common Mistakes

❌ **Wrong**: Missing quotes around private key
```bash
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
```

✅ **Correct**: Proper quotes and newlines
```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

❌ **Wrong**: Using actual line breaks in .env
```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
```

✅ **Correct**: Using \n for newlines
```bash
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## Quick Test

After updating your `.env` file, restart your server. You should see:
```
✅ Private key formatted correctly
✅ Firebase Admin SDK initialized successfully for project: business-website-c0710
```

If you still get errors, check:
1. Are there quotes around the private key?
2. Are newlines represented as \n?
3. Does the key start with -----BEGIN PRIVATE KEY-----?
4. Does the key end with -----END PRIVATE KEY-----?
