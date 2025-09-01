import cron from 'node-cron';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const BOOST_QUEUE_ENDPOINT = `${API_BASE_URL}/api/business/subscriptions/boost-queue-management`;

// Function to call the boost queue management endpoint
async function handleBoostQueueManagement() {
  try {
    console.log(`[${new Date().toISOString()}] Starting boost queue management...`);
    
    const response = await axios.post(BOOST_QUEUE_ENDPOINT, {}, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log(`[${new Date().toISOString()}] Boost queue management completed successfully`);
      console.log(`Processed ${response.data.data.processedQueues} queues`);
      
      if (response.data.data.results && response.data.data.results.length > 0) {
        response.data.data.results.forEach(result => {
          if (result.actions && result.actions.length > 0) {
            console.log(`Category: ${result.categoryName} - ${result.actions.length} actions performed`);
            result.actions.forEach(action => {
              console.log(`  - ${action.action}: ${action.message}`);
            });
          }
        });
      }
    } else {
      console.error(`[${new Date().toISOString()}] Boost queue management failed:`, response.data.message);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in boost queue management:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Schedule the cron job to run every 5 minutes
// This ensures that boost activations and expirations are handled promptly
const cronSchedule = '*/5 * * * *'; // Every 5 minutes

console.log('Starting boost queue management cron job...');
console.log(`Schedule: ${cronSchedule}`);
console.log(`API Endpoint: ${BOOST_QUEUE_ENDPOINT}`);

// Start the cron job
const job = cron.schedule(cronSchedule, handleBoostQueueManagement, {
  scheduled: true,
  timezone: "UTC"
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nStopping boost queue management cron job...');
  job.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nStopping boost queue management cron job...');
  job.stop();
  process.exit(0);
});

// Run once immediately on startup
handleBoostQueueManagement();

console.log('Boost queue management cron job is running...');
