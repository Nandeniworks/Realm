import express from 'express';
import {
  getProfile,
  updateProfile,
  getFriends,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  getNotifications,
  markNotificationsRead,
  sendInvite,
  getActivities,
  blockUser,
  searchGlobal
} from '../controllers/socialController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all social routes
router.use(authenticateToken);

router.get('/profile/:userId?', getProfile);
router.patch('/profile', updateProfile);

router.get('/friends', getFriends);
router.post('/friends/request', sendFriendRequest);
router.post('/friends/respond', respondFriendRequest);
router.delete('/friends/:friendId', removeFriend);

router.get('/notifications', getNotifications);
router.patch('/notifications/read', markNotificationsRead);

router.post('/invite', sendInvite);
router.get('/activities', getActivities);
router.post('/block', blockUser);
router.get('/search', searchGlobal);

export default router;
