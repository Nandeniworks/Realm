import mongoose from 'mongoose';

const ReactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: String }] // usernames or userIds
}, { _id: false });

const ReplyToSchema = new mongoose.Schema({
  id: { type: String },
  sender: { type: String },
  text: { type: String }
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    index: true
  },
  realmCode: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  senderName: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  attachments: [{
    type: String
  }],
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  deleted: {
    type: Boolean,
    default: false
  },
  replyTo: ReplyToSchema,
  mentions: [{
    type: String
  }],
  reactions: [ReactionSchema],
  readBy: [{
    type: String
  }],
  color: {
    type: String,
    default: 'lavender'
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: 'guest'
  },
  timestamp: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const Message = mongoose.model('Message', MessageSchema);
export default Message;

