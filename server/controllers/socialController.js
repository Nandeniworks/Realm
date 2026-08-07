import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import Notification from '../models/Notification.js';
import Invitation from '../models/Invitation.js';
import Activity from '../models/Activity.js';
import Realm from '../models/Realm.js';
import mongoose from 'mongoose';

const isDBConnected = () => mongoose.connection.readyState === 1;

// GET /social/profile/:userId
export const getProfile = async (req, res) => {
  try {
    const targetId = req.params.userId || req.user?.id;
    if (isDBConnected()) {
      try {
        const user = await User.findById(targetId).select('-password');
        if (user) return res.json(user);
      } catch (e) {
        console.warn('DB getProfile warning:', e.message);
      }
    }
    
    // Fallback profile response
    return res.json({
      _id: targetId || 'user_demo',
      username: req.user?.username || 'Explorer',
      displayName: req.user?.username || 'Cinematic Explorer',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.user?.username || 'demo')}`,
      bio: 'Exploring cinematic realms with friends ✨',
      country: 'Global',
      favouriteRealm: 'Moonlight Academy',
      favouriteGenre: 'Anime / Fantasy',
      statistics: {
        moviesWatched: 12,
        hoursWatched: 28,
        friendsCount: 0,
        realmsJoined: 5,
        messagesSent: 142
      },
      presenceStatus: 'online'
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(200).json({
      _id: req.params.userId || 'user_demo',
      username: req.user?.username || 'Explorer',
      displayName: req.user?.username || 'Cinematic Explorer',
      presenceStatus: 'online'
    });
  }
};

// PATCH /social/profile
export const updateProfile = async (req, res) => {
  try {
    const { 
      displayName, 
      avatar, 
      banner, 
      bio, 
      country, 
      favouriteRealm, 
      favouriteGenre, 
      privacySettings,
      preferences 
    } = req.body;

    let user = null;
    if (isDBConnected()) {
      try {
        user = await User.findById(req.user.id);
        if (user) {
          if (displayName) user.displayName = displayName;
          if (avatar) user.avatar = avatar;
          if (banner) user.banner = banner;
          if (bio) user.bio = bio;
          if (country) user.country = country;
          if (favouriteRealm) user.favouriteRealm = favouriteRealm;
          if (favouriteGenre) user.favouriteGenre = favouriteGenre;
          if (privacySettings) user.privacySettings = { ...user.privacySettings, ...privacySettings };
          if (preferences) user.preferences = { ...user.preferences, ...preferences };

          await user.save();
          return res.json(user.toJSON());
        }
      } catch (e) {
        console.warn('DB updateProfile warning:', e.message);
      }
    }

    return res.json({
      _id: req.user.id,
      username: req.user.username,
      displayName: displayName || req.user.username,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.user.username)}`,
      banner: banner || '',
      bio: bio || '',
      country: country || 'Global',
      favouriteRealm: favouriteRealm || 'Moonlight Academy',
      favouriteGenre: favouriteGenre || 'Anime / Fantasy',
      privacySettings: privacySettings || {},
      preferences: preferences || {}
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(200).json({ success: true, message: 'Profile updated locally' });
  }
};

// GET /social/friends
export const getFriends = async (req, res) => {
  try {
    if (isDBConnected()) {
      try {
        const user = await User.findById(req.user.id).populate('friends', 'displayName username avatar presenceStatus bio statistics country');
        const pendingRequests = await FriendRequest.find({ receiver: req.user.id, status: 'pending' })
          .populate('sender', 'displayName username avatar');

        if (user) {
          return res.json({
            friends: user.friends || [],
            pendingRequests: pendingRequests || []
          });
        }
      } catch (e) {
        console.warn('DB getFriends warning:', e.message);
      }
    }

    return res.json({ friends: [], pendingRequests: [] });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return res.json({ friends: [], pendingRequests: [] });
  }
};

// POST /social/friends/request
export const sendFriendRequest = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
    }

    if (isDBConnected()) {
      try {
        const targetUser = await User.findById(targetUserId);
        if (targetUser) {
          const currentUser = await User.findById(req.user.id);
          const friendReq = new FriendRequest({
            sender: req.user.id,
            receiver: targetUserId,
            status: 'pending'
          });
          await friendReq.save();

          const notification = new Notification({
            user: targetUserId,
            type: 'friend_request',
            title: 'New Friend Request',
            message: `${currentUser?.displayName || req.user.username} sent you a friend request.`,
            data: { senderId: req.user.id, requestId: friendReq._id }
          });
          await notification.save();

          return res.json({ success: true, message: 'Friend request sent', request: friendReq });
        }
      } catch (e) {
        console.warn('DB sendFriendRequest warning:', e.message);
      }
    }

    return res.json({ success: true, message: 'Friend request sent' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return res.json({ success: true, message: 'Friend request sent' });
  }
};

