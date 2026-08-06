import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import realmRoutes from './routes/realmRoutes.js';
import authRoutes from './routes/authRoutes.js';
import socialRoutes from './routes/socialRoutes.js';

import { createServer } from 'http';
import { initSocketServer } from './socket/index.js';

// Load environmental configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Allowed Origins for CORS
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['https://realm-delta.vercel.app', 'http://localhost:5173', 'http://localhost:3000'];

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any Vercel preview deployment for this project
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Reminder']
}));
app.use(express.json());

// Routes Mount
app.use('/auth', authRoutes);
app.use('/realm', realmRoutes);
app.use('/social', socialRoutes);

// Health probe API endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong inside the realm lounge.' });
});

const httpServer = createServer(app);

// Bind Socket.IO engine
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Realm Watch Party server listening on port ${PORT}`);
});
