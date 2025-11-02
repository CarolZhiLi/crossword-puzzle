/**
 * Configuration for CrossyThink Frontend
 * 
 * This file sets the API base URL based on the environment.
 * 
 * For local development: Uses http://localhost:5050
 * For production: Set window.API_BASE before this script loads, or update the PRODUCTION_API_URL below.
 */

(function() {
  // Production API URL - UPDATE THIS with your Render backend URL after deployment
  const PRODUCTION_API_URL = 'https://crossythink-backend.onrender.com';
  
  // Only set if not already set and we're in production
  if (!window.API_BASE) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    
    if (isLocalhost) {
      // Local development
      window.API_BASE = 'http://localhost:5050';
    } else {
      // Production - use the Render backend URL
      window.API_BASE = PRODUCTION_API_URL;
    }
  }
})();

