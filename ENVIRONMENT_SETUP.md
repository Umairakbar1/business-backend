# Simplified User Authentication Setup

## Required Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Database Configuration
DB_URI=mongodb://localhost:27017/your_database_name
# or for MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/database_name

# JWT Configuration
JWT_SECRET_KEY=your_super_secret_jwt_key_for_users_min_32_chars
JWT_SECRET_KEY_ADMIN=your_super_secret_jwt_key_for_admins_min_32_chars
JWT_EXPIRES_IN=24h
JWT_EXPIRES_IN_ADMIN=24h

# Server Configuration
PORT=3000
SERVER_IP=localhost

# SendGrid Configuration (for email OTP)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_EMAIL_SEND_FROM=your_verified_sender@yourdomain.com

# Google OAuth (optional - for social login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## How to Get These Secrets

### 1. **JWT Secrets**
Generate strong random strings (at least 32 characters):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. **Database URI**
- **Local MongoDB**: `mongodb://localhost:27017/your_database_name`
- **MongoDB Atlas**: Get from your MongoDB Atlas dashboard

### 3. **SendGrid (for email OTP)**
- Sign up at [sendgrid.com](https://sendgrid.com)
- Get API key from dashboard
- Verify sender email address

### 4. **Google OAuth (optional)**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a project and enable Google+ API
- Create OAuth 2.0 credentials
- Get Client ID and Client Secret

## Available API Endpoints

### User Authentication Routes (`/api/user/auth`)

#### Public Routes (no authentication required)
- `POST /register` - Register with email and password
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phoneNumber": "+1234567890"
  }
  ```

- `POST /login` - Login with email and password
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `POST /send-otp` - Send OTP to email
  ```json
  {
    "email": "john@example.com"
  }
  ```

- `POST /verify-otp` - Verify OTP
  ```json
  {
    "email": "john@example.com",
    "otp": "123456"
  }
  ```

- `POST /google-auth` - Google social login
  ```json
  {
    "googleId": "google_user_id",
    "name": "John Doe",
    "email": "john@gmail.com",
    "profilePhoto": "https://example.com/photo.jpg"
  }
  ```

#### Protected Routes (require authentication)
- `PUT /password` - Update password
  ```json
  {
    "currentPassword": "oldpassword",
    "newPassword": "newpassword"
  }
  ```

- `PUT /profile` - Update profile
  ```json
  {
    "name": "John Smith",
    "profilePhoto": "https://example.com/new-photo.jpg"
  }
  ```

- `DELETE /profile` - Delete profile

### Admin Routes (`/api/admin/*`)
- `/auth` - Admin authentication
- `/users` - User management
- `/business` - Business management
- `/blogs` - Blog management
- `/category` - Category management
- `/subcategory` - Subcategory management

## User Model Schema

```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required unless using Google auth),
  phoneNumber: String (unique, optional),
  profilePhoto: String (default placeholder),
  googleId: String (unique, optional),
  isEmailVerified: Boolean (default false),
  isPhoneVerified: Boolean (default false),
  otp: { code: String, expiresAt: Date },
  status: String (enum: "active", "inactive", "banned")
}
```

## Features

### ✅ **Implemented**
- User registration with email and password
- User login with email and password
- Email OTP verification
- Password update (with current password verification)
- Profile update (name and profile photo)
- Profile deletion
- Google social authentication
- JWT token-based authentication
- Password hashing with bcrypt
- Email verification status tracking

### 🔧 **Security Features**
- Password hashing with bcrypt
- JWT token authentication
- Protected routes with middleware
- OTP expiration (10 minutes)
- Email verification
- Account status management

## Running the Application

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Create `.env` file with your secrets

3. Start the server:
```bash
npm start
# or
yarn start
```

4. For development with auto-restart:
```bash
npm run nodemon
# or
yarn nodemon
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## Testing the API

You can test the endpoints using tools like Postman, Insomnia, or curl:

```bash
# Register a new user
curl -X POST http://localhost:3000/api/user/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/user/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Send OTP
curl -X POST http://localhost:3000/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'
``` 