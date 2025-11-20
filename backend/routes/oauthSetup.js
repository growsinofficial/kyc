import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Note: zohoOAuth needs to be converted to ES6 modules or use dynamic import
// For now, using dynamic import
let zohoOAuth;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * @route   GET /api/auth/zoho/setup
 * @desc    Get OAuth setup status and authorization URL
 * @access  Public (for setup only)
 */
router.get('/zoho/setup', async (req, res) => {
  try {
    // Dynamic import for CommonJS module
    if (!zohoOAuth) {
      const zohoOAuthModule = await import('../utils/zohoOAuth.js');
      zohoOAuth = zohoOAuthModule.default;
    }
    
    const setupStatus = zohoOAuth.getSetupStatus();
    
    res.json({
      success: true,
      setupStatus: setupStatus,
      message: setupStatus.isReady ? 'OAuth is configured' : 'OAuth setup required'
    });

  } catch (error) {
    console.error('Error getting OAuth setup status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get setup status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auth/zoho/authorize
 * @desc    Redirect to Zoho OAuth authorization
 * @access  Public (for setup only)
 */
router.get('/zoho/authorize', async (req, res) => {
  try {
    if (!zohoOAuth) {
      const zohoOAuthModule = await import('../utils/zohoOAuth.js');
      zohoOAuth = zohoOAuthModule.default;
    }
    
    const crypto = await import('crypto');
    const state = req.query.state || crypto.randomBytes(32).toString('hex');
    const authUrl = zohoOAuth.generateAuthUrl(state);
    
    // Store state for verification (in production, use Redis or secure storage)
    req.session = req.session || {};
    req.session.oauthState = state;
    
    res.redirect(authUrl);

  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate authorization URL',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auth/zoho/callback
 * @desc    Handle OAuth callback from Zoho
 * @access  Public (callback endpoint)
 */
router.get('/zoho/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; background: #ffebee; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>Authorization Failed</h2>
            <p><strong>Error:</strong> ${error}</p>
            <p>Please try again or contact support if the issue persists.</p>
            <a href="/api/auth/zoho/setup">Try Again</a>
          </div>
        </body>
        </html>
      `);
    }

    // Verify state parameter (security check)
    if (req.session?.oauthState && req.session.oauthState !== state) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Security Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; background: #ffebee; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>Security Check Failed</h2>
            <p>Invalid state parameter. This may indicate a security issue.</p>
            <a href="/api/auth/zoho/authorize">Start Over</a>
          </div>
        </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code not received'
      });
    }

    // Exchange code for tokens
    const tokenResponse = await zohoOAuth.exchangeCodeForTokens(code);

    // Update .env file with tokens (in production, use secure storage)
    await updateEnvFile({
      ZOHO_OAUTH_ACCESS_TOKEN: tokenResponse.accessToken,
      ZOHO_OAUTH_REFRESH_TOKEN: tokenResponse.refreshToken
    });

    // Clear session state
    if (req.session) {
      delete req.session.oauthState;
    }

    // Send success response
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Setup Complete</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .success { color: #2e7d32; background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .token-info { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: left; margin: 20px 0; }
          .code { font-family: monospace; background: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>🎉 OAuth Setup Complete!</h2>
          <p>Your Zoho Payments OAuth integration is now configured.</p>
        </div>
        
        <div class="token-info">
          <h3>Next Steps:</h3>
          <ol>
            <li>Your tokens have been automatically saved</li>
            <li>Test the integration using the test endpoint</li>
            <li>Your application is ready for production payments</li>
          </ol>
        </div>

        <div class="code">
          <strong>Test Command:</strong><br>
          curl -X GET "${process.env.BACKEND_URL}/api/auth/zoho/test"
        </div>

        <p><a href="${process.env.FRONTEND_URL}">Return to Application</a></p>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Setup Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { color: #d32f2f; background: #ffebee; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>Setup Failed</h2>
          <p><strong>Error:</strong> ${error.message}</p>
          <p>Please check your configuration and try again.</p>
          <a href="/api/auth/zoho/setup">View Setup Status</a>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * @route   GET /api/auth/zoho/test
 * @desc    Test OAuth connection
 * @access  Public (for testing)
 */
router.get('/zoho/test', async (req, res) => {
  try {
    const testResult = await zohoOAuth.testConnection();
    
    res.json({
      success: testResult.success,
      message: testResult.message,
      setupStatus: zohoOAuth.getSetupStatus(),
      organizationData: testResult.organizationData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing OAuth connection:', error);
    res.status(500).json({
      success: false,
      message: 'OAuth test failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/zoho/refresh
 * @desc    Manually refresh access token
 * @access  Public (for maintenance)
 */
router.post('/zoho/refresh', async (req, res) => {
  try {
    const refreshResult = await zohoOAuth.refreshAccessToken();
    
    // Update .env file with new token
    await updateEnvFile({
      ZOHO_OAUTH_ACCESS_TOKEN: refreshResult.accessToken
    });

    res.json({
      success: true,
      message: 'Access token refreshed successfully',
      expiresIn: refreshResult.expiresIn
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/zoho/revoke
 * @desc    Revoke OAuth tokens
 * @access  Private (Admin only)
 */
router.post('/zoho/revoke', async (req, res) => {
  try {
    await zohoOAuth.revokeRefreshToken();
    
    // Clear tokens from .env file
    await updateEnvFile({
      ZOHO_OAUTH_ACCESS_TOKEN: 'your_oauth_access_token',
      ZOHO_OAUTH_REFRESH_TOKEN: 'your_oauth_refresh_token'
    });

    res.json({
      success: true,
      message: 'OAuth tokens revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Token revocation failed',
      error: error.message
    });
  }
});

/**
 * Helper function to update .env file
 * @param {Object} updates - Key-value pairs to update
 */
async function updateEnvFile(updates) {
  try {
    const envPath = path.join(__dirname, '../.env');
    let envContent = await fs.readFile(envPath, 'utf8');
    
    Object.entries(updates).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        envContent += `\n${newLine}`;
      }
      
      // Update process.env for immediate use
      process.env[key] = value;
    });
    
    await fs.writeFile(envPath, envContent);
    console.log('✅ Environment file updated successfully');
    
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    throw error;
  }
}

export default router;