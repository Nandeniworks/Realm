import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { registerRoomHandlers } from './handlers/roomHandler.js';
import { registerTypingHandlers } from './handlers/typingHandler.js';
import { registerVideoHandlers } from './handlers/videoHandler.js';
import { registerChatHandlers } from './handlers/chatHandler.js';
import { registerCallHandlers } from './handlers/callHandler.js';
import { registerSocialHandlers } from './handlers/socialHandler.js';

export const initSocketServer = (httpServer) => {
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['https://realm-delta.vercel.app', 'http://localhost:5173', 'http://localhost:3000'];

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // JWT Authentication middleware for Socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      socket.user = { id: `guest_${socket.id.slice(-6)}`, username: `Guest_${socket.id.slice(-4)}` };
      return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'realm_jwt_access_secret_key_2026_xYz', (err, decoded) => {
      if (err) {
        socket.user = { id: `guest_${socket.id.slice(-6)}`, username: `Guest_${socket.id.slice(-4)}` };
        return next();
      }
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log('Socket connected', socket.id);

    // Register modular feature handlers
    registerRoomHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerVideoHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);
    registerSocialHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};
