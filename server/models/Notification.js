import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['friend_request', 'realm_invite', 'voice_invite', 'friend_joined', 'movie_starting', 'owner_mention', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
