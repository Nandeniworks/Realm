import { apiFetch } from '../utils/apiClient';

export const createRealmApi = async ({ name, theme, privacy, maxMembers }) => {
  try {
    const response = await apiFetch('/realm/create', {
      method: 'POST',
      body: { name, theme, privacy, maxMembers }
    });
    
    if (response.ok) {
      return await response.json();
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to create realm (Status: ${response.status})`);
  } catch (err) {
    console.error('[API Service] createRealm error:', err.message);
    throw new Error(err.message || "Backend server is unreachable. Please verify backend server is running.");
  }
};

export const getRealmApi = async (codeOrId) => {
  const cleanCode = (codeOrId || '').toUpperCase().trim();
  try {
    const response = await apiFetch(`/realm/${cleanCode}`);
    if (response.ok) {
      return await response.json();
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Realm not found (Status: ${response.status})`);
  } catch (err) {
    console.error('[API Service] getRealm error:', err.message);
    throw new Error(err.message || "Backend server is unreachable. Please verify backend server is running.");
  }
};

export const joinRealmApi = async (inviteCode) => {
  const cleanCode = (inviteCode || '').toUpperCase().trim();
  try {
    const response = await apiFetch('/realm/join', {
      method: 'POST',
      body: { inviteCode: cleanCode }
    });
    
    if (response.ok) {
      return await response.json();
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Failed to join realm (Status: ${response.status})`);
  } catch (err) {
    console.error('[API Service] joinRealm error:', err.message);
    throw new Error(err.message || "Backend server is unreachable. Please verify backend server is running.");
  }
};

export const leaveRealmApi = async (realmId) => {
  try {
    const response = await apiFetch('/realm/leave', {
      method: 'POST',
      body: { realmId }
    });
    if (response.ok) return await response.json();
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to leave realm');
  } catch (err) {
    console.error('[API Service] leaveRealm error:', err.message);
    throw err;
  }
};

export const updateRealmApi = async (realmId, updatesOrAction) => {
  try {
    const response = await apiFetch('/realm/update', {
      method: 'PATCH',
      body: { realmId, ...updatesOrAction }
    });
    if (response.ok) return await response.json();
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to update realm');
  } catch (err) {
    console.error('[API Service] updateRealm error:', err.message);
    throw err;
  }
};

export const deleteRealmApi = async (realmId) => {
  try {
    const response = await apiFetch('/realm/delete', {
      method: 'DELETE',
      body: { realmId }
    });
    if (response.ok) return await response.json();
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to delete realm');
  } catch (err) {
    console.error('[API Service] deleteRealm error:', err.message);
    throw err;
  }
};
