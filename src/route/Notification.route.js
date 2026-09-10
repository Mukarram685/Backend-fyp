import express from 'express';
import { protect } from '../middleware/Auth.midleware.js';
import {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
} from '../controller/Notification/Notification.controller.js';

const NotificationRouter = express.Router();

NotificationRouter.use(protect);

NotificationRouter.get('/', getMyNotifications);
NotificationRouter.get('/my', getMyNotifications);
NotificationRouter.patch('/read-all', markAllNotificationsAsRead);
NotificationRouter.patch('/:id/read', markNotificationAsRead);
NotificationRouter.delete('/clear', clearAllNotifications);
NotificationRouter.delete('/:id', deleteNotification);

export default NotificationRouter;
