const express = require('express');
const router = express.Router();
const User = require('../models/User');
const StudyRoom = require('../models/StudyRoom');
const Quiz = require('../models/Quiz');
const Flashcard = require('../models/Flashcard');
const Analytics = require('../models/Analytics');

// Middleware to authenticate admin users
const authenticateAdmin = async (req, res, next) => {
    try {
        // In a real app, you'd verify JWT token and check admin role
        // For now, we'll assume the request is authenticated
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

/**
 * @route GET /api/analytics/dashboard
 * @desc Get comprehensive analytics dashboard data
 * @access Admin only
 */
router.get('/dashboard', authenticateAdmin, async (req, res) => {
    try {
        // Get real-time analytics from all models
        const [
            userAnalytics,
            studyRoomAnalytics,
            quizAnalytics,
            flashcardAnalytics,
            systemHealth
        ] = await Promise.all([
            User.getTopUsers(10),
            StudyRoom.getAnalytics(),
            Quiz.getAnalytics(),
            Flashcard.getAnalytics(),
            Analytics.getPerformanceMetrics()
        ]);

        // Calculate summary metrics
        const totalUsers = await User.countDocuments({ isActive: true });
        const totalRooms = await StudyRoom.countDocuments({ status: 'active' });
        const totalQuestions = await Quiz.countDocuments({ isActive: true });
        const totalFlashcards = await Flashcard.countDocuments({ isActive: true });

        const dashboardData = {
            summary: {
                totalUsers,
                totalRooms,
                totalQuestions,
                totalFlashcards
            },
            userAnalytics,
            studyRoomAnalytics: studyRoomAnalytics[0] || {},
            quizAnalytics: quizAnalytics[0] || {},
            flashcardAnalytics: flashcardAnalytics[0] || {},
            systemHealth: systemHealth[0] || {}
        };

        res.json(dashboardData);
    } catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

/**
 * @route GET /api/analytics/users
 * @desc Get user analytics and trends
 * @access Admin only
 */
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const userAnalytics = await User.aggregate([
            {
                $match: {
                    'analytics.lastActive': { $gte: startDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$analytics.lastActive' },
                        month: { $month: '$analytics.lastActive' },
                        day: { $dayOfMonth: '$analytics.lastActive' }
                    },
                    activeUsers: { $sum: 1 },
                    totalStudyTime: { $sum: '$analytics.totalStudyTime' },
                    totalQuizzes: { $sum: '$analytics.quizzesTaken' },
                    totalFlashcards: { $sum: '$analytics.flashcardsCreated' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);

        const topUsers = await User.getTopUsers(20);
        const roleDistribution = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            trends: userAnalytics,
            topUsers,
            roleDistribution
        });
    } catch (error) {
        console.error('User analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch user analytics' });
    }
});

/**
 * @route GET /api/analytics/learning
 * @desc Get learning effectiveness analytics
 * @access Admin only
 */
router.get('/learning', authenticateAdmin, async (req, res) => {
    try {
        const [
            quizTopicAnalytics,
            flashcardTopicAnalytics,
            quizDifficultyAnalytics,
            flashcardMasteryAnalytics
        ] = await Promise.all([
            Quiz.getTopicAnalytics(),
            Flashcard.getTopicAnalytics(),
            Quiz.getDifficultyAnalytics(),
            Flashcard.getMasteryAnalytics()
        ]);

        // Calculate learning effectiveness metrics
        const learningMetrics = {
            quizEffectiveness: {
                topicBreakdown: quizTopicAnalytics,
                difficultyBreakdown: quizDifficultyAnalytics,
                overallAccuracy: quizTopicAnalytics.reduce((acc, topic) => 
                    acc + (topic.avgAccuracy || 0), 0) / Math.max(quizTopicAnalytics.length, 1)
            },
            flashcardEffectiveness: {
                topicBreakdown: flashcardTopicAnalytics,
                masteryBreakdown: flashcardMasteryAnalytics,
                overallMastery: flashcardTopicAnalytics.reduce((acc, topic) => 
                    acc + (topic.avgMasteryLevel || 0), 0) / Math.max(flashcardTopicAnalytics.length, 1)
            }
        };

        res.json(learningMetrics);
    } catch (error) {
        console.error('Learning analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch learning analytics' });
    }
});

/**
 * @route GET /api/analytics/study-rooms
 * @desc Get study room analytics and engagement metrics
 * @access Admin only
 */
router.get('/study-rooms', authenticateAdmin, async (req, res) => {
    try {
        const [
            roomAnalytics,
            topicAnalytics,
            activeRooms
        ] = await Promise.all([
            StudyRoom.getAnalytics(),
            StudyRoom.getTopicAnalytics(),
            StudyRoom.find({ status: 'active' })
                .sort({ 'analytics.lastActivity': -1 })
                .limit(10)
                .populate('createdBy', 'username')
        ]);

        const engagementMetrics = {
            totalRooms: roomAnalytics[0]?.totalRooms || 0,
            totalMessages: roomAnalytics[0]?.totalMessages || 0,
            avgMessagesPerRoom: roomAnalytics[0]?.avgMessagesPerRoom || 0,
            mostActiveRoom: roomAnalytics[0]?.mostActiveRoom || 0,
            topicBreakdown: topicAnalytics,
            activeRooms
        };

        res.json(engagementMetrics);
    } catch (error) {
        console.error('Study room analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch study room analytics' });
    }
});

