const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    // Data Warehouse Analytics
    date: {
        type: Date,
        required: true,
        index: true // Indexing for date-based queries
    },
    period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily',
        index: true // Indexing for period-based queries
    },
    
    // User Analytics
    userMetrics: {
        totalUsers: { type: Number, default: 0 },
        activeUsers: { type: Number, default: 0 },
        newUsers: { type: Number, default: 0 },
        returningUsers: { type: Number, default: 0 },
        averageSessionDuration: { type: Number, default: 0 }, // in minutes
        userRetentionRate: { type: Number, default: 0 } // percentage
    },
    
    // Study Room Analytics
    studyRoomMetrics: {
        totalRooms: { type: Number, default: 0 },
        activeRooms: { type: Number, default: 0 },
        totalMessages: { type: Number, default: 0 },
        averageMessagesPerRoom: { type: Number, default: 0 },
        mostPopularTopics: [{ 
            topic: String, 
            roomCount: Number,
            messageCount: Number 
        }]
    },
    
    // Quiz Analytics
    quizMetrics: {
        totalQuestions: { type: Number, default: 0 },
        questionsUsed: { type: Number, default: 0 },
        totalAttempts: { type: Number, default: 0 },
        correctAnswers: { type: Number, default: 0 },
        averageAccuracy: { type: Number, default: 0 }, // percentage
        averageResponseTime: { type: Number, default: 0 }, // seconds
        difficultyDistribution: {
            easy: { type: Number, default: 0 },
            medium: { type: Number, default: 0 },
            hard: { type: Number, default: 0 }
        }
    },
    
    // Flashcard Analytics
    flashcardMetrics: {
        totalFlashcards: { type: Number, default: 0 },
        studySessions: { type: Number, default: 0 },
        totalStudied: { type: Number, default: 0 },
        correctAnswers: { type: Number, default: 0 },
        averageMasteryLevel: { type: Number, default: 0 }, // percentage
        spacedRepetitionEfficiency: { type: Number, default: 0 } // percentage
    },
    
    // System Performance Metrics
    systemMetrics: {
        averageResponseTime: { type: Number, default: 0 }, // milliseconds
        databaseQueries: { type: Number, default: 0 },
        cacheHitRate: { type: Number, default: 0 }, // percentage
        errorRate: { type: Number, default: 0 }, // percentage
        uptime: { type: Number, default: 100 } // percentage
    },
    
    // Learning Analytics
    learningMetrics: {
        averageStudyTime: { type: Number, default: 0 }, // minutes per user
        topicEngagement: [{ 
            topic: String, 
            engagementScore: Number,
            userCount: Number 
        }],
        learningProgress: {
            beginners: { type: Number, default: 0 },
            intermediate: { type: Number, default: 0 },
            advanced: { type: Number, default: 0 }
        }
    },
    
    // Data Warehouse Specific Fields
    dataWarehouse: {
        lastUpdated: { type: Date, default: Date.now },
        dataQuality: { type: Number, default: 100 }, // percentage
        completeness: { type: Number, default: 100 }, // percentage
        consistency: { type: Number, default: 100 }, // percentage
        transformationErrors: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
    // Compound indexes for data warehouse queries
    indexes: [
        {
            fields: { 
                date: -1, 
                period: 1 
            },
            name: 'date_period_index'
        },
        {
            fields: { 
                'userMetrics.activeUsers': -1, 
                date: -1 
            },
            name: 'active_users_time_index'
        },
        {
            fields: { 
                'quizMetrics.averageAccuracy': -1, 
                'flashcardMetrics.averageMasteryLevel': -1 
            },
            name: 'learning_effectiveness_index'
        },
        {
            fields: { 
                'systemMetrics.averageResponseTime': 1, 
                'systemMetrics.errorRate': -1 
            },
            name: 'system_performance_index'
        }
    ]
});

