import cron from 'node-cron';
import BoostQueueManager from './boostQueueManager.js';

class ScheduledTasks {
  /**
   * Initialize all scheduled tasks
   */
  static init() {
    console.log('Initializing scheduled tasks...');
    
    // Check boost expiry every minute
    this.scheduleBoostExpiryCheck();
    
    // Log task initialization
    console.log('Scheduled tasks initialized successfully');
  }

  /**
   * Schedule boost expiry check to run every minute
   */
  static scheduleBoostExpiryCheck() {
    // Run every minute
    cron.schedule('* * * * *', async () => {
      try {
        console.log('Running boost expiry check...');
        await BoostQueueManager.checkAndExpireBoosts();
      } catch (error) {
        console.error('Error in scheduled boost expiry check:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    console.log('Boost expiry check scheduled to run every minute');
  }

  /**
   * Manually trigger boost expiry check (for testing)
   */
  static async triggerBoostExpiryCheck() {
    try {
      console.log('Manually triggering boost expiry check...');
      await BoostQueueManager.checkAndExpireBoosts();
      console.log('Manual boost expiry check completed');
    } catch (error) {
      console.error('Error in manual boost expiry check:', error);
      throw error;
    }
  }

  /**
   * Get all scheduled tasks status
   */
  static getTasksStatus() {
    return {
      boostExpiryCheck: {
        schedule: 'Every minute (* * * * *)',
        description: 'Checks for expired boosts and activates next in queue',
        timezone: 'UTC'
      }
    };
  }
}

export default ScheduledTasks;
