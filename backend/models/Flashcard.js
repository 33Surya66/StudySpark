const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
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
    answer: { 
        type: String, 
        required: true,
        trim: true,
        maxlength: 2000
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
        timesStudied: { type: Number, default: 0 },
        timesCorrect: { type: Number, default: 0 },
        timesIncorrect: { type: Number, default: 0 },
        averageStudyTime: { type: Number, default: 0 }, // in seconds
        lastStudied: { type: Date, default: Date.now },
        masteryLevel: { type: Number, default: 0 }, // 0-100 percentage
        studySessions: { type: Number, default: 0 }
    },
    // Spaced repetition fields
    spacedRepetition: {
        nextReview: { type: Date, default: Date.now },
        interval: { type: Number, default: 1 }, // days
        easeFactor: { type: Number, default: 2.5 },
        consecutiveCorrect: { type: Number, default: 0 }
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true // Indexing for active flashcard queries
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
            name: 'flashcard_topic_difficulty_active_index'
        },
        {
            fields: { 
                'analytics.masteryLevel': -1, 
                'spacedRepetition.nextReview': 1 
            },
            name: 'mastery_review_index'
        },
        {
            fields: { 
                createdBy: 1, 
                createdAt: -1 
            },
            name: 'flashcard_creator_time_index'
        },
        {
            fields: { 
                'analytics.timesStudied': -1, 
                'analytics.masteryLevel': -1 
            },
            name: 'usage_mastery_index'
        }
    ]
});

// Pre-save middleware for analytics
flashcardSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Calculate mastery level based on correct/incorrect ratio
    if (this.analytics.timesStudied > 0) {
        const correctRatio = this.analytics.timesCorrect / this.analytics.timesStudied;
        this.analytics.masteryLevel = Math.round(correctRatio * 100);
    }
    
    next();
});

// Instance method to update analytics when flashcard is studied
flashcardSchema.methods.updateStudySession = function(isCorrect, studyTime) {
    this.analytics.timesStudied += 1;
    this.analytics.lastStudied = new Date();
    this.analytics.studySessions += 1;
    
    if (isCorrect) {
        this.analytics.timesCorrect += 1;
        this.spacedRepetition.consecutiveCorrect += 1;
    } else {
        this.analytics.timesIncorrect += 1;
        this.spacedRepetition.consecutiveCorrect = 0;
    }
    
    // Update average study time
    if (studyTime) {
        const currentAvg = this.analytics.averageStudyTime;
        const totalSessions = this.analytics.studySessions;
        this.analytics.averageStudyTime = ((currentAvg * (totalSessions - 1)) + studyTime) / totalSessions;
    }
    
    // Update spaced repetition algorithm
    this.updateSpacedRepetition(isCorrect);
    
    return this.save();
};

// Spaced repetition algorithm (SuperMemo 2)
flashcardSchema.methods.updateSpacedRepetition = function(isCorrect) {
    if (isCorrect) {
        // Increase interval based on ease factor
        this.spacedRepetition.interval = Math.max(1, 
            this.spacedRepetition.interval * this.spacedRepetition.easeFactor
        );
        
        // Slightly increase ease factor
        this.spacedRepetition.easeFactor = Math.max(1.3, 
            this.spacedRepetition.easeFactor + 0.1
        );
    } else {
        // Reset interval and decrease ease factor
        this.spacedRepetition.interval = 1;
        this.spacedRepetition.easeFactor = Math.max(1.3, 
            this.spacedRepetition.easeFactor - 0.2
        );
    }
    
    // Set next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + this.spacedRepetition.interval);
    this.spacedRepetition.nextReview = nextReview;
};

// Static method for data warehouse analytics
flashcardSchema.statics.getAnalytics = function() {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: null,
                totalFlashcards: { $sum: 1 },
                totalStudySessions: { $sum: '$analytics.studySessions' },
                avgMasteryLevel: { $avg: '$analytics.masteryLevel' },
                avgStudyTime: { $avg: '$analytics.averageStudyTime' },
                totalCorrect: { $sum: '$analytics.timesCorrect' },
                totalIncorrect: { $sum: '$analytics.timesIncorrect' }
            }
        }
    ]);
};

// Static method for topic-based analytics
flashcardSchema.statics.getTopicAnalytics = function() {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$topic',
                flashcardCount: { $sum: 1 },
                totalStudySessions: { $sum: '$analytics.studySessions' },
                avgMasteryLevel: { $avg: '$analytics.masteryLevel' },
                avgStudyTime: { $avg: '$analytics.averageStudyTime' }
            }
        },
        { $sort: { totalStudySessions: -1 } },
        { $limit: 10 }
    ]);
};

// Static method for due flashcards (spaced repetition)
flashcardSchema.statics.getDueFlashcards = function(userId, limit = 20) {
    const now = new Date();
    return this.find({
        createdBy: userId,
        isActive: true,
        'spacedRepetition.nextReview': { $lte: now }
    })
    .sort({ 'spacedRepetition.nextReview': 1 })
    .limit(limit);
};

// Static method for mastery-based analytics
flashcardSchema.statics.getMasteryAnalytics = function() {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: {
                    masteryRange: {
                        $cond: [
                            { $gte: ['$analytics.masteryLevel', 80] }, 'Mastered',
                            { $cond: [
                                { $gte: ['$analytics.masteryLevel', 50] }, 'Learning',
                                'Needs Review'
                            ]}
                        ]
                    }
                },
                count: { $sum: 1 },
                avgStudyTime: { $avg: '$analytics.averageStudyTime' }
            }
        },
        { $sort: { '_id.masteryRange': 1 } }
    ]);
};

module.exports = mongoose.model('Flashcard', flashcardSchema);
