const axios = require('axios');
const crypto = require('crypto');

class ZohoOAuthService {
  constructor() {
    this.authBaseUrl = 'https://accounts.zoho.in/oauth/v2';
    this.clientId = process.env.ZOHO_OAUTH_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_OAUTH_CLIENT_SECRET;
    this.refreshToken = process.env.ZOHO_OAUTH_REFRESH_TOKEN;
    this.scope = process.env.ZOHO_OAUTH_SCOPE || 'ZohoPay.payments.CREATE,ZohoPay.payments.READ,ZohoPay.payments.UPDATE,ZohoPay.refunds.CREATE,ZohoPay.refunds.READ';
    this.redirectUri = `${process.env.BACKEND_URL}/api/auth/zoho/callback`;
  }

  /**
   * Generate OAuth authorization URL for initial setup
   * @param {string} state - Random state parameter for security
   * @returns {string} Authorization URL
   */
  generateAuthUrl(state = null) {
    if (!state) {
      state = crypto.randomBytes(32).toString('hex');
    }

    const params = new URLSearchParams({
      scope: this.scope,
      client_id: this.clientId,
      soid: `zohopay.${process.env.ZOHO_ORGANIZATION_ID}`,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      state: state,
      access_type: 'offline'
    });

    return `${this.authBaseUrl}/org/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * @param {string} code - Authorization code from callback
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForTokens(code) {
    try {
      const params = new URLSearchParams({
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      });

      const response = await axios.post(
        `${this.authBaseUrl}/token`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const tokenData = response.data;
      
      console.log('✅ OAuth tokens obtained successfully');
      
      // Store tokens in environment (in production, store securely)
      process.env.ZOHO_OAUTH_ACCESS_TOKEN = tokenData.access_token;
      process.env.ZOHO_OAUTH_REFRESH_TOKEN = tokenData.refresh_token;

      return {
        success: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        scope: tokenData.scope
      };

    } catch (error) {
      console.error('❌ Error exchanging code for tokens:', error.response?.data || error.message);
      throw new Error(`Token exchange failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns {Promise<Object>} New access token
   */
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('Refresh token not available');
      }

      const params = new URLSearchParams({
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token'
      });

      console.log('🔄 Refreshing OAuth access token...');

      const response = await axios.post(
        `${this.authBaseUrl}/token`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const tokenData = response.data;
      
      // Update environment variable
      process.env.ZOHO_OAUTH_ACCESS_TOKEN = tokenData.access_token;

      console.log('✅ Access token refreshed successfully');

      return {
        success: true,
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in
      };

    } catch (error) {
      console.error('❌ Error refreshing access token:', error.response?.data || error.message);
      throw new Error(`Token refresh failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get current access token (refresh if needed)
   * @returns {Promise<string>} Valid access token
   */
  async getValidAccessToken() {
    try {
      let accessToken = process.env.ZOHO_OAUTH_ACCESS_TOKEN;

      // If no access token, try to refresh
      if (!accessToken) {
        const refreshResult = await this.refreshAccessToken();
        accessToken = refreshResult.accessToken;
      }

      return accessToken;
    } catch (error) {
      console.error('❌ Error getting valid access token:', error.message);
      throw error;
    }
  }

  /**
   * Make authenticated API request
   * @param {string} method - HTTP method
   * @param {string} url - API URL
   * @param {Object} data - Request data
   * @param {Object} headers - Additional headers
   * @returns {Promise<Object>} API response
   */
  async makeAuthenticatedRequest(method, url, data = null, headers = {}) {
    try {
      const accessToken = await this.getValidAccessToken();

      const config = {
        method: method,
        url: url,
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
        config.data = data;
      }

      const response = await axios(config);
      return response;

    } catch (error) {
      // If token expired, try to refresh and retry
      if (error.response?.status === 401) {
        console.log('🔄 Token expired, attempting refresh...');
        
        try {
          await this.refreshAccessToken();
          
          // Retry the request with new token
          const newAccessToken = process.env.ZOHO_OAUTH_ACCESS_TOKEN;
          const retryConfig = {
            method: method,
            url: url,
            headers: {
              'Authorization': `Zoho-oauthtoken ${newAccessToken}`,
              'Content-Type': 'application/json',
              ...headers
            }
          };

          if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
            retryConfig.data = data;
          }

          const retryResponse = await axios(retryConfig);
          return retryResponse;

        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError.message);
          throw refreshError;
        }
      }

      throw error;
    }
  }

  /**
   * Revoke refresh token
   * @returns {Promise<Object>} Revoke response
   */
  async revokeRefreshToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token to revoke');
      }

      const params = new URLSearchParams({
        token: this.refreshToken
      });

      await axios.post(
        `${this.authBaseUrl}/token/revoke`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('✅ Refresh token revoked successfully');

      // Clear environment variables
      process.env.ZOHO_OAUTH_ACCESS_TOKEN = '';
      process.env.ZOHO_OAUTH_REFRESH_TOKEN = '';

      return { success: true, message: 'Refresh token revoked' };

    } catch (error) {
      console.error('❌ Error revoking refresh token:', error.response?.data || error.message);
      throw new Error(`Token revocation failed: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get OAuth setup status
   * @returns {Object} Setup status information
   */
  getSetupStatus() {
    const hasClientId = !!(this.clientId && !this.clientId.includes('your_'));
    const hasClientSecret = !!(this.clientSecret && !this.clientSecret.includes('your_'));
    const hasRefreshToken = !!(this.refreshToken && !this.refreshToken.includes('your_'));
    const hasAccessToken = !!(process.env.ZOHO_OAUTH_ACCESS_TOKEN && !process.env.ZOHO_OAUTH_ACCESS_TOKEN.includes('your_'));

    return {
      clientConfigured: hasClientId && hasClientSecret,
      tokensConfigured: hasRefreshToken || hasAccessToken,
      isReady: hasClientId && hasClientSecret && (hasRefreshToken || hasAccessToken),
      setupUrl: !hasRefreshToken ? this.generateAuthUrl() : null,
      status: {
        clientId: hasClientId ? '✅' : '❌',
        clientSecret: hasClientSecret ? '✅' : '❌',
        refreshToken: hasRefreshToken ? '✅' : '❌',
        accessToken: hasAccessToken ? '✅' : '⚠️'
      }
    };
  }

  /**
   * Test OAuth connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      const setupStatus = this.getSetupStatus();
      
      if (!setupStatus.isReady) {
        return {
          success: false,
          message: 'OAuth not configured properly',
          setupStatus: setupStatus
        };
      }

      // Try to make a test API call
      const response = await this.makeAuthenticatedRequest(
        'GET',
        `${process.env.ZOHO_PAYMENT_BASE_URL}/organization`
      );

      return {
        success: true,
        message: 'OAuth connection successful',
        organizationData: response.data
      };

    } catch (error) {
      return {
        success: false,
        message: `OAuth connection failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new ZohoOAuthService();