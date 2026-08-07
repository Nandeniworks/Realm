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

const buildUrl = (url) => (url.startsWith('/') && API_BASE) ? `${API_BASE}${url}` : url;

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

  // Set Content-Type: JSON by default if body is present and not form data
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const targetUrl = buildUrl(url);
  const response = await fetch(targetUrl, options);

  // Intercept 401 to handle expired tokens
  if (response.status === 401) {
    try {
      const clone = response.clone();
      const errorData = await clone.json();

      if (errorData.code === 'TOKEN_EXPIRED') {
        const refreshToken = localStorage.getItem('realm_refresh_token');
        if (!refreshToken) {
          return response;
        }

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            // BUG FIX: this previously called relative '/auth/refresh' with
            // no API_BASE prefix. In production (Vercel frontend + Railway
            // backend on different origins) that hit Vercel itself instead
            // of the real backend, which rewrites everything to index.html
            // per vercel.json -- so this always "failed" and forced a hard
            // logout on every access-token expiry (~15 min) for every user.
            const refreshRes = await fetch(buildUrl('/auth/refresh'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              setAccessToken(refreshData.accessToken);
              onRefreshed(refreshData.accessToken);
            } else if (refreshRes.status === 401) {
              // The refresh token itself was explicitly rejected -- this is
              // the only case where destroying the session is correct.
              setAccessToken(null);
              localStorage.removeItem('realm_refresh_token');
              localStorage.removeItem('realm_user');
              onRefreshed(null);
              window.location.href = '/';
              return response;
            } else {
              // Transient server error (5xx, backend restarting, etc). Do
              // NOT destroy the session over this.
              onRefreshed(null);
            }
          } catch (networkErr) {
            console.error('[API Client] Token refresh network error:', networkErr);
            onRefreshed(null);
          } finally {
            // Must always reset this -- otherwise one failed refresh
            // permanently wedges every future request waiting forever.
            isRefreshing = false;
          }

          return response;
        }

        // Queue requests while token is refreshing, then retry with the
        // new token once it resolves (also fixed to use API_BASE).
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            if (!newToken) {
              resolve(response);
              return;
            }
            options.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(fetch(targetUrl, options));
          });
        });
      }
    } catch (e) {
      console.error('[API Client] Token auto-refresh intercept failed:', e);
    }
  }

  return response;
};
