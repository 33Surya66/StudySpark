const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/User');
const StudyRoom = require('./models/StudyRoom');
const Flashcard = require('./models/Flashcard');
const QuizQuestion = require('./models/Quiz');
const studyRoomSocket = require('./sockets/studyRoomSocket');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Updated CORS configuration for Express
app.use(cors({
  origin: ['https://studysparkflash.vercel.app', 'http://localhost:3000', 'http://localhost:3001'], // Specific origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // Cache preflight request results for 24 hours
}));

// Updated Socket.IO server with more detailed CORS configuration
const io = new Server(server, {
  cors: {
    origin: ['https://studysparkflash.vercel.app', 'http://localhost:3000', 'http://localhost:3001'], // Specific origins
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
});

const studyRoomRoutes = require('./routes/studyRoomRoutes')(io);
const analyticsRoutes = require('./routes/analyticsRoutes');

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in the .env file");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Helper function for system performance metrics
async function getSystemPerformanceMetrics() {
    const startTime = Date.now();
    
    try {
        // Test database performance
        await User.findOne().limit(1); // Fast index lookup test
        const dbResponseTime = Date.now() - startTime;
        
        return {
            databaseResponseTime: dbResponseTime,
            serverUptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            databaseResponseTime: -1,
            error: 'Performance monitoring failed',
            timestamp: new Date().toISOString()
        };
    }
}

// Helper function for learning effectiveness calculation
async function calculateLearningEffectiveness() {
    try {
        const [quizStats, studyTimeStats] = await Promise.all([
            User.aggregate([
                {
                    $group: {
                        _id: null,
                        totalQuizzes: { $sum: '$analytics.quizzesTaken' },
                        averageQuizzes: { $avg: '$analytics.quizzesTaken' },
                        activeUsers: { $sum: { $cond: [{ $gt: ['$analytics.quizzesTaken', 0] }, 1, 0] } }
                    }
                }
            ]),
            User.aggregate([
                {
                    $group: {
                        _id: null,
                        totalStudyTime: { $sum: '$analytics.totalStudyTime' },
                        averageStudyTime: { $avg: '$analytics.totalStudyTime' },
                        activeStudents: { $sum: { $cond: [{ $gt: ['$analytics.totalStudyTime', 0] }, 1, 0] } }
                    }
                }
            ])
        ]);
        
        return {
            quizEngagement: quizStats[0] || { totalQuizzes: 0, averageQuizzes: 0, activeUsers: 0 },
            studyTimeMetrics: studyTimeStats[0] || { totalStudyTime: 0, averageStudyTime: 0, activeStudents: 0 },
            calculatedAt: new Date().toISOString()
        };
    } catch (error) {
        return {
            error: 'Failed to calculate learning effectiveness',
            calculatedAt: new Date().toISOString()
        };
    }
}

// Helper function for index performance testing
async function runIndexPerformanceTests() {
    const tests = [];
    
    try {
        // Test 1: Username lookup performance (uses index)
        let startTime = Date.now();
        await User.findOne({ username: 'testuser123' });
        tests.push({
            test: 'Username Lookup (Indexed)',
            responseTime: Date.now() - startTime,
            indexUsed: 'username_1'
        });
        
        // Test 2: Email lookup performance (uses index)
        startTime = Date.now();
        await User.findOne({ email: 'test@example.com' });
        tests.push({
            test: 'Email Lookup (Indexed)',
            responseTime: Date.now() - startTime,
            indexUsed: 'email_1'
        });
        
        // Test 3: Role-based query (uses compound index)
        startTime = Date.now();
        await User.find({ role: 'student', isActive: true }).limit(5);
        tests.push({
            test: 'Role + Active Query (Compound Index)',
            responseTime: Date.now() - startTime,
            indexUsed: 'role_active_index'
        });
        
        // Test 4: Analytics sorting (uses analytics index)
        startTime = Date.now();
        await User.find({ isActive: true })
            .sort({ 'analytics.totalStudyTime': -1 })
            .limit(10);
        tests.push({
            test: 'Analytics Sorting (Indexed)',
            responseTime: Date.now() - startTime,
            indexUsed: 'user_activity_index'
        });
        
        return tests;
    } catch (error) {
        return [{ error: 'Performance tests failed', details: error.message }];
    }
}

// Helper function for index recommendations
function getIndexRecommendations() {
    return [
        {
            collection: 'users',
            currentIndexes: ['username', 'email', 'role', 'isActive'],
            compoundIndexes: ['role + isActive', 'analytics.totalStudyTime + analytics.quizzesTaken'],
            recommendation: 'All critical indexes are implemented for optimal performance'
        },
        {
            collection: 'studyrooms',
            currentIndexes: ['name', 'topic', 'createdBy'],
            recommendation: 'Consider adding compound index on topic + status for faster filtering'
        },
        {
            collection: 'analytics',
            currentIndexes: ['date', 'period'],
            compoundIndexes: ['date + period', 'userMetrics.activeUsers + date'],
            recommendation: 'Time-based indexes optimized for data warehouse queries'
        }
    ];
}

function extractJsonFromResponse(str) {
    try {
        // Try to extract JSON array from the response
        const jsonRegex = /\[\s*{[\s\S]*}\s*\]/;
        const match = str.match(jsonRegex);
        
        if (match) {
            return match[0];
        }
        
        // If no JSON array found, remove markdown code blocks
        let cleanedStr = str.replace(/``````/g, '').trim();
        
        // Handle newlines within strings
        cleanedStr = cleanedStr.replace(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ' ');
        
        // Remove trailing commas
        cleanedStr = cleanedStr.replace(/,\s*([}\]])/g, "$1");
        
        return cleanedStr;
    } catch (error) {
        console.error("Error extracting JSON:", error);
        return str; // Return original string if extraction fails
    }
}