// Pre-save middleware for data quality checks
analyticsSchema.pre('save', function(next) {
    // Calculate derived metrics
    if (this.quizMetrics.totalAttempts > 0) {
        this.quizMetrics.averageAccuracy = (this.quizMetrics.correctAnswers / this.quizMetrics.totalAttempts) * 100;
    }
    
    if (this.flashcardMetrics.totalStudied > 0) {
        this.flashcardMetrics.averageMasteryLevel = (this.flashcardMetrics.correctAnswers / this.flashcardMetrics.totalStudied) * 100;
    }
    
    // Calculate data quality score
    const qualityFactors = [
        this.dataWarehouse.completeness,
        this.dataWarehouse.consistency,
        this.systemMetrics.uptime
    ];
    this.dataWarehouse.dataQuality = qualityFactors.reduce((sum, factor) => sum + factor, 0) / qualityFactors.length;
    
    next();
});

// Static method for data warehouse aggregation
analyticsSchema.statics.getDataWarehouseReport = function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                avgActiveUsers: { $avg: '$userMetrics.activeUsers' },
                avgQuizAccuracy: { $avg: '$quizMetrics.averageAccuracy' },
                avgFlashcardMastery: { $avg: '$flashcardMetrics.averageMasteryLevel' },
                avgSystemUptime: { $avg: '$systemMetrics.uptime' },
                avgDataQuality: { $avg: '$dataWarehouse.dataQuality' },
                totalStudySessions: { $sum: '$flashcardMetrics.studySessions' },
                totalQuizAttempts: { $sum: '$quizMetrics.totalAttempts' },
                totalMessages: { $sum: '$studyRoomMetrics.totalMessages' }
            }
        }
    ]);
};

// Static method for trend analysis
analyticsSchema.statics.getTrendAnalysis = function(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        {
            $match: {
                date: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' },
                    day: { $dayOfMonth: '$date' }
                },
                activeUsers: { $avg: '$userMetrics.activeUsers' },
                quizAccuracy: { $avg: '$quizMetrics.averageAccuracy' },
                flashcardMastery: { $avg: '$flashcardMetrics.averageMasteryLevel' },
                systemUptime: { $avg: '$systemMetrics.uptime' }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
    ]);
};

// Static method for performance monitoring
analyticsSchema.statics.getPerformanceMetrics = function() {
    return this.aggregate([
        {
            $sort: { date: -1 }
        },
        {
            $limit: 1
        },
        {
            $project: {
                systemHealth: {
                    responseTime: '$systemMetrics.averageResponseTime',
                    errorRate: '$systemMetrics.errorRate',
                    uptime: '$systemMetrics.uptime',
                    cacheHitRate: '$systemMetrics.cacheHitRate'
                },
                learningEffectiveness: {
                    quizAccuracy: '$quizMetrics.averageAccuracy',
                    flashcardMastery: '$flashcardMetrics.averageMasteryLevel',
                    averageStudyTime: '$learningMetrics.averageStudyTime'
                },
                userEngagement: {
                    activeUsers: '$userMetrics.activeUsers',
                    retentionRate: '$userMetrics.userRetentionRate',
                    averageSessionDuration: '$userMetrics.averageSessionDuration'
                }
            }
        }
    ]);
};

// Static method for data warehouse health check
analyticsSchema.statics.getDataWarehouseHealth = function() {
    return this.aggregate([
        {
            $sort: { date: -1 }
        },
        {
            $limit: 7 // Last 7 days
        },
        {
            $group: {
                _id: null,
                avgDataQuality: { $avg: '$dataWarehouse.dataQuality' },
                avgCompleteness: { $avg: '$dataWarehouse.completeness' },
                avgConsistency: { $avg: '$dataWarehouse.consistency' },
                totalTransformationErrors: { $sum: '$dataWarehouse.transformationErrors' },
                lastUpdated: { $max: '$dataWarehouse.lastUpdated' }
            }
        }
    ]);
};

module.exports = mongoose.model('Analytics', analyticsSchema); 