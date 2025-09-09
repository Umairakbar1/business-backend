import express from 'express';
import { authorizedAccessAdmin } from '../../middleware/authorization.js';
import {
  updateFCMToken,
  removeFCMToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
  sendToBusiness,
  sendToAllBusinesses,
  sendToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
  createTestAdminNotification
} from '../../controllers/admin/notification.controller.js';

const router = express.Router();

// FCM Token Management
router.post('/:adminId/fcm-token', authorizedAccessAdmin, updateFCMToken);
router.delete('/:adminId/fcm-token', authorizedAccessAdmin, removeFCMToken);

// Notification Management
router.get('/:adminId', authorizedAccessAdmin, getNotifications);
router.patch('/:adminId/:notificationId/read', authorizedAccessAdmin, markAsRead);
router.patch('/:adminId/mark-all-read', authorizedAccessAdmin, markAllAsRead);
router.delete('/:adminId/:notificationId', authorizedAccessAdmin, deleteNotification);

// Notification Statistics
router.get('/:adminId/stats', authorizedAccessAdmin, getNotificationStats);

// Send Notifications
router.post('/send/business/:businessId', authorizedAccessAdmin, sendToBusiness);
router.post('/send/all-businesses', authorizedAccessAdmin, sendToAllBusinesses);
router.post('/send/topic/:topic', authorizedAccessAdmin, sendToTopic);

// Topic Management
router.post('/subscribe-topic', authorizedAccessAdmin, subscribeToTopic);
router.post('/unsubscribe-topic', authorizedAccessAdmin, unsubscribeFromTopic);

// Test endpoint
router.post('/test/:adminId', authorizedAccessAdmin, createTestAdminNotification);

export default router;