async function generateFlashcardQuestions(topic, numQuestions) {
    const prompt = `Generate ${numQuestions} flashcard-style questions with answers on the topic of "${topic}". 
    Each flashcard should include:
    - A "question" field with the question text
    - An "answer" field with the correct answer as a string
    Return ONLY a valid JSON array of objects with no additional text or markdown formatting.`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        
        // Log the raw response for debugging
        console.log("Raw flashcard response:", responseText);
        
        // Extract and clean JSON from the response
        const extractedJson = extractJsonFromResponse(responseText);
        console.log("Extracted JSON:", extractedJson);
        
        // Parse the JSON
        let flashcardData;
        try {
            flashcardData = JSON.parse(extractedJson);
            
            // Ensure we have an array
            if (!Array.isArray(flashcardData)) {
                flashcardData = [flashcardData];
            }
        } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            throw new Error("Failed to parse the generated flashcard data");
        }

        const flashcards = await Promise.all(flashcardData.map(async (card) => {
            const newFlashcard = new Flashcard({
                topic,
                question: card.question,
                answer: card.answer,
            });
            return newFlashcard.save();
        }));

        return flashcards; 
    } catch (error) {
        console.error("Error generating flashcards with Google Generative AI:", error);
        throw error;
    }
}

async function generateQuizQuestions(topic, numQuestions) {
    const prompt = `Generate ${numQuestions} quiz questions on the topic of "${topic}". 
    Each question should include:
    - A "question" field with the question text
    - An "options" field with an array of four answer choices
    - An "answer" field with the correct answer as a string
    Return ONLY a valid JSON array of objects with no additional text or markdown formatting.`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        
        // Log the raw response for debugging
        console.log("Raw quiz response:", responseText);
        
        // Extract and clean JSON from the response
        const extractedJson = extractJsonFromResponse(responseText);
        console.log("Extracted JSON:", extractedJson);
        
        // Parse the JSON
        let quizData;
        try {
            quizData = JSON.parse(extractedJson);
            
            // Ensure we have an array
            if (!Array.isArray(quizData)) {
                quizData = [quizData];
            }
        } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            throw new Error("Failed to parse the generated quiz data");
        }

        const quizQuestions = await Promise.all(quizData.map(async (question) => {
            const newQuizQuestion = new QuizQuestion({
                topic,
                question: question.question,
                options: question.options,
                answer: question.answer,
            });
            return newQuizQuestion.save();
        }));

        return quizQuestions; 
    } catch (error) {
        console.error("Error generating quiz with Google Generative AI:", error);
        throw error;
    }
}

