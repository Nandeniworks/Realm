let cachedAccessToken = localStorage.getItem('realm_access_token') || null;

export const getAccessToken = () => cachedAccessToken;
export const setAccessToken = (token) => {
  cachedAccessToken = token;
  if (token) {
    localStorage.setItem('realm_access_token', token);
  } else {
    localStorage.removeItem('realm_access_token');
  }
};

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';

/**
 * Custom fetch wrapper that appends JWT Authorization header
 * and automatically retries requests on access token expiration (401).
 */
export const apiFetch = async (url, options = {}) => {
  options.headers = options.headers || {};

  const token = getAccessToken();
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Required to bypass Localtunnel's warning screen which blocks API CORS requests
  options.headers['Bypass-Tunnel-Reminder'] = 'true';

  // Set Content-Type: JSON by default if body is present and not form data
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const targetUrl = (url.startsWith('/') && API_BASE) ? `${API_BASE}${url}` : url;
  const response = await fetch(targetUrl, options);

  // Intercept 401 to handle expired tokens
  if (response.status === 401) {
    try {
      const clone = response.clone();
      const errorData = await clone.json();

      if (errorData.code === 'TOKEN_EXPIRED') {
        const refreshToken = localStorage.getItem('realm_refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        if (!isRefreshing) {
          isRefreshing = true;

          const refreshRes = await fetch('/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setAccessToken(refreshData.accessToken);
            isRefreshing = false;
            onRefreshed(refreshData.accessToken);
          } else {
            isRefreshing = false;
            // Token refresh failed (refresh token expired)
            setAccessToken(null);
            localStorage.removeItem('realm_refresh_token');
            localStorage.removeItem('realm_user');
            window.location.href = '/';
            return response;
          }
        }

        // Queue requests while token is refreshing, then retry
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            options.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(fetch(url, options));
          });
        });
      }
    } catch (e) {
      console.error('[API Client] Token auto-refresh intercept failed:', e);
    }
  }

  return response;
};
