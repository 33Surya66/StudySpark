import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header/Header';
import Hero from './components/Home/Hero';
import FeatureSection from './components/Home/Features';
import Footer from './components/Footer/Footer';
import Tools from './pages/Tools';
import Login from './pages/Login';
import Register from './pages/Register';
import Subjects from './pages/Subjects';
import StudyRoom from './pages/StudyRoom';
import UserDashboard from './components/UserDashboard/UserDashboard';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import 'font-awesome/css/font-awesome.min.css';
import ChatRoom from './components/StudyRoom/ChatRoom';
import './App.css';

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState('student');
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        // Check for token when the component mounts
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('userRole') || 'student';
        setIsAuthenticated(!!token);
        setUserRole(role);
        setAuthChecked(true); // Mark authentication check as complete
    }, []);

    const handleLogin = (role = 'student') => {
        setIsAuthenticated(true);
        setUserRole(role);
        localStorage.setItem('userRole', role);
    };
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        setIsAuthenticated(false);
        setUserRole('student');
    };

    // Show loading state while checking authentication
    if (!authChecked) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <Router>
            <div className="App">
                <Header isAuthenticated={isAuthenticated} userRole={userRole} onLogout={handleLogout} />
                <Routes>
                    <Route path="/" element={<><Hero /><FeatureSection /></>} />
                    
                    {/* Public Routes */}
                    <Route path="/login" element={<Login setIsAuthenticated={handleLogin} />} />
                    <Route path="/register" element={<Register />} />
                    
                    {/* Protected User Routes */}
                    <Route path="/dashboard" element={isAuthenticated ? <UserDashboard /> : <Navigate to="/login" state={{ from: '/dashboard' }} />} />
                    <Route path="/tools" element={isAuthenticated ? <Tools /> : <Navigate to="/login" state={{ from: '/tools' }} />} />
                    <Route path="/subjects" element={isAuthenticated ? <Subjects /> : <Navigate to="/login" state={{ from: '/subjects' }} />} />
                    <Route path="/studyrooms" element={isAuthenticated ? <StudyRoom /> : <Navigate to="/login" state={{ from: '/studyrooms' }} />} />
                    <Route path="/chat-room/:roomId" element={isAuthenticated ? <ChatRoom /> : <Navigate to="/login" state={{ from: window.location.pathname }} />} />
                    
                    {/* Admin Only Routes */}
                    <Route 
                        path="/admin" 
                        element={
                            isAuthenticated && userRole === 'admin' ? 
                            <AdminDashboard /> : 
                            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
                        } 
                    />
                    
                    {/* Redirect logged in users from login/register */}
                    <Route path="/login" element={!isAuthenticated ? <Login setIsAuthenticated={handleLogin} /> : <Navigate to="/dashboard" />} />
                    <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
                </Routes>
                <Footer />
            </div>
        </Router>
    );
};

export default App;
