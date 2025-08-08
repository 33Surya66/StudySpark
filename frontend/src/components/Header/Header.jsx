import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Header.css';

const Header = ({ isAuthenticated, userRole, onLogout }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/');
    };

    return (
        <header className="header">
            <img src="/images/logo.png" alt="studySpark" className='logo'/>
            <nav className="nav">
                <Link to="/">Home</Link>
                
                {isAuthenticated && (
                    <>
                        <Link to="/dashboard" className="nav-highlight">📊 Dashboard</Link>
                        <Link to="/studyrooms">Study Rooms</Link>
                        <Link to="/tools">Study Tools</Link>
                        {userRole === 'admin' && (
                            <Link to="/admin" className="admin-link">🔧 Admin Panel</Link>
                        )}
                    </>
                )}
            </nav>
            <div className="auth-buttons">
                {isAuthenticated ? (
                    <div className="user-menu">
                        <span className="user-role">{userRole?.toUpperCase()}</span>
                        <button onClick={handleLogout} className='logout-link'>Logout</button>
                    </div>
                ) : (
                    <>
                        <Link to="/login" className='login-link'>Login</Link>
                        <Link to="/register" className='signup-link'>Sign Up</Link>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;
