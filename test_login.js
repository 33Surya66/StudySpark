const axios = require('axios');

// Test script to verify login endpoint
// Updated to work with both local and production servers
const LOCAL_URL = 'http://localhost:5000';
const PRODUCTION_URL = 'https://studyspark-ncsp.onrender.com';

// Try production first, then local
const API_URL = PRODUCTION_URL;

async function testLogin() {
    console.log(`🔗 Testing login endpoint: ${API_URL}`);
    console.log('=' .repeat(50));
    
    try {
        console.log('Testing login with username...');
        const loginData = {
            username: 'testuser123',
            password: 'password123'
        };

        const response = await axios.post(`${API_URL}/login`, loginData);
        console.log('✅ Login successful with username:', response.data);
        
        // Test login with email
        console.log('\nTesting login with email...');
        const emailLoginData = {
            username: 'test@example.com', // Using email in username field
            password: 'password123'
        };

        const emailResponse = await axios.post(`${API_URL}/login`, emailLoginData);
        console.log('✅ Login successful with email:', emailResponse.data);
        
    } catch (error) {
        console.error('❌ Login failed:');
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data);
        
        if (API_URL === LOCAL_URL) {
            console.log('\n💡 Tip: Make sure your backend server is running with:');
            console.log('   npm start');
        } else {
            console.log('\n💡 Note: This is expected if the test user doesn\'t exist.');
            console.log('   Create users first with the registration endpoint.');
        }
    }
}

console.log('🎓 StudySpark Login Test');
console.log('Testing DBMS authentication with indexing...\n');
testLogin();
