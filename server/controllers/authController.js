import User from '../models/User.js';
import Session from '../models/Session.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// Helper to generate access & refresh tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET || 'realm_jwt_access_secret_key_2026_xYz',
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'realm_jwt_refresh_secret_key_2026_AbC',
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
  );

  return { accessToken, refreshToken };
};

// In-memory store fallback for demo environments without live MongoDB instance
const inMemoryUsers = new Map();

// Helper to check DB connection
const isDBConnected = () => mongoose.connection.readyState === 1;

// Create a database session tracking the refresh token
const createDBSession = async (userId, refreshToken) => {
  if (!isDBConnected()) return;
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const session = new Session({
      user: userId,
      token: refreshToken,
      expiresAt
    });
    await session.save();
  } catch (err) {
    console.warn('Session save warning:', err.message);
  }
};

// POST /auth/register
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    let existingUser = null;
    if (isDBConnected()) {
      try {
        existingUser = await User.findOne({ username });
      } catch (e) {
        console.warn('DB findOne warning:', e.message);
      }
    } else {
      existingUser = inMemoryUsers.get(username);
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    let userObj;
    if (isDBConnected()) {
      try {
        const user = new User({
          username,
          displayName: username,
          email,
          password,
          provider: 'local'
        });
        await user.save();
        userObj = user.toJSON();
      } catch (dbErr) {
        console.warn('User save warning, using memory store:', dbErr.message);
      }
    }

    if (!userObj) {
      userObj = {
        _id: `user_${Date.now()}`,
        username,
        displayName: username,
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
        provider: 'local',
        friends: [],
        realms: []
      };
      inMemoryUsers.set(username, userObj);
    }

    const { accessToken, refreshToken } = generateTokens(userObj);
    await createDBSession(userObj._id, refreshToken);

    return res.status(201).json({
      user: userObj,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal registration error' });
  }
};

// POST /auth/login
export const login = async (req, res) => {
  try {
    const { username, password, isGuest, guestName } = req.body;

    // Guest login emulation under unified JWT pipeline
    if (isGuest) {
      const randomId = Math.floor(Math.random() * 100000);
      const name = guestName?.trim() || `Guest_${randomId}`;
      const uniqueUsername = `guest_${randomId}`;
      
      let userObj;
      if (isDBConnected()) {
        try {
          const guestUser = new User({
            username: uniqueUsername,
            displayName: name,
            password: `guest_secret_pass_${randomId}`,
            provider: 'guest'
          });
          await guestUser.save();
          userObj = guestUser.toJSON();
        } catch (e) {
          console.warn('DB guest save warning:', e.message);
        }
      }

      if (!userObj) {
        userObj = {
          _id: `guest_${randomId}`,
          username: uniqueUsername,
          displayName: name,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uniqueUsername)}`,
          provider: 'guest',
          friends: [],
          realms: []
        };
      }

      const { accessToken, refreshToken } = generateTokens(userObj);
      await createDBSession(userObj._id, refreshToken);

      return res.json({
        user: userObj,
        accessToken,
        refreshToken
      });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    let user = null;
    if (isDBConnected()) {
      try {
        user = await User.findOne({ username });
      } catch (e) {
        console.warn('DB findOne login warning:', e.message);
      }
    }

    if (!user) {
      user = inMemoryUsers.get(username);
    }

    if (user && isDBConnected() && typeof user.comparePassword === 'function') {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
    }

    if (!user) {
      // Auto-create local user on login for seamless demo access
      user = {
        _id: `user_${Date.now()}`,
        username,
        displayName: username,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
        provider: 'local',
        friends: [],
        realms: []
      };
      inMemoryUsers.set(username, user);
    }

    const userPayload = typeof user.toJSON === 'function' ? user.toJSON() : user;
    const { accessToken, refreshToken } = generateTokens(userPayload);
    await createDBSession(userPayload._id, refreshToken);

    return res.json({
      user: userPayload,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal login error' });
  }
};

// POST /auth/google
export const googleLogin = async (req, res) => {
  try {
    const { email, displayName, avatar, uid } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Google email is required' });
    }

    let user = null;
    if (isDBConnected()) {
      try {
        user = await User.findOne({ email });
      } catch (e) {
        console.warn('DB findOne googleLogin warning:', e.message);
      }
    }

    if (!user) {
      // Check in memory store
      user = Array.from(inMemoryUsers.values()).find(u => u.email === email);
    }

    if (!user) {
      const generatedUsername = `google_${uid ? uid.slice(-6) : Math.floor(Math.random() * 100000)}`;
      if (isDBConnected()) {
        try {
          const newUser = new User({
            username: generatedUsername,
            displayName: displayName || 'Google Explorer',
            email,
            avatar: avatar || '',
            password: `google_dummy_secret_${Math.random()}`,
            provider: 'google'
          });
          await newUser.save();
          user = newUser;
        } catch (dbErr) {
          console.warn('Google DB save warning, using memory store:', dbErr.message);
        }
      }

      if (!user) {
        user = {
          _id: `google_${Date.now()}`,
          username: generatedUsername,
          displayName: displayName || 'Google Explorer',
          email,
          avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(generatedUsername)}`,
          provider: 'google',
          friends: [],
          realms: []
        };
        inMemoryUsers.set(generatedUsername, user);
      }
    } else if (isDBConnected() && typeof user.save === 'function') {
      if (displayName) user.displayName = displayName;
      if (avatar) user.avatar = avatar;
      await user.save();
    }

    const userPayload = typeof user.toJSON === 'function' ? user.toJSON() : user;
    const { accessToken, refreshToken } = generateTokens(userPayload);
    await createDBSession(userPayload._id, refreshToken);

    return res.json({
      user: userPayload,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ error: 'Internal Google auth error' });
  }
};

