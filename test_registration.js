const axios = require('axios');

// Test script to verify registration endpoint
async function testRegistration() {
    try {
        const testUser = {
            username: 'testuser123',
            email: 'test@example.com',
            password: 'password123'
        };

        console.log('Testing registration with:', testUser);
        
        const response = await axios.post('http://localhost:5000/register', testUser);
        console.log('Registration successful:', response.data);
    } catch (error) {
        console.error('Registration failed:');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data);
    }
}

testRegistration();