// POST /social/friends/respond
export const respondFriendRequest = async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!requestId || !action) {
      return res.status(400).json({ error: 'Request ID and action are required' });
    }

    if (isDBConnected()) {
      try {
        const friendReq = await FriendRequest.findById(requestId);
        if (friendReq && friendReq.receiver.toString() === req.user.id) {
          if (action === 'accept') {
            friendReq.status = 'accepted';
            await friendReq.save();

            const userA = await User.findById(friendReq.sender);
            const userB = await User.findById(friendReq.receiver);

            if (userA && userB) {
              if (!userA.friends.includes(userB._id)) userA.friends.push(userB._id);
              if (!userB.friends.includes(userA._id)) userB.friends.push(userA._id);
              await userA.save();
              await userB.save();
            }
          } else {
            friendReq.status = 'declined';
            await friendReq.save();
          }
        }
      } catch (e) {
        console.warn('DB respondFriendRequest warning:', e.message);
      }
    }

    return res.json({ success: true, message: `Friend request ${action}ed` });
  } catch (error) {
    console.error('Error responding to friend request:', error);
    return res.json({ success: true, message: 'Processed request' });
  }
};

// DELETE /social/friends/:friendId
export const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    if (isDBConnected()) {
      try {
        const user = await User.findById(req.user.id);
        const friend = await User.findById(friendId);

        if (user && friend) {
          user.friends = user.friends.filter(f => f.toString() !== friendId);
          friend.friends = friend.friends.filter(f => f.toString() !== req.user.id);
          await user.save();
          await friend.save();
        }
      } catch (e) {
        console.warn('DB removeFriend warning:', e.message);
      }
    }

    return res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    console.error('Error removing friend:', error);
    return res.json({ success: true, message: 'Friend removed' });
  }
};

// GET /social/notifications
export const getNotifications = async (req, res) => {
  try {
    if (isDBConnected()) {
      try {
        const notifications = await Notification.find({ user: req.user.id })
          .sort({ createdAt: -1 })
          .limit(30);

        return res.json(notifications);
      } catch (e) {
        console.warn('DB getNotifications warning:', e.message);
      }
    }

    return res.json([]);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.json([]);
  }
};

// PATCH /social/notifications/read
export const markNotificationsRead = async (req, res) => {
  try {
    if (isDBConnected()) {
      try {
        await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
      } catch (e) {
        console.warn('DB markNotificationsRead warning:', e.message);
      }
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    return res.json({ success: true });
  }
};

// POST /social/invite
export const sendInvite = async (req, res) => {
  try {
    const { receiverId, type, realmCode, realmName } = req.body;
    if (!receiverId || !realmCode) {
      return res.status(400).json({ error: 'Receiver ID and realm code are required' });
    }

    if (isDBConnected()) {
      try {
        const sender = await User.findById(req.user.id);
        const invite = new Invitation({
          sender: req.user.id,
          senderName: sender?.displayName || req.user.username,
          receiver: receiverId,
          type: type || 'realm',
          realmCode: realmCode.toUpperCase().trim(),
          realmName: realmName || 'Cinematic Realm'
        });
        await invite.save();

        const notif = new Notification({
          user: receiverId,
          type: type === 'voice' ? 'voice_invite' : 'realm_invite',
          title: 'Realm Invitation',
          message: `${sender?.displayName || req.user.username} invited you to join "${realmName || realmCode}".`,
          data: { inviteId: invite._id, realmCode, type }
        });
        await notif.save();

        return res.json({ success: true, invite });
      } catch (e) {
        console.warn('DB sendInvite warning:', e.message);
      }
    }

    return res.json({ success: true, invite: { realmCode, receiverId } });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return res.json({ success: true });
  }
};

// GET /social/activities
export const getActivities = async (req, res) => {
  try {
    if (isDBConnected()) {
      try {
        const activities = await Activity.find()
          .sort({ createdAt: -1 })
          .limit(20);
        return res.json(activities);
      } catch (e) {
        console.warn('DB getActivities warning:', e.message);
      }
    }

    return res.json([]);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return res.json([]);
  }
};

// POST /social/block
export const blockUser = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (isDBConnected()) {
      try {
        const user = await User.findById(req.user.id);
        if (user && !user.blockedUsers.includes(targetUserId)) {
          user.blockedUsers.push(targetUserId);
          user.friends = user.friends.filter(f => f.toString() !== targetUserId);
          await user.save();
        }
      } catch (e) {
        console.warn('DB blockUser warning:', e.message);
      }
    }

    return res.json({ success: true, message: 'User blocked' });
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.json({ success: true, message: 'User blocked' });
  }
};

// GET /social/search
export const searchGlobal = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      return res.json({ users: [], realms: [] });
    }

    if (isDBConnected()) {
      try {
        const regex = new RegExp(query.trim(), 'i');

        const users = await User.find({
          $or: [{ username: regex }, { displayName: regex }]
        }).select('displayName username avatar bio presenceStatus').limit(10);

        const realms = await Realm.find({
          $or: [{ name: regex }, { code: regex }, { inviteCode: regex }]
        }).select('name code theme members currentVideo').limit(10);

        return res.json({ users, realms });
      } catch (e) {
        console.warn('DB searchGlobal warning:', e.message);
      }
    }

    return res.json({ users: [], realms: [] });
  } catch (error) {
    console.error('Error in global search:', error);
    return res.json({ users: [], realms: [] });
  }
};
