// API Configuration
const API_CONFIG = {
  // Production URL (HTTPS)
  production: 'https://studyspark-ncsp.onrender.com',
  
  // Development URL (can be HTTP for local development)
  development: process.env.REACT_APP_API_URL || 'https://studyspark-ncsp.onrender.com',
  
  // Socket.IO URL
  socket: 'https://studyspark-ncsp.onrender.com'
};

// Get the appropriate API URL based on environment
const getApiUrl = () => {
  return API_CONFIG[process.env.NODE_ENV] || API_CONFIG.production;
};

// Get Socket.IO URL
const getSocketUrl = () => {
  return API_CONFIG.socket;
};

export { getApiUrl, getSocketUrl };
export default API_CONFIG; 