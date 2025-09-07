import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to format private key properly
const formatPrivateKey = (privateKey) => {
  if (!privateKey) return null;
  
  // Replace \\n with actual newlines
  let formattedKey = privateKey.replace(/\\n/g, '\n');
  
  // Ensure proper line breaks in PEM format
  formattedKey = formattedKey.replace(/\n/g, '\n');
  
  // Validate PEM format
  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Private key missing BEGIN header');
  }
  
  if (!formattedKey.includes('-----END PRIVATE KEY-----')) {
    throw new Error('Private key missing END footer');
  }
  
  return formattedKey;
};

// Initialize Firebase Admin SDK
let firebaseApp;

try {
  // Check if Firebase is already initialized
  if (admin.apps.length === 0) {
    // Check if we have proper Firebase credentials
    const hasServiceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const hasRequiredEnvVars = process.env.FIREBASE_PRIVATE_KEY && 
                               process.env.FIREBASE_CLIENT_EMAIL && 
                               process.env.FIREBASE_PROJECT_ID;

    if (!hasServiceAccountKey && !hasRequiredEnvVars) {
      console.log('⚠️ Firebase Admin SDK credentials not found. Skipping Firebase initialization.');
      console.log('📝 To enable Firebase notifications, set up FIREBASE_SERVICE_ACCOUNT_KEY or required env vars.');
      firebaseApp = null;
    } else {
      // For development, you can use service account key file
      // For production, use environment variables
      let serviceAccount;
      
      if (hasServiceAccountKey) {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        } catch (parseError) {
          console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', parseError.message);
          throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON format');
        }
      } else {
        serviceAccount = {
          type: process.env.FIREBASE_TYPE || "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY,
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
          token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
        };
      }

      // Fix private key formatting
      if (serviceAccount.private_key) {
        try {
          serviceAccount.private_key = formatPrivateKey(serviceAccount.private_key);
          console.log('✅ Private key formatted correctly');
        } catch (keyError) {
          console.error('❌ Private key formatting error:', keyError.message);
          throw new Error(`Private key formatting failed: ${keyError.message}`);
        }
      }

      // Validate required fields
      if (!serviceAccount.project_id) {
        throw new Error('Firebase project_id is required');
      }
      if (!serviceAccount.private_key) {
        throw new Error('Firebase private_key is required');
      }
      if (!serviceAccount.client_email) {
        throw new Error('Firebase client_email is required');
      }

      console.log('🔥 Initializing Firebase Admin SDK with project:', serviceAccount.project_id);

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });

      console.log('✅ Firebase Admin SDK initialized successfully for project:', serviceAccount.project_id);
    }
  } else {
    firebaseApp = admin.app();
    console.log('✅ Firebase Admin SDK already initialized');
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  console.error('Error details:', error);
  // Don't throw error - app can still work without Firebase
  firebaseApp = null;
}

export default firebaseApp;
export { admin };
