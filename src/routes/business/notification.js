import express from 'express';
import { authorizedAccessBusiness } from '../../middleware/authorization.js';
import {
  updateFCMToken,
  removeFCMToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats
} from '../../controllers/business/notification.controller.js';

const router = express.Router();

// FCM Token Management
router.post('/:businessId/fcm-token', authorizedAccessBusiness, updateFCMToken);
router.delete('/:businessId/fcm-token', authorizedAccessBusiness, removeFCMToken);

// Notification Management
router.get('/:businessId', authorizedAccessBusiness, getNotifications);
router.patch('/:businessId/:notificationId/read', authorizedAccessBusiness, markAsRead);
router.patch('/:businessId/mark-all-read', authorizedAccessBusiness, markAllAsRead);
router.delete('/:businessId/:notificationId', authorizedAccessBusiness, deleteNotification);

// Notification Statistics
router.get('/:businessId/stats', authorizedAccessBusiness, getNotificationStats);

export default router;