app.post('/api/generate-flashcard', async (req, res) => {
    const { topic, numQuestions } = req.body;

    if (!topic || !numQuestions) {
        return res.status(400).json({ error: "Topic and number of questions are required." });
    }

    try {
        const flashcardQuestions = await generateFlashcardQuestions(topic, numQuestions);
        res.status(200).json({ flashcards: flashcardQuestions });
    } catch (error) {
        console.error("Flashcard generation error:", error);
        res.status(500).json({ error: "Failed to generate flashcards.", details: error.message });
    }
});

app.post('/api/generate-quiz', async (req, res) => {
    const { topic, numQuestions } = req.body;

    if (!topic || !numQuestions) {
        return res.status(400).json({ error: "Topic and number of questions are required." });
    }

    try {
        const quizQuestions = await generateQuizQuestions(topic, numQuestions);
        res.status(200).json({ quiz: quizQuestions });
    } catch (error) {
        console.error("Quiz generation error:", error);
        res.status(500).json({ error: "Failed to generate quiz.", details: error.message });
    }
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    // Debug logging
    console.log('Registration attempt:', { username, email: email ? 'provided' : 'missing', password: password ? 'provided' : 'missing' });
    
    // Validate required fields
    if (!username || !email || !password) {
        return res.status(400).json({ 
            error: "All fields are required",
            details: {
                username: !username ? "Username is required" : null,
                email: !email ? "Email is required" : null,
                password: !password ? "Password is required" : null
            }
        });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please provide a valid email address" });
    }

    try {
        // Check if user already exists by username or email
        const existingUser = await User.findOne({ 
            $or: [{ username }, { email }] 
        });
        
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ error: "Username already exists" });
            }
            if (existingUser.email === email) {
                return res.status(400).json({ error: "Email already exists" });
            }
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ 
            username, 
            email, 
            password: hashedPassword 
        });
        await user.save();
        console.log('User registered successfully:', username);
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(400).json({ error: "Error registering user", details: error.message });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            error: "Username/email and password are required" 
        });
    }

    try {
        // Allow login with either username or email
        const user = await User.findOne({ 
            $or: [{ username }, { email: username }] 
        });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ 
            token, 
            userId: user._id, 
            username: user.username,
            email: user.email 
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed", details: error.message });
    }
});

// Middleware to verify JWT token
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

