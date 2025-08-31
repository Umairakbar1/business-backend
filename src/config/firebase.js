import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
let firebaseApp;

try {
  // Check if Firebase is already initialized
  if (admin.apps.length === 0) {
    // For development, you can use service account key file
    // For production, use environment variables
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : {
          type: process.env.FIREBASE_TYPE || "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
          token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
        };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    firebaseApp = admin.app();
    console.log('✅ Firebase Admin SDK already initialized');
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  // Don't throw error - app can still work without Firebase
}

export default firebaseApp;
export { admin };
