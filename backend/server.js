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
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // Cache preflight request results for 24 hours
}));

// Updated Socket.IO server with more detailed CORS configuration
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
});

const studyRoomRoutes = require('./routes/studyRoomRoutes')(io);

app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in the .env file");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    const { username, password } = req.body;
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(400).json({ error: "Error registering user" });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, userId: user._id, username: user.username });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Login failed" });
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
    res.json({ user: { id: req.user._id, username: req.user.username } });
});

studyRoomSocket(io);

app.use('/api/studyrooms', studyRoomRoutes);

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