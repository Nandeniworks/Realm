import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  userAvatar: {
    type: String,
    default: ''
  },
  action: {
    type: String,
    enum: ['watched_movie', 'joined_realm', 'created_realm', 'became_friends', 'started_call'],
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  }
}, {
  timestamps: true
});

const Activity = mongoose.model('Activity', ActivitySchema);
export default Activity;
