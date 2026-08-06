import { apiFetch } from '../utils/apiClient';

export const socialApi = {
  getProfile: async (userId) => {
    const res = await apiFetch(`/social/profile/${userId || ''}`);
    return res.json();
  },

  updateProfile: async (data) => {
    const res = await apiFetch('/social/profile', {
      method: 'PATCH',
      body: data
    });
    return res.json();
  },

  getFriends: async () => {
    const res = await apiFetch('/social/friends');
    return res.json();
  },

  sendFriendRequest: async (targetUserId) => {
    const res = await apiFetch('/social/friends/request', {
      method: 'POST',
      body: { targetUserId }
    });
    return res.json();
  },

  respondFriendRequest: async (requestId, action) => {
    const res = await apiFetch('/social/friends/respond', {
      method: 'POST',
      body: { requestId, action }
    });
    return res.json();
  },

  removeFriend: async (friendId) => {
    const res = await apiFetch(`/social/friends/${friendId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  getNotifications: async () => {
    const res = await apiFetch('/social/notifications');
    return res.json();
  },

  markNotificationsRead: async () => {
    const res = await apiFetch('/social/notifications/read', {
      method: 'PATCH'
    });
    return res.json();
  },

  sendInvite: async (data) => {
    const res = await apiFetch('/social/invite', {
      method: 'POST',
      body: data
    });
    return res.json();
  },

  getActivities: async () => {
    const res = await apiFetch('/social/activities');
    return res.json();
  },

  blockUser: async (targetUserId) => {
    const res = await apiFetch('/social/block', {
      method: 'POST',
      body: { targetUserId }
    });
    return res.json();
  },

  searchGlobal: async (query) => {
    const res = await apiFetch(`/social/search?query=${encodeURIComponent(query)}`);
    return res.json();
  }
};

export default socialApi;