// Protected route example
app.get('/api/user/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('analytics');
        
        // Update user's last active timestamp (Data Warehouse update)
        await User.findByIdAndUpdate(req.user._id, {
            'analytics.lastActive': new Date()
        });
        
        res.json({ 
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                profile: user.profile,
                analytics: user.analytics
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// DBMS Performance Dashboard Endpoint
app.get('/api/admin/dashboard', authenticate, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // Real-time DBMS analytics with indexing
        const [
            totalUsers,
            activeUsers,
            totalRooms,
            activeRooms,
            recentRegistrations,
            topPerformers,
            systemMetrics
        ] = await Promise.all([
            User.countDocuments({ isActive: true }), // Uses isActive index
            User.countDocuments({ 
                'analytics.lastActive': { 
                    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
                },
                isActive: true 
            }), // Uses compound index
            StudyRoom.countDocuments(),
            StudyRoom.countDocuments({ status: 'active' }),
            User.find({ isActive: true })
                .sort({ createdAt: -1 }) // Uses timestamp index
                .limit(5)
                .select('username createdAt analytics'),
            User.find({ isActive: true })
                .sort({ 'analytics.totalStudyTime': -1 }) // Uses analytics index
                .limit(10)
                .select('username analytics profile'),
            getSystemPerformanceMetrics()
        ]);
        
        const dashboardData = {
            overview: {
                totalUsers,
                activeUsers,
                totalRooms,
                activeRooms,
                userRetentionRate: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(2) : 0
            },
            recentActivity: {
                newRegistrations: recentRegistrations,
                topPerformers: topPerformers
            },
            performance: systemMetrics,
            timestamp: new Date().toISOString()
        };
        
        res.json(dashboardData);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Real-time Analytics Endpoint (Data Warehousing)
app.get('/api/analytics/realtime', authenticate, async (req, res) => {
    try {
        const { timeframe = '24h' } = req.query;
        
        let startDate = new Date();
        if (timeframe === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (timeframe === '30d') {
            startDate.setDate(startDate.getDate() - 30);
        } else {
            startDate.setHours(startDate.getHours() - 24);
        }
        
        // Advanced aggregation pipeline with indexing
        const analyticsData = await User.aggregate([
            {
                $match: {
                    'analytics.lastActive': { $gte: startDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: {
                        hour: { $hour: '$analytics.lastActive' },
                        day: { $dayOfMonth: '$analytics.lastActive' }
                    },
                    activeUsers: { $sum: 1 },
                    totalStudyTime: { $sum: '$analytics.totalStudyTime' },
                    totalQuizzes: { $sum: '$analytics.quizzesTaken' },
                    totalFlashcards: { $sum: '$analytics.flashcardsCreated' },
                    averageSessionTime: { $avg: '$analytics.totalStudyTime' }
                }
            },
            {
                $sort: { '_id.day': 1, '_id.hour': 1 }
            }
        ]);
        
        // Learning effectiveness metrics
        const learningMetrics = await calculateLearningEffectiveness();
        
        res.json({
            timeframe,
            trends: analyticsData,
            learningEffectiveness: learningMetrics,
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Performance Monitoring Endpoint (Indexing demonstration)
app.get('/api/performance/indexes', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // Demonstrate index performance
        const performanceTests = await runIndexPerformanceTests();
        
        res.json({
            indexPerformance: performanceTests,
            recommendations: getIndexRecommendations(),
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch performance data' });
    }
});

// User Activity Tracking (CRUD + Analytics)
app.post('/api/user/activity', authenticate, async (req, res) => {
    try {
        const { activityType, data } = req.body;
        
        // Update user analytics (Data Warehouse)
        const updateQuery = {};
        switch (activityType) {
            case 'quiz_taken':
                updateQuery['$inc'] = { 'analytics.quizzesTaken': 1 };
                break;
            case 'flashcard_created':
                updateQuery['$inc'] = { 'analytics.flashcardsCreated': 1 };
                break;
            case 'study_session':
                updateQuery['$inc'] = { 'analytics.totalStudyTime': data.duration || 0 };
                break;
            case 'room_joined':
                updateQuery['$inc'] = { 'analytics.studyRoomsJoined': 1 };
                break;
        }
        
        updateQuery['$set'] = { 'analytics.lastActive': new Date() };
        
        // Fast update using user ID index
        await User.findByIdAndUpdate(req.user.userId, updateQuery);
        
        res.json({ 
            message: 'Activity tracked successfully',
            activityType,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Failed to track activity' });
    }
});

// Advanced Search with Indexing
app.get('/api/search', authenticate, async (req, res) => {
    try {
        const { query, type = 'all', limit = 10 } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }
        
        const searchResults = {};
        
        if (type === 'all' || type === 'users') {
            // Fast user search using text indexes
            searchResults.users = await User.find({
                $or: [
                    { username: { $regex: query, $options: 'i' } },
                    { 'profile.firstName': { $regex: query, $options: 'i' } },
                    { 'profile.lastName': { $regex: query, $options: 'i' } }
                ],
                isActive: true
            })
            .limit(parseInt(limit))
            .select('username profile.firstName profile.lastName analytics.totalStudyTime');
        }
        
        if (type === 'all' || type === 'rooms') {
            searchResults.rooms = await StudyRoom.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { topic: { $regex: query, $options: 'i' } }
                ],
                status: 'active'
            })
            .limit(parseInt(limit))
            .populate('createdBy', 'username')
            .select('name topic participants createdAt');
        }
        
        res.json({
            query,
            results: searchResults,
            searchTime: Date.now(),
            resultCount: Object.values(searchResults).reduce((acc, arr) => acc + (arr?.length || 0), 0)
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

studyRoomSocket(io);

app.use('/api/studyrooms', studyRoomRoutes);
app.use('/api/analytics', analyticsRoutes);

// Add an OPTIONS handler for preflight requests
app.options('*', cors());

// User profile endpoint (was duplicated in original code)
app.get('/api/user/profile', authenticate, (req, res) => {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username
      }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));