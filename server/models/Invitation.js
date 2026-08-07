import mongoose from 'mongoose';

const InvitationSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['realm', 'voice', 'watch_session'],
    default: 'realm'
  },
  realmCode: {
    type: String,
    required: true
  },
  realmName: {
    type: String,
    default: 'Cinematic Realm'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // Default 10 minutes expiry
  }
}, {
  timestamps: true
});

const Invitation = mongoose.model('Invitation', InvitationSchema);
export default Invitation;
