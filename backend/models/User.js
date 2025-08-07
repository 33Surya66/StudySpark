const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
        index: true // Indexing for faster username lookups
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true // Indexing for email lookups
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student',
        index: true // Indexing for role-based queries
    },
    profile: {
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        avatar: String,
        bio: { type: String, maxlength: 500 }
    },
    // Data Warehouse Analytics Fields
    analytics: {
        totalStudyTime: { type: Number, default: 0 }, // in minutes
        quizzesTaken: { type: Number, default: 0 },
        flashcardsCreated: { type: Number, default: 0 },
        studyRoomsJoined: { type: Number, default: 0 },
        lastActive: { type: Date, default: Date.now },
        joinDate: { type: Date, default: Date.now }
    },
    preferences: {
        preferredTopics: [{ type: String }],
        notificationSettings: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true }
        }
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true // Indexing for active user queries
    }
}, {
    timestamps: true,
    // Compound index for analytics queries
    indexes: [
        { 
            fields: { 
                'analytics.totalStudyTime': -1, 
                'analytics.quizzesTaken': -1 
            },
            name: 'user_activity_index'
        },
        {
            fields: { 
                'role': 1, 
                'isActive': 1 
            },
            name: 'role_active_index'
        }
    ]
});

// Pre-save middleware for data validation
userSchema.pre('save', function(next) {
    if (this.isModified('password')) {
        // Password hashing would be handled by bcrypt in the route
        console.log('Password modified, should be hashed');
    }
    next();
});

// Instance method to update analytics
userSchema.methods.updateAnalytics = function(activity, value = 1) {
    if (this.analytics[activity] !== undefined) {
        this.analytics[activity] += value;
    }
    this.analytics.lastActive = new Date();
    return this.save();
};

// Static method for data warehouse queries
userSchema.statics.getTopUsers = function(limit = 10) {
    return this.find({ isActive: true })
        .sort({ 'analytics.totalStudyTime': -1 })
        .limit(limit)
        .select('username analytics profile');
};

module.exports = mongoose.model('User', userSchema);
