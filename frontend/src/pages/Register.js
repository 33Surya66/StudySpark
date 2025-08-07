import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); 
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async () => {
        // Client-side validation
        if (!username || !email || !password) {
            setError("All fields are required");
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please provide a valid email address");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        try {
            setError(''); // Clear previous errors
            await axios.post('https://studyspark-ncsp.onrender.com/register', { 
                username, 
                email, 
                password 
            });
            setSuccessMessage("Registration successful! Redirecting to login..."); 
            
            // Redirect to login page after successful registration
            setTimeout(() => {
                navigate('/login'); 
            }, 1500);
        } catch (error) {
            const errorMessage = error.response?.data?.error || "Registration failed. Please try again.";
            setError(errorMessage);
        }
    };

    return (
        <div className='background'>
            <div className="register-form">
                <h2>Register</h2>
                <input 
                    type="text" 
                    placeholder="Username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)} 
                />
                <input 
                    type="email" 
                    placeholder="Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} 
                />
                <button onClick={handleRegister}>Sign Up</button>
                {successMessage && <p className="success-message">{successMessage}</p>} 
                {error && <p className="error-message">{error}</p>}
            </div>
        </div>
    );
};

export default Register;
