import mongoose from 'mongoose';
import crypto from 'crypto';

const MemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'Ready'
  },
  statusType: {
    type: String,
    default: 'ready'
  },
  color: {
    type: String,
    default: 'lavender'
  },
  socketId: {
    type: String
  }
});

const VideoSchema = new mongoose.Schema({
  title: { type: String, default: 'Spirited Away' },
  duration: { type: String, default: '2h 5m' },
  videoId: { type: String, default: 'dQw4w9WgXcQ' },
  thumbnailUrl: { type: String, default: '' },
  channelTitle: { type: String, default: 'Studio Ghibli' },
  provider: { type: String, default: 'youtube' },
  views: { type: String, default: '4.2M views' },
  uploadDate: { type: String, default: 'Released 2001' }
});

const PlaybackSchema = new mongoose.Schema({
  videoId: { type: String, default: 'ByXuk9QqQkk' },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  playbackRate: { type: Number, default: 1.0 },
  hostId: { type: mongoose.Schema.Types.Mixed },
  lastUpdated: { type: Date, default: Date.now }
});

const QueueItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: String, default: '2h 0m' },
  videoId: { type: String, required: true },
  thumbnailUrl: { type: String, default: '' },
  channelTitle: { type: String, default: 'Studio Ghibli' },
  provider: { type: String, default: 'youtube' },
  addedBy: { type: String, default: 'Admin' }
});

const ReactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: String }]
}, { _id: false });

const ReplyToSchema = new mongoose.Schema({
  id: { type: String },
  sender: { type: String },
  text: { type: String }
}, { _id: false });

const ChatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  senderId: { type: String },
  sender: { type: String, required: true },
  text: { type: String, required: true },
  attachments: [{ type: String }],
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
  deleted: { type: Boolean, default: false },
  replyTo: ReplyToSchema,
  mentions: [{ type: String }],
  reactions: [ReactionSchema],
  readBy: [{ type: String }],
  timestamp: { type: String, required: true },
  color: { type: String, default: 'lavender' },
  isSystem: { type: Boolean, default: false },
  role: { type: String, default: 'guest' },
  createdAt: { type: Date, default: Date.now }
});

const PinnedMessageSchema = new mongoose.Schema({
  id: { type: String },
  sender: { type: String },
  text: { type: String },
  timestamp: { type: String },
  role: { type: String },
  edited: { type: Boolean, default: false }
});

const RealmSchema = new mongoose.Schema({
  realmId: {
    type: String,
    unique: true,
    index: true,
    default: () => crypto.randomUUID()
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    // Mixed accepts both real MongoDB ObjectIds and in-memory string IDs
    // (e.g. "user_1234") produced when Mongo is unavailable
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  theme: {
    type: String,
    default: 'moonlight-academy'
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  members: [{
    type: mongoose.Schema.Types.Mixed
  }],
  admins: [{
    type: mongoose.Schema.Types.Mixed
  }],
  
  // Compatibility overlays for the frontend code
  code: {
    type: String,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  currentMembers: {
    type: [MemberSchema],
    default: () => []
  },
  currentVideo: {
    type: VideoSchema,
    default: () => ({ 
      title: 'Spirited Away Official Trailer', 
      duration: '2h 5m',
      videoId: 'ByXuk9QqQkk',
      thumbnailUrl: 'https://img.youtube.com/vi/ByXuk9QqQkk/0.jpg',
      channelTitle: 'Madman Anime',
      provider: 'youtube',
      views: '12M views',
      uploadDate: 'Released 2001'
    })
  },
  playbackState: {
    type: PlaybackSchema,
    default: () => ({ isPlaying: false, progress: 0, currentTime: 0 })
  },
  queue: {
    type: [QueueItemSchema],
    default: () => [
      { 
        title: 'Princess Mononoke Trailer', 
        duration: '2m 14s', 
        videoId: '4OiMTOB71BI',
        thumbnailUrl: 'https://img.youtube.com/vi/4OiMTOB71BI/0.jpg',
        channelTitle: 'Madman Anime',
        provider: 'youtube',
        addedBy: 'Admin' 
      },
      { 
        title: 'Howls Moving Castle Trailer', 
        duration: '1m 59s', 
        videoId: 'iwROgK94yiM',
        thumbnailUrl: 'https://img.youtube.com/vi/iwROgK94yiM/0.jpg',
        channelTitle: 'Madman Anime',
        provider: 'youtube',
        addedBy: 'Admin' 
      }
    ]
  },
  chatMessages: {
    type: [ChatMessageSchema],
    default: () => []
  },
  pinnedMessage: {
    type: PinnedMessageSchema,
    default: null
  },
  history: {
    type: [VideoSchema],
    default: () => []
  },
  description: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  },
  privacy: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  maxMembers: {
    type: Number,
    default: 8
  },
  allowChat: {
    type: Boolean,
    default: true
  },
  allowReactions: {
    type: Boolean,
    default: true
  },
  allowQueueEditing: {
    type: Boolean,
    default: true
  },
  allowPlaybackControl: {
    type: Boolean,
    default: true
  },
  requireApproval: {
    type: Boolean,
    default: false
  },
  pendingRequests: [{
    userId: { type: String, required: true },
    name: { type: String, default: 'Guest' },
    avatar: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, ret) {
      delete ret._id;
      delete ret.__v;
      if (ret.currentMembers) {
        ret.currentMembers.forEach(m => delete m._id);
      }
      if (ret.queue) {
        ret.queue.forEach(q => delete q._id);
      }
      if (ret.chatMessages) {
        ret.chatMessages.forEach(c => delete c._id);
      }
      if (ret.currentVideo) delete ret.currentVideo._id;
      if (ret.playbackState) delete ret.playbackState._id;
      if (ret.pinnedMessage) delete ret.pinnedMessage._id;
      return ret;
    }
  }
});

// Auto-bind compatibility code and ownerId on save
RealmSchema.pre('save', function (next) {
  if (!this.code) this.code = this.inviteCode;
  if (!this.ownerId) this.ownerId = this.owner;
  
  // Keep members list synchronized with currentMembers array length
  this.currentMembers.forEach(m => {
    if (!this.members.includes(m.userId)) {
      this.members.push(m.userId);
    }
  });

  next();
});

const Realm = mongoose.model('Realm', RealmSchema);
export default Realm;
