import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
  user: {
    // String covers both real MongoDB ObjectIds (stored as string) and
    // in-memory demo IDs like "user_1234" — no ObjectId cast needed here
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // MongoDB TTL index to auto-delete expired sessions
  }
}, {
  timestamps: true
});

const Session = mongoose.model('Session', SessionSchema);
export default Session;
