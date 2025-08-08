import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('24h');
    const [error, setError] = useState('');

    const API_BASE = process.env.REACT_APP_API_URL || 'https://studyspark-ncsp.onrender.com';

    useEffect(() => {
        fetchDashboardData();
        fetchAnalyticsData();
        fetchPerformanceData();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchDashboardData();
            fetchAnalyticsData();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [timeframe]);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE}/api/admin/dashboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDashboardData(response.data);
        } catch (error) {
            setError('Failed to fetch dashboard data');
            console.error('Dashboard error:', error);
        }
    };

    const fetchAnalyticsData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE}/api/analytics/realtime?timeframe=${timeframe}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalyticsData(response.data);
        } catch (error) {
            console.error('Analytics error:', error);
        }
    };

    const fetchPerformanceData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE}/api/performance/indexes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPerformanceData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Performance error:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-dashboard loading">
                <div className="loading-spinner"></div>
                <p>Loading enterprise analytics...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>🎓 StudySpark Enterprise Dashboard</h1>
                <div className="dashboard-controls">
                    <select 
                        value={timeframe} 
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="timeframe-selector"
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                    </select>
                    <button onClick={fetchDashboardData} className="refresh-btn">
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {/* DBMS Overview Section */}
            <div className="dashboard-section">
                <h2>📊 DBMS Overview</h2>
                <div className="metrics-grid">
                    {dashboardData?.overview && (
                        <>
                            <div className="metric-card">
                                <h3>Total Users</h3>
                                <div className="metric-value">{dashboardData.overview.totalUsers}</div>
                                <small>Registered in database</small>
                            </div>
                            <div className="metric-card">
                                <h3>Active Users</h3>
                                <div className="metric-value">{dashboardData.overview.activeUsers}</div>
                                <small>Active in {timeframe}</small>
                            </div>
                            <div className="metric-card">
                                <h3>Study Rooms</h3>
                                <div className="metric-value">{dashboardData.overview.totalRooms}</div>
                                <small>Created by users</small>
                            </div>
                            <div className="metric-card">
                                <h3>Retention Rate</h3>
                                <div className="metric-value">{dashboardData.overview.userRetentionRate}%</div>
                                <small>User engagement</small>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Data Warehousing Section */}
            <div className="dashboard-section">
                <h2>📈 Data Warehousing Analytics</h2>
                <div className="analytics-container">
                    {analyticsData?.learningEffectiveness && (
                        <div className="analytics-card">
                            <h3>Learning Effectiveness Metrics</h3>
                            <div className="analytics-grid">
                                <div className="analytics-item">
                                    <label>Total Quiz Attempts:</label>
                                    <span>{analyticsData.learningEffectiveness.quizEngagement.totalQuizzes}</span>
                                </div>
                                <div className="analytics-item">
                                    <label>Average Quizzes per User:</label>
                                    <span>{analyticsData.learningEffectiveness.quizEngagement.averageQuizzes.toFixed(2)}</span>
                                </div>
                                <div className="analytics-item">
                                    <label>Total Study Time:</label>
                                    <span>{Math.round(analyticsData.learningEffectiveness.studyTimeMetrics.totalStudyTime / 60)} hours</span>
                                </div>
                                <div className="analytics-item">
                                    <label>Average Study Time:</label>
                                    <span>{Math.round(analyticsData.learningEffectiveness.studyTimeMetrics.averageStudyTime)} minutes</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {analyticsData?.trends && (
                        <div className="analytics-card">
                            <h3>User Activity Trends ({timeframe})</h3>
                            <div className="trends-container">
                                {analyticsData.trends.map((trend, index) => (
                                    <div key={index} className="trend-item">
                                        <div className="trend-time">
                                            Day {trend._id.day}, Hour {trend._id.hour}
                                        </div>
                                        <div className="trend-metrics">
                                            <span>👥 {trend.activeUsers} users</span>
                                            <span>📚 {Math.round(trend.totalStudyTime / 60)}h study</span>
                                            <span>🧠 {trend.totalQuizzes} quizzes</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Indexing Performance Section */}
            <div className="dashboard-section">
                <h2>⚡ Indexing Performance</h2>
                <div className="performance-container">
                    {performanceData?.indexPerformance && (
                        <div className="performance-card">
                            <h3>Database Query Performance</h3>
                            <div className="performance-tests">
                                {performanceData.indexPerformance.map((test, index) => (
                                    <div key={index} className="performance-test">
                                        <div className="test-name">{test.test}</div>
                                        <div className="test-metrics">
                                            <span className={`response-time ${test.responseTime < 20 ? 'fast' : test.responseTime < 50 ? 'medium' : 'slow'}`}>
                                                {test.responseTime}ms
                                            </span>
                                            {test.indexUsed && (
                                                <span className="index-used">Index: {test.indexUsed}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {performanceData?.recommendations && (
                        <div className="performance-card">
                            <h3>Index Optimization Status</h3>
                            <div className="recommendations">
                                {performanceData.recommendations.map((rec, index) => (
                                    <div key={index} className="recommendation-item">
                                        <h4>{rec.collection} Collection</h4>
                                        <div className="index-info">
                                            <div>
                                                <strong>Current Indexes:</strong> {rec.currentIndexes?.join(', ')}
                                            </div>
                                            {rec.compoundIndexes && (
                                                <div>
                                                    <strong>Compound Indexes:</strong> {rec.compoundIndexes.join(', ')}
                                                </div>
                                            )}
                                            <div className="recommendation-text">
                                                {rec.recommendation}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* System Performance Section */}
            <div className="dashboard-section">
                <h2>🖥️ System Performance</h2>
                <div className="system-metrics">
                    {dashboardData?.performance && (
                        <div className="system-card">
                            <div className="system-metric">
                                <label>Database Response Time:</label>
                                <span className={dashboardData.performance.databaseResponseTime < 50 ? 'good' : 'warning'}>
                                    {dashboardData.performance.databaseResponseTime}ms
                                </span>
                            </div>
                            <div className="system-metric">
                                <label>Server Uptime:</label>
                                <span>{Math.round(dashboardData.performance.serverUptime / 3600)}h {Math.round((dashboardData.performance.serverUptime % 3600) / 60)}m</span>
                            </div>
                            <div className="system-metric">
                                <label>Memory Usage:</label>
                                <span>{Math.round(dashboardData.performance.memoryUsage.used / 1024 / 1024)}MB</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="dashboard-section">
                <h2>📝 Recent Activity</h2>
                <div className="activity-container">
                    {dashboardData?.recentActivity && (
                        <>
                            <div className="activity-card">
                                <h3>New Registrations</h3>
                                <div className="activity-list">
                                    {dashboardData.recentActivity.newRegistrations.map((user, index) => (
                                        <div key={index} className="activity-item">
                                            <span className="username">{user.username}</span>
                                            <span className="timestamp">
                                                {new Date(user.createdAt).toLocaleString()}
                                            </span>
                                            <span className="study-time">
                                                {Math.round(user.analytics.totalStudyTime)} min study
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="activity-card">
                                <h3>Top Performers</h3>
                                <div className="activity-list">
                                    {dashboardData.recentActivity.topPerformers.map((user, index) => (
                                        <div key={index} className="activity-item">
                                            <span className="rank">#{index + 1}</span>
                                            <span className="username">{user.username}</span>
                                            <span className="study-time">
                                                {Math.round(user.analytics.totalStudyTime / 60)}h study
                                            </span>
                                            <span className="quiz-count">
                                                {user.analytics.quizzesTaken} quizzes
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="dashboard-footer">
                <p>🔄 Auto-refreshes every 30 seconds | Last updated: {dashboardData?.timestamp ? new Date(dashboardData.timestamp).toLocaleString() : 'Never'}</p>
                <p>💡 This dashboard demonstrates DBMS operations, Data Warehousing analytics, and Indexing performance in real-time</p>
            </div>
        </div>
    );
};

export default AdminDashboard;
