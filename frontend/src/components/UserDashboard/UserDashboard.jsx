import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserDashboard.css';

const UserDashboard = () => {
    const [userProfile, setUserProfile] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [searchResults, setSearchResults] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const API_BASE = process.env.REACT_APP_API_URL || 'https://studyspark-ncsp.onrender.com';

    useEffect(() => {
        fetchUserProfile();
        trackUserActivity('dashboard_visit');
    }, []);

    const fetchUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please login to view dashboard');
                setLoading(false);
                return;
            }

            const response = await axios.get(`${API_BASE}/api/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setUserProfile(response.data.user);
            setLoading(false);
        } catch (error) {
            setError('Failed to fetch profile data');
            setLoading(false);
            console.error('Profile error:', error);
        }
    };

    const trackUserActivity = async (activityType, data = {}) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            await axios.post(`${API_BASE}/api/user/activity`, {
                activityType,
                data
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Activity tracking failed:', error);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE}/api/search?query=${encodeURIComponent(searchQuery)}&limit=10`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setSearchResults(response.data);
            trackUserActivity('search_performed', { query: searchQuery });
        } catch (error) {
            console.error('Search failed:', error);
            setError('Search failed. Please try again.');
        }
    };

    const simulateQuizTaken = async () => {
        await trackUserActivity('quiz_taken', { score: 85, topic: 'Mathematics' });
        alert('Quiz activity tracked! Check your stats.');
        fetchUserProfile(); // Refresh to show updated stats
    };

    const simulateStudySession = async () => {
        await trackUserActivity('study_session', { duration: 30, topic: 'Physics' });
        alert('Study session tracked! 30 minutes added to your stats.');
        fetchUserProfile(); // Refresh to show updated stats
    };

    const simulateFlashcardCreated = async () => {
        await trackUserActivity('flashcard_created', { topic: 'Chemistry', difficulty: 'medium' });
        alert('Flashcard creation tracked!');
        fetchUserProfile(); // Refresh to show updated stats
    };

    if (loading) {
        return (
            <div className="user-dashboard loading">
                <div className="loading-spinner"></div>
                <p>Loading your learning dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="user-dashboard error">
                <div className="error-message">{error}</div>
            </div>
        );
    }

    return (
        <div className="user-dashboard">
            <div className="dashboard-header">
                <h1>🎓 Welcome back, {userProfile?.username}!</h1>
                <div className="header-stats">
                    <span>📚 {userProfile?.analytics?.totalStudyTime || 0} min studied</span>
                    <span>🧠 {userProfile?.analytics?.quizzesTaken || 0} quizzes taken</span>
                    <span>📝 {userProfile?.analytics?.flashcardsCreated || 0} flashcards created</span>
                </div>
            </div>

            {/* User Profile Section - DBMS Data Display */}
            <div className="dashboard-section">
                <h2>👤 Your Profile (DBMS Data)</h2>
                <div className="profile-container">
                    <div className="profile-info">
                        <div className="info-item">
                            <label>Username:</label>
                            <span>{userProfile?.username}</span>
                        </div>
                        <div className="info-item">
                            <label>Email:</label>
                            <span>{userProfile?.email}</span>
                        </div>
                        <div className="info-item">
                            <label>Role:</label>
                            <span className={`role-badge ${userProfile?.role}`}>
                                {userProfile?.role?.toUpperCase()}
                            </span>
                        </div>
                        <div className="info-item">
                            <label>Member Since:</label>
                            <span>{userProfile?.analytics?.joinDate ? new Date(userProfile.analytics.joinDate).toLocaleDateString() : 'Recently'}</span>
                        </div>
                        <div className="info-item">
                            <label>Last Active:</label>
                            <span>{userProfile?.analytics?.lastActive ? new Date(userProfile.analytics.lastActive).toLocaleString() : 'Now'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Learning Analytics - Data Warehousing Display */}
            <div className="dashboard-section">
                <h2>📊 Your Learning Analytics (Data Warehousing)</h2>
                <div className="analytics-grid">
                    <div className="analytics-card study-time">
                        <div className="card-icon">⏰</div>
                        <div className="card-content">
                            <h3>Total Study Time</h3>
                            <div className="metric-value">
                                {Math.round((userProfile?.analytics?.totalStudyTime || 0) / 60)} hours
                            </div>
                            <div className="metric-detail">
                                {userProfile?.analytics?.totalStudyTime || 0} minutes total
                            </div>
                        </div>
                    </div>

                    <div className="analytics-card quiz-performance">
                        <div className="card-icon">🧠</div>
                        <div className="card-content">
                            <h3>Quiz Performance</h3>
                            <div className="metric-value">
                                {userProfile?.analytics?.quizzesTaken || 0}
                            </div>
                            <div className="metric-detail">
                                Quizzes completed
                            </div>
                        </div>
                    </div>

                    <div className="analytics-card flashcards">
                        <div className="card-icon">📝</div>
                        <div className="card-content">
                            <h3>Flashcards Created</h3>
                            <div className="metric-value">
                                {userProfile?.analytics?.flashcardsCreated || 0}
                            </div>
                            <div className="metric-detail">
                                Learning materials created
                            </div>
                        </div>
                    </div>

                    <div className="analytics-card study-rooms">
                        <div className="card-icon">👥</div>
                        <div className="card-content">
                            <h3>Study Rooms</h3>
                            <div className="metric-value">
                                {userProfile?.analytics?.studyRoomsJoined || 0}
                            </div>
                            <div className="metric-detail">
                                Collaborative sessions
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Feature - Indexing Demonstration */}
            <div className="dashboard-section">
                <h2>🔍 Fast Search (Indexing Demo)</h2>
                <div className="search-container">
                    <div className="search-input-group">
                        <input
                            type="text"
                            placeholder="Search users, study rooms, topics... (powered by database indexes)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="search-input"
                        />
                        <button onClick={handleSearch} className="search-btn">
                            🔍 Search
                        </button>
                    </div>
                    
                    <div className="search-info">
                        💡 This search uses database indexes for instant results!
                        Try searching for usernames, study room topics, or any content.
                    </div>

                    {searchResults && (
                        <div className="search-results">
                            <h3>Search Results for "{searchResults.query}"</h3>
                            <div className="search-stats">
                                Found {searchResults.resultCount} results in {Date.now() - searchResults.searchTime}ms
                                (Thanks to indexing! 🚀)
                            </div>
                            
                            {searchResults.results.users && searchResults.results.users.length > 0 && (
                                <div className="result-section">
                                    <h4>👥 Users</h4>
                                    <div className="result-list">
                                        {searchResults.results.users.map((user, index) => (
                                            <div key={index} className="result-item">
                                                <span className="result-name">{user.username}</span>
                                                <span className="result-detail">
                                                    {user.profile?.firstName} {user.profile?.lastName}
                                                </span>
                                                <span className="result-stats">
                                                    {Math.round(user.analytics?.totalStudyTime / 60 || 0)}h studied
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {searchResults.results.rooms && searchResults.results.rooms.length > 0 && (
                                <div className="result-section">
                                    <h4>🏠 Study Rooms</h4>
                                    <div className="result-list">
                                        {searchResults.results.rooms.map((room, index) => (
                                            <div key={index} className="result-item">
                                                <span className="result-name">{room.name}</span>
                                                <span className="result-detail">Topic: {room.topic}</span>
                                                <span className="result-stats">
                                                    {room.participants?.length || 0} participants
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Activity Simulation - All Concepts Demo */}
            <div className="dashboard-section">
                <h2>🎮 Demo All 3 Concepts</h2>
                <div className="demo-container">
                    <p className="demo-description">
                        Click these buttons to see DBMS, Data Warehousing, and Indexing in action!
                        Each action will update your profile data in real-time.
                    </p>
                    
                    <div className="demo-buttons">
                        <button onClick={simulateQuizTaken} className="demo-btn quiz-btn">
                            📝 Take a Quiz
                            <small>Updates DBMS + Analytics</small>
                        </button>
                        
                        <button onClick={simulateStudySession} className="demo-btn study-btn">
                            📚 Study Session
                            <small>Tracks time in Data Warehouse</small>
                        </button>
                        
                        <button onClick={simulateFlashcardCreated} className="demo-btn flashcard-btn">
                            🃏 Create Flashcard
                            <small>Fast update via Indexing</small>
                        </button>
                    </div>
                    
                    <div className="demo-explanation">
                        <h4>What happens when you click:</h4>
                        <ul>
                            <li><strong>DBMS:</strong> Your user data gets updated in MongoDB</li>
                            <li><strong>Data Warehousing:</strong> Analytics are calculated and stored</li>
                            <li><strong>Indexing:</strong> Fast lookups using username and ID indexes</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="dashboard-footer">
                <p>🔄 Your activity is being tracked in real-time using advanced database concepts</p>
                <p>💡 DBMS stores your data • Data Warehousing tracks your progress • Indexing makes everything fast</p>
            </div>
        </div>
    );
};

export default UserDashboard;