/**
 * @route GET /api/analytics/data-warehouse
 * @desc Get data warehouse health and quality metrics
 * @access Admin only
 */
router.get('/data-warehouse', authenticateAdmin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const [
            dataWarehouseReport,
            trendAnalysis,
            healthCheck
        ] = await Promise.all([
            Analytics.getDataWarehouseReport(start, end),
            Analytics.getTrendAnalysis(30),
            Analytics.getDataWarehouseHealth()
        ]);

        const dataWarehouseMetrics = {
            report: dataWarehouseReport[0] || {},
            trends: trendAnalysis,
            health: healthCheck[0] || {},
            dataQuality: {
                completeness: healthCheck[0]?.avgCompleteness || 100,
                consistency: healthCheck[0]?.avgConsistency || 100,
                quality: healthCheck[0]?.avgDataQuality || 100,
                errors: healthCheck[0]?.totalTransformationErrors || 0
            }
        };

        res.json(dataWarehouseMetrics);
    } catch (error) {
        console.error('Data warehouse analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch data warehouse metrics' });
    }
});

/**
 * @route POST /api/analytics/generate
 * @desc Generate and store daily analytics snapshot
 * @access Admin only
 */
router.post('/generate', authenticateAdmin, async (req, res) => {
    try {
        const today = new Date();
        
        // Collect real-time metrics
        const [
            totalUsers,
            activeUsers,
            totalRooms,
            activeRooms,
            totalQuestions,
            totalFlashcards,
            quizAnalytics,
            flashcardAnalytics
        ] = await Promise.all([
            User.countDocuments({ isActive: true }),
            User.countDocuments({ 
                isActive: true, 
                'analytics.lastActive': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }),
            StudyRoom.countDocuments(),
            StudyRoom.countDocuments({ status: 'active' }),
            Quiz.countDocuments({ isActive: true }),
            Flashcard.countDocuments({ isActive: true }),
            Quiz.getAnalytics(),
            Flashcard.getAnalytics()
        ]);

        // Create analytics snapshot
        const analyticsSnapshot = new Analytics({
            date: today,
            period: 'daily',
            userMetrics: {
                totalUsers,
                activeUsers,
                newUsers: 0, // Would be calculated based on join date
                returningUsers: activeUsers,
                averageSessionDuration: 0, // Would be calculated from session data
                userRetentionRate: 0 // Would be calculated from historical data
            },
            studyRoomMetrics: {
                totalRooms,
                activeRooms,
                totalMessages: quizAnalytics[0]?.totalMessages || 0,
                averageMessagesPerRoom: 0,
                mostPopularTopics: []
            },
            quizMetrics: {
                totalQuestions: totalQuestions,
                questionsUsed: quizAnalytics[0]?.totalUsage || 0,
                totalAttempts: quizAnalytics[0]?.totalUsage || 0,
                correctAnswers: quizAnalytics[0]?.totalCorrect || 0,
                averageAccuracy: quizAnalytics[0]?.avgAccuracy || 0,
                averageResponseTime: quizAnalytics[0]?.avgResponseTime || 0,
                difficultyDistribution: {
                    easy: 0,
                    medium: 0,
                    hard: 0
                }
            },
            flashcardMetrics: {
                totalFlashcards: totalFlashcards,
                studySessions: flashcardAnalytics[0]?.totalStudySessions || 0,
                totalStudied: flashcardAnalytics[0]?.totalStudied || 0,
                correctAnswers: flashcardAnalytics[0]?.totalCorrect || 0,
                averageMasteryLevel: flashcardAnalytics[0]?.avgMasteryLevel || 0,
                spacedRepetitionEfficiency: 0
            },
            systemMetrics: {
                averageResponseTime: 0,
                databaseQueries: 0,
                cacheHitRate: 0,
                errorRate: 0,
                uptime: 100
            },
            learningMetrics: {
                averageStudyTime: 0,
                topicEngagement: [],
                learningProgress: {
                    beginners: 0,
                    intermediate: 0,
                    advanced: 0
                }
            }
        });

        await analyticsSnapshot.save();

        res.json({ 
            message: 'Analytics snapshot generated successfully',
            snapshot: analyticsSnapshot
        });
    } catch (error) {
        console.error('Analytics generation error:', error);
        res.status(500).json({ error: 'Failed to generate analytics snapshot' });
    }
});

/**
 * @route GET /api/analytics/export
 * @desc Export analytics data for reporting
 * @access Admin only
 */
router.get('/export', authenticateAdmin, async (req, res) => {
    try {
        const { format = 'json', startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const analyticsData = await Analytics.find({
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        if (format === 'csv') {
            // Convert to CSV format
            const csvData = analyticsData.map(record => ({
                date: record.date.toISOString().split('T')[0],
                activeUsers: record.userMetrics.activeUsers,
                totalRooms: record.studyRoomMetrics.totalRooms,
                quizAccuracy: record.quizMetrics.averageAccuracy,
                flashcardMastery: record.flashcardMetrics.averageMasteryLevel,
                systemUptime: record.systemMetrics.uptime,
                dataQuality: record.dataWarehouse.dataQuality
            }));

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
            
            // Convert to CSV string
            const csvString = [
                Object.keys(csvData[0]).join(','),
                ...csvData.map(row => Object.values(row).join(','))
            ].join('\n');

            res.send(csvString);
        } else {
            res.json(analyticsData);
        }
    } catch (error) {
        console.error('Analytics export error:', error);
        res.status(500).json({ error: 'Failed to export analytics data' });
    }
});

module.exports = router; 