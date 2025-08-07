const axios = require('axios');

// Test script to verify login endpoint
async function testLogin() {
    try {
        console.log('Testing login with username...');
        const loginData = {
            username: 'testuser123',
            password: 'password123'
        };

        const response = await axios.post('http://localhost:5000/login', loginData);
        console.log('Login successful with username:', response.data);
        
        // Test login with email
        console.log('\nTesting login with email...');
        const emailLoginData = {
            username: 'test@example.com', // Using email in username field
            password: 'password123'
        };

        const emailResponse = await axios.post('http://localhost:5000/login', emailLoginData);
        console.log('Login successful with email:', emailResponse.data);
        
    } catch (error) {
        console.error('Login failed:');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data);
    }
}

testLogin();
