const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true // Indexing for message sender queries
    }, 
    text: { 
        type: String, 
        required: true, 
        minlength: 1,
        maxlength: 1000,
        trim: true
    }, 
    timestamp: { 
        type: Date, 
        default: Date.now, 
        index: true // Indexing for chronological message queries
    },
    messageType: {
        type: String,
        enum: ['text', 'file', 'link', 'quiz', 'flashcard'],
        default: 'text',
        index: true // Indexing for message type filtering
    },
    // Data Warehouse Analytics for Messages
    analytics: {
        readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        reactions: {
            like: { type: Number, default: 0 },
            helpful: { type: Number, default: 0 }
        }
    }
  },
  { timestamps: true } 
);

const StudyRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true // Indexing for room name searches
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true // Indexing for topic-based queries
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true // Indexing for member queries
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Indexing for creator queries
    },
    messages: [messageSchema],
    // Data Warehouse Analytics Fields
    analytics: {
      totalMessages: { type: Number, default: 0 },
      activeMembers: { type: Number, default: 0 },
      lastActivity: { type: Date, default: Date.now },
      studySessions: { type: Number, default: 0 },
      averageSessionDuration: { type: Number, default: 0 }, // in minutes
      popularTopics: [{ 
        topic: String, 
        messageCount: Number 
      }]
    },
    settings: {
      isPrivate: { type: Boolean, default: false },
      maxMembers: { type: Number, default: 50 },
      allowFileSharing: { type: Boolean, default: true },
      moderationEnabled: { type: Boolean, default: false }
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
      index: true // Indexing for status-based queries
    },
    tags: [{ 
      type: String, 
      trim: true,
      index: true // Indexing for tag-based searches
    }]
  },
  { 
    timestamps: true,
    // Compound indexes for complex queries
    indexes: [
      {
        fields: { 
          topic: 1, 
          status: 1, 
          'analytics.totalMessages': -1 
        },
        name: 'topic_status_activity_index'
      },
      {
        fields: { 
          createdBy: 1, 
          createdAt: -1 
        },
        name: 'creator_time_index'
      },
      {
        fields: { 
          'analytics.lastActivity': -1, 
          status: 1 
        },
        name: 'activity_status_index'
      }
    ]
  } 
);

// Pre-save middleware to update analytics
StudyRoomSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.analytics.totalMessages = this.messages.length;
    this.analytics.lastActivity = new Date();
    
    // Calculate active members (members who sent messages in last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSenders = new Set(
      this.messages
        .filter(msg => msg.timestamp > weekAgo)
        .map(msg => msg.sender.toString())
    );
    this.analytics.activeMembers = recentSenders.size;
  }
  next();
});

// Instance method to add message with analytics update
StudyRoomSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.analytics.totalMessages = this.messages.length;
  this.analytics.lastActivity = new Date();
  return this.save();
};

// Static method for data warehouse analytics
StudyRoomSchema.statics.getAnalytics = function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalRooms: { $sum: 1 },
        totalMessages: { $sum: '$analytics.totalMessages' },
        totalMembers: { $sum: { $size: '$members' } },
        avgMessagesPerRoom: { $avg: '$analytics.totalMessages' },
        mostActiveRoom: { $max: '$analytics.totalMessages' }
      }
    }
  ]);
};

// Static method for topic analysis
StudyRoomSchema.statics.getTopicAnalytics = function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$topic',
        roomCount: { $sum: 1 },
        totalMessages: { $sum: '$analytics.totalMessages' },
        totalMembers: { $sum: { $size: '$members' } }
      }
    },
    { $sort: { totalMessages: -1 } },
    { $limit: 10 }
  ]);
};

module.exports = mongoose.model('StudyRoom', StudyRoomSchema);
