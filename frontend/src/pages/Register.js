import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); 
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async () => {
        try {
            await axios.post('https://studyspark-ncsp.onrender.com/register', { username, password });
            setSuccessMessage("Registration successful! Redirecting to login..."); 
            
            // Redirect to home page after successful registration
            setTimeout(() => {
                navigate('/login'); 
            }, 1500);
        } catch (error) {
            setError("Registration failed. Please try again.");
        }
    };

    return (
        <div className='background'>
            <div className="register-form">
                <h2>Register</h2>
                <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
                <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={handleRegister}>Sign Up</button>
                {successMessage && <p className="success-message">{successMessage}</p>} 
                {error && <p className="error-message">{error}</p>}
            </div>
        </div>
    );
};

export default Register;