// POST /auth/refresh
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    if (isDBConnected()) {
      try {
        const session = await Session.findOne({ token: refreshToken });
        if (!session) {
          return res.status(401).json({ error: 'Session expired or invalid refresh token' });
        }
      } catch (e) {
        console.warn('Session check warning:', e.message);
      }
    }

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'realm_jwt_refresh_secret_key_2026_AbC',
      async (err, decoded) => {
        if (err) {
          if (isDBConnected()) {
            try { await Session.deleteOne({ token: refreshToken }); } catch (_) {}
          }
          return res.status(401).json({ error: 'Invalid refresh token' });
        }

        let user = null;
        if (isDBConnected()) {
          try {
            user = await User.findById(decoded.id);
          } catch (_) {}
        }

        if (!user) {
          user = Array.from(inMemoryUsers.values()).find(u => u._id === decoded.id || u.username === decoded.username);
        }

        const userId = user ? user._id : decoded.id;
        const username = user ? user.username : (decoded.username || 'Traveler');

        const accessToken = jwt.sign(
          { id: userId, username },
          process.env.JWT_SECRET || 'realm_jwt_access_secret_key_2026_xYz',
          { expiresIn: ACCESS_TOKEN_EXPIRY }
        );

        return res.json({ accessToken });
      }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Internal refresh error' });
  }
};

// POST /auth/logout
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && isDBConnected()) {
      try {
        await Session.deleteOne({ token: refreshToken });
      } catch (_) {}
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal logout error' });
  }
};

// GET /auth/me
export const getMe = async (req, res) => {
  try {
    let user = null;
    if (isDBConnected()) {
      try {
        user = await User.findById(req.user.id);
      } catch (_) {}
    }

    if (!user) {
      user = Array.from(inMemoryUsers.values()).find(u => u._id === req.user.id || u.username === req.user.username);
    }

    if (!user && req.user) {
      // Fallback user object constructed from token payload
      user = {
        _id: req.user.id,
        username: req.user.username,
        displayName: req.user.username,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.user.username || 'guest')}`,
        provider: 'local',
        friends: [],
        realms: []
      };
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userObj = typeof user.toJSON === 'function' ? user.toJSON() : user;
    return res.json(userObj);
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
};
