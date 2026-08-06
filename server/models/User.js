import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  banner: {
    type: String,
    default: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&q=80'
  },
  bio: {
    type: String,
    default: 'Exploring cinematic realms with friends ✨'
  },
  country: {
    type: String,
    default: 'Global'
  },
  favouriteRealm: {
    type: String,
    default: 'Moonlight Academy'
  },
  favouriteGenre: {
    type: String,
    default: 'Anime / Fantasy'
  },
  recentlyWatched: [{
    title: { type: String },
    videoId: { type: String },
    watchedAt: { type: Date, default: Date.now }
  }],
  statistics: {
    moviesWatched: { type: Number, default: 12 },
    hoursWatched: { type: Number, default: 28 },
    friendsCount: { type: Number, default: 0 },
    realmsJoined: { type: Number, default: 5 },
    messagesSent: { type: Number, default: 142 },
    voiceCallHours: { type: Number, default: 16 },
    videoCallHours: { type: Number, default: 8 },
    favouriteTheme: { type: String, default: 'moonlight-academy' }
  },
  presenceStatus: {
    type: String,
    enum: ['online', 'offline', 'away', 'watching', 'in_voice', 'in_realm', 'dnd', 'invisible'],
    default: 'online'
  },
  privacySettings: {
    whoCanMessage: { type: String, default: 'everyone' },
    whoCanInvite: { type: String, default: 'everyone' },
    whoCanAddFriend: { type: String, default: 'everyone' },
    profileVisibility: { type: String, default: 'public' },
    activityVisibility: { type: String, default: 'public' }
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'guest'],
    default: 'local'
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  mutedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  realms: [{
    type: String // Stores code/inviteCode or realmId
  }],
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({
      favoriteThemes: ['moonlight-academy']
    })
  }
}, {
  timestamps: true
});

// Pre-save middleware to hash password and assign avatar
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Assign a default bot avatar seed based on username if none is supplied
    if (!this.avatar) {
      this.avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(this.username)}`;
    }
    
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare input password with stored hash
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Transform output to remove password hash and other internal properties
UserSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', UserSchema);
export default User;
