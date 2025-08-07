const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
    topic: { 
        type: String, 
        required: true,
        trim: true,
        index: true // Indexing for topic-based queries
    },
    question: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 1000
    },
    options: [{ 
        type: String, 
        required: true,
        trim: true
    }],
    answer: { 
        type: String, 
        required: true,
        trim: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium',
        index: true // Indexing for difficulty-based filtering
    },
    category: {
        type: String,
        trim: true,
        index: true // Indexing for category-based queries
    },
    tags: [{ 
        type: String, 
        trim: true,
        index: true // Indexing for tag-based searches
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true // Indexing for creator queries
    },
    // Data Warehouse Analytics Fields
    analytics: {
        timesUsed: { type: Number, default: 0 },
        correctAnswers: { type: Number, default: 0 },
        incorrectAnswers: { type: Number, default: 0 },
        averageResponseTime: { type: Number, default: 0 }, // in seconds
        lastUsed: { type: Date, default: Date.now }
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true // Indexing for active question queries
    },
    createdAt: { 
        type: Date, 
        default: Date.now,
        index: true // Indexing for chronological queries
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true,
    // Compound indexes for complex queries
    indexes: [
        {
            fields: { 
                topic: 1, 
                difficulty: 1, 
                isActive: 1 
            },
            name: 'topic_difficulty_active_index'
        },
        {
            fields: { 
                'analytics.timesUsed': -1, 
                'analytics.correctAnswers': -1 
            },
            name: 'usage_accuracy_index'
        },
        {
            fields: { 
                createdAt: -1, 
                isActive: 1 
            },
            name: 'creation_active_index'
        }
    ]
});

// Pre-save middleware for analytics
quizQuestionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Calculate accuracy percentage
    if (this.analytics.timesUsed > 0) {
        const accuracy = (this.analytics.correctAnswers / this.analytics.timesUsed) * 100;
        this.analytics.accuracyPercentage = Math.round(accuracy * 100) / 100;
    }
    
    next();
});

// Instance method to update analytics when question is used
quizQuestionSchema.methods.updateUsage = function(isCorrect, responseTime) {
    this.analytics.timesUsed += 1;
    this.analytics.lastUsed = new Date();
    
    if (isCorrect) {
        this.analytics.correctAnswers += 1;
    } else {
        this.analytics.incorrectAnswers += 1;
    }
    
    // Update average response time
    if (responseTime) {
        const currentAvg = this.analytics.averageResponseTime;
        const totalUses = this.analytics.timesUsed;
        this.analytics.averageResponseTime = ((currentAvg * (totalUses - 1)) + responseTime) / totalUses;
    }
    
    return this.save();
};

// Static method for data warehouse analytics
quizQuestionSchema.statics.getAnalytics = function() {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: null,
                totalQuestions: { $sum: 1 },
                totalUsage: { $sum: '$analytics.timesUsed' },
                avgAccuracy: { $avg: { $divide: ['$analytics.correctAnswers', { $max: ['$analytics.timesUsed', 1] }] } },
                avgResponseTime: { $avg: '$analytics.averageResponseTime' },
                mostUsedQuestion: { $max: '$analytics.timesUsed' }
            }
        }
    ]);
};

// Static method for topic-based analytics
quizQuestionSchema.statics.getTopicAnalytics = function() {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$topic',
                questionCount: { $sum: 1 },
                totalUsage: { $sum: '$analytics.timesUsed' },
                avgAccuracy: { $avg: { $divide: ['$analytics.correctAnswers', { $max: ['$analytics.timesUsed', 1] }] } },
                avgDifficulty: { $avg: { $cond: [
                    { $eq: ['$difficulty', 'easy'] }, 1,
                    { $cond: [{ $eq: ['$difficulty', 'medium'] }, 2, 3] }
                ]}}
            }
        },
        { $sort: { totalUsage: -1 } },
        { $limit: 10 }
    ]);
};

// Static method for difficulty-based analytics
quizQuestionSchema.statics.getDifficultyAnalytics = function() {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$difficulty',
                questionCount: { $sum: 1 },
                totalUsage: { $sum: '$analytics.timesUsed' },
                avgAccuracy: { $avg: { $divide: ['$analytics.correctAnswers', { $max: ['$analytics.timesUsed', 1] }] } }
            }
        },
        { $sort: { _id: 1 } }
    ]);
};

module.exports = mongoose.model('Quiz', quizQuestionSchema);
