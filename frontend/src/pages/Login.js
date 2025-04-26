import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const Login = ({ setIsAuthenticated }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); 
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false); 
    const navigate = useNavigate();

    const handleLogin = async () => {
        setLoading(true); 
        setError(''); 

        try {
            const response = await axios.post('https://studyspark-ncsp.onrender.com/login', { username, password });
            localStorage.setItem('token', response.data.token);
            setSuccess(true);
            
            // Update authentication state in the parent component
            setIsAuthenticated(true);

            setTimeout(() => {
                navigate('/'); // Redirect to home page after login
            }, 1000); 
        } catch (error) {
            setError('Login failed, please check your credentials'); 
        } finally {
            setLoading(false); 
        }
    };

    return (
        <div className='background'>
            <div className='login-form'>
                <h2>Login</h2>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button onClick={handleLogin} disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                {success && <p className="success-message">Login successful!</p>} 
                {error && <p className="error-message">{error}</p>}
            </div>
        </div>
    );
};

export default Login;
