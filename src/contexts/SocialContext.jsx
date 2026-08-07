import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socialApi from '../services/socialApi';
import { useAuth } from './AuthContext';

export const SocialContext = createContext(null);

export const SocialProvider = ({ children }) => {
  const { currentUser, socket } = useAuth();

  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activities, setActivities] = useState([]);
  const [userPresence, setUserPresence] = useState('online');

  // Load initial social data
  const refreshSocialData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [friendData, notifData, activityData] = await Promise.all([
        socialApi.getFriends().catch(() => ({ friends: [], pendingRequests: [] })),
        socialApi.getNotifications().catch(() => []),
        socialApi.getActivities().catch(() => [])
      ]);

      setFriends(friendData.friends || []);
      setPendingRequests(friendData.pendingRequests || []);
      setNotifications(notifData || []);
      setActivities(activityData || []);
    } catch (err) {
      console.error('Error refreshing social data:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshSocialData();
    } else {
      setFriends([]);
      setPendingRequests([]);
      setNotifications([]);
      setActivities([]);
    }
  }, [currentUser, refreshSocialData]);

  // Handle Socket.IO real-time social events
  useEffect(() => {
    if (!socket || !currentUser) return;

    // Incoming friend request
    const handleFriendRequest = (data) => {
      refreshSocialData();
    };

    // Friend request accepted
    const handleFriendAccepted = (data) => {
      refreshSocialData();
    };

    // Friend removed
    const handleFriendRemoved = ({ friendId }) => {
      setFriends(prev => prev.filter(f => f._id !== friendId));
    };

    // Presence update from friend
    const handlePresenceChanged = ({ userId, status }) => {
      setFriends(prev => prev.map(f => f._id === userId ? { ...f, presenceStatus: status } : f));
    };

    // Incoming notification created
    const handleNotificationCreated = (notif) => {
      setNotifications(prev => [notif, ...prev]);
    };

    // Incoming invite
    const handleInviteSent = (invite) => {
      refreshSocialData();
    };

    socket.on('friendRequest', handleFriendRequest);
    socket.on('friendAccepted', handleFriendAccepted);
    socket.on('friendRemoved', handleFriendRemoved);
    socket.on('presenceChanged', handlePresenceChanged);
    socket.on('notificationCreated', handleNotificationCreated);
    socket.on('inviteSent', handleInviteSent);

    return () => {
      socket.off('friendRequest', handleFriendRequest);
      socket.off('friendAccepted', handleFriendAccepted);
      socket.off('friendRemoved', handleFriendRemoved);
      socket.off('presenceChanged', handlePresenceChanged);
      socket.off('notificationCreated', handleNotificationCreated);
      socket.off('inviteSent', handleInviteSent);
    };
  }, [socket, currentUser, refreshSocialData]);

  // Change local presence status (online, away, watching, dnd, invisible)
  const setPresence = useCallback(async (status) => {
    setUserPresence(status);
    if (socket) {
      socket.emit('presenceChanged', { status });
    }
  }, [socket]);

  // Friend actions
  const sendFriendRequest = async (targetUserId) => {
    const res = await socialApi.sendFriendRequest(targetUserId);
    if (socket) {
      socket.emit('friendRequest', { targetUserId, senderData: currentUser });
    }
    refreshSocialData();
    return res;
  };

  const respondFriendRequest = async (requestId, action) => {
    const res = await socialApi.respondFriendRequest(requestId, action);
    if (socket && res.success && action === 'accept') {
      const reqItem = pendingRequests.find(r => r._id === requestId);
      if (reqItem) {
        socket.emit('friendAccepted', { targetUserId: reqItem.sender._id, userData: currentUser });
      }
    }
    refreshSocialData();
    return res;
  };

  const removeFriend = async (friendId) => {
    const res = await socialApi.removeFriend(friendId);
    if (socket) {
      socket.emit('friendRemoved', { targetUserId: friendId });
    }
    setFriends(prev => prev.filter(f => f._id !== friendId));
    return res;
  };

  // Notifications
  const markNotificationsRead = async () => {
    await socialApi.markNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Invites
  const sendInvite = async (data) => {
    const res = await socialApi.sendInvite(data);
    if (socket && res.success) {
      socket.emit('inviteSent', { targetUserId: data.receiverId, inviteData: data });
    }
    return res;
  };

  // Unread notification count
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const value = {
    friends,
    pendingRequests,
    notifications,
    activities,
    userPresence,
    unreadNotifCount,
    setPresence,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    markNotificationsRead,
    sendInvite,
    refreshSocialData
  };

  return (
    <SocialContext.Provider value={value}>
      {children}
    </SocialContext.Provider>
  );
};
