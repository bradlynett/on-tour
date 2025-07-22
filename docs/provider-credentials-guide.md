# Provider API Credentials Setup Guide

This guide provides step-by-step instructions for obtaining API credentials for the ticketing providers integrated into the Concert Travel App.

## Table of Contents

1. [StubHub API Credentials](#stubhub-api-credentials)
2. [Vivid Seats API Credentials](#vivid-seats-api-credentials)
3. [AXS API Credentials](#axs-api-credentials)
4. [Environment Configuration](#environment-configuration)
5. [Testing Credentials](#testing-credentials)
6. [Troubleshooting](#troubleshooting)

---

## StubHub API Credentials

### Overview
StubHub provides a comprehensive API for accessing ticket inventory, event information, and pricing data. They offer both sandbox and production environments.

### Prerequisites
- Business email address
- Company information
- Valid business use case
- Website or application description

### Step-by-Step Setup

#### 1. Create StubHub Developer Account
1. Visit [StubHub Developer Portal](https://developer.stubhub.com/)
2. Click "Sign Up" or "Get Started"
3. Fill out the registration form with your business information
4. Verify your email address

#### 2. Create Application
1. Log into the StubHub Developer Portal
2. Navigate to "My Apps" or "Applications"
3. Click "Create New Application"
4. Fill out the application form:
   - **Application Name**: "Concert Travel App"
   - **Description**: "Travel planning application that helps users find and book concert tickets with travel arrangements"
   - **Website URL**: Your application URL
   - **Callback URL**: `http://localhost:3000/auth/stubhub/callback` (for development)
   - **Use Case**: "Ticket search and comparison for travel planning"

#### 3. Configure OAuth2 Settings
1. In your application dashboard, go to "OAuth2 Settings"
2. Set the following:
   - **Grant Types**: Client Credentials
   - **Scopes**: `read:events`, `read:tickets`, `read:venues`
   - **Token Expiration**: 3600 seconds (1 hour)

#### 4. Get API Credentials
1. Navigate to "API Keys" or "Credentials"
2. Copy the following values:
   - **Client ID**: Your application's client identifier
   - **Client Secret**: Your application's secret key
   - **API Key**: Your API access key

#### 5. API Endpoints
- **Base URL**: `https://api.stubhub.com`
- **Authentication**: OAuth2 Bearer Token
- **Rate Limits**: Varies by plan (typically 1000 requests/hour)

### Required Environment Variables
```bash
STUBHUB_API_URL=https://api.stubhub.com
STUBHUB_API_KEY=your_api_key_here
STUBHUB_CLIENT_ID=your_client_id_here
STUBHUB_CLIENT_SECRET=your_client_secret_here
```

### API Documentation
- [StubHub API Documentation](https://developer.stubhub.com/docs)
- [Authentication Guide](https://developer.stubhub.com/docs/authentication)
- [Rate Limiting](https://developer.stubhub.com/docs/rate-limits)

---

## Vivid Seats API Credentials

### Overview
Vivid Seats offers a partner API for accessing their ticket marketplace. They focus on secondary market ticket sales and provide comprehensive event and pricing data.

### Prerequisites
- Business entity with valid tax ID
- Established business presence
- Clear use case for ticket data
- Compliance with their partner terms

### Step-by-Step Setup

#### 1. Contact Vivid Seats Partnership Team
1. Visit [Vivid Seats Partner Program](https://www.vividseats.com/partner-program)
2. Fill out the partnership inquiry form
3. Include the following information:
   - Company name and description
   - Business model and use case
   - Expected traffic volume
   - Technical requirements

#### 2. Partnership Application Process
1. **Initial Contact**: Partnership team will reach out within 2-3 business days
2. **Business Review**: They'll review your business model and compliance
3. **Technical Discussion**: Discuss API requirements and integration
4. **Agreement Signing**: Sign partnership agreement and terms of service

#### 3. Developer Account Setup
1. Once approved, you'll receive access to the developer portal
2. Create your developer account using the provided credentials
3. Complete the developer profile and verification

#### 4. Application Configuration
1. Create a new application in the developer portal
2. Configure the following settings:
   - **Application Name**: "Concert Travel App"
   - **Description**: "Travel planning platform integrating ticket search"
   - **API Access Level**: Based on your partnership tier
   - **Rate Limits**: Determined by your partnership agreement

#### 5. Get API Credentials
1. Navigate to "API Credentials" or "Keys"
2. Generate and copy:
   - **API Key**: Your primary access key
   - **Partner ID**: Your unique partner identifier
   - **Secret Key**: Your authentication secret

#### 6. API Endpoints
- **Base URL**: `https://api.vividseats.com`
- **Authentication**: API Key + Partner ID
- **Rate Limits**: Based on partnership tier

### Required Environment Variables
```bash
VIVIDSEATS_API_URL=https://api.vividseats.com
VIVIDSEATS_API_KEY=your_api_key_here
VIVIDSEATS_PARTNER_ID=your_partner_id_here
```

### API Documentation
- [Vivid Seats Partner API](https://developer.vividseats.com/)
- [Integration Guide](https://developer.vividseats.com/docs/integration)
- [Partner Terms](https://www.vividseats.com/partner-terms)

---

## AXS API Credentials

### Overview
AXS (formerly AEG Digital Media) provides ticketing services for major venues and events. They offer APIs for accessing event data and ticket inventory.

### Prerequisites
- Business verification
- Valid use case for event/ticket data
- Compliance with venue and event policies
- Technical integration capabilities

### Step-by-Step Setup

#### 1. Contact AXS Business Development
1. Visit [AXS Business Solutions](https://www.axs.com/business-solutions)
2. Navigate to "API Access" or "Developer Program"
3. Fill out the business inquiry form
4. Include detailed information about your use case

#### 2. Business Review Process
1. **Initial Assessment**: AXS team reviews your business model
2. **Technical Evaluation**: Assess your technical capabilities
3. **Compliance Check**: Verify compliance with venue policies
4. **Partnership Agreement**: Sign necessary agreements

#### 3. Developer Portal Access
1. Receive access credentials for the AXS Developer Portal
2. Complete account setup and verification
3. Review API documentation and terms of service

#### 4. Application Registration
1. Create a new application in the developer portal
2. Configure application settings:
   - **Application Name**: "Concert Travel App"
   - **Description**: "Travel planning with integrated ticketing"
   - **API Scopes**: Event data, ticket availability, pricing
   - **Rate Limits**: Based on your agreement

#### 5. OAuth2 Configuration
1. Set up OAuth2 credentials:
   - **Client ID**: Your application identifier
   - **Client Secret**: Your application secret
   - **Redirect URIs**: Your application callback URLs
   - **Scopes**: `events:read`, `tickets:read`, `venues:read`

#### 6. Get API Credentials
1. Navigate to "Credentials" or "API Keys"
2. Copy the following values:
   - **API Key**: Your primary access key
   - **Client ID**: OAuth2 client identifier
   - **Client Secret**: OAuth2 client secret

#### 7. API Endpoints
- **Base URL**: `https://api.axs.com`
- **Authentication**: OAuth2 Bearer Token + API Key
- **Rate Limits**: Based on partnership agreement

### Required Environment Variables
```bash
AXS_API_URL=https://api.axs.com
AXS_API_KEY=your_api_key_here
AXS_CLIENT_ID=your_client_id_here
AXS_CLIENT_SECRET=your_client_secret_here
```

### API Documentation
- [AXS Developer Portal](https://developer.axs.com/)
- [API Reference](https://developer.axs.com/docs/api-reference)
- [Authentication Guide](https://developer.axs.com/docs/authentication)

---

## Environment Configuration

### 1. Create Environment File
Create or update your `.env` file in the backend directory:

```bash
# StubHub Configuration
STUBHUB_API_URL=https://api.stubhub.com
STUBHUB_API_KEY=your_stubhub_api_key_here
STUBHUB_CLIENT_ID=your_stubhub_client_id_here
STUBHUB_CLIENT_SECRET=your_stubhub_client_secret_here

# Vivid Seats Configuration
VIVIDSEATS_API_URL=https://api.vividseats.com
VIVIDSEATS_API_KEY=your_vividseats_api_key_here
VIVIDSEATS_PARTNER_ID=your_vividseats_partner_id_here

# AXS Configuration
AXS_API_URL=https://api.axs.com
AXS_API_KEY=your_axs_api_key_here
AXS_CLIENT_ID=your_axs_client_id_here
AXS_CLIENT_SECRET=your_axs_client_secret_here
```

### 2. Environment File Security
- Never commit `.env` files to version control
- Use different credentials for development and production
- Rotate credentials regularly
- Use environment-specific configuration files

### 3. Production Deployment
For production environments, set environment variables through your hosting platform:

```bash
# Example for Heroku
heroku config:set STUBHUB_API_KEY=your_production_key
heroku config:set STUBHUB_CLIENT_ID=your_production_client_id
heroku config:set STUBHUB_CLIENT_SECRET=your_production_client_secret

# Example for Docker
docker run -e STUBHUB_API_KEY=your_key -e STUBHUB_CLIENT_ID=your_id ...
```

---

## Testing Credentials

### 1. Health Check
Test if your credentials are working:

```bash
# Check provider health
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/ticketing/health
```

### 2. Provider Availability
Check which providers are available:

```bash
# Get available providers
curl http://localhost:5001/api/ticketing/providers
```

### 3. Test Search
Test ticket search functionality:

```bash
# Search for tickets
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5001/api/ticketing/search?eventName=concert&maxResults=5"
```

### 4. Run Test Script
Use the provided test script:

```bash
# Run comprehensive tests
node scripts/test-ticketing-providers.js

# Or use PowerShell
.\scripts\test-ticketing-providers.ps1
```

---

## Troubleshooting

### Common Issues

#### 1. "Provider Unavailable" Error
**Problem**: Provider shows as unavailable in health check
**Solutions**:
- Verify environment variables are set correctly
- Check API credentials are valid and not expired
- Ensure proper authentication format
- Verify API endpoints are accessible

#### 2. Authentication Failures
**Problem**: 401 Unauthorized errors
**Solutions**:
- Verify Client ID and Client Secret are correct
- Check if OAuth2 tokens are expired
- Ensure proper authentication headers
- Verify API key format and permissions

#### 3. Rate Limiting
**Problem**: 429 Too Many Requests errors
**Solutions**:
- Implement request throttling
- Use caching to reduce API calls
- Check your rate limit quotas
- Contact provider to increase limits

#### 4. No Results Returned
**Problem**: Search returns empty results
**Solutions**:
- Verify search parameters are correct
- Check if events exist in provider's database
- Test with known event IDs
- Verify API permissions include search scope

### Debug Commands

#### Check Environment Variables
```bash
# Verify environment variables are loaded
node -e "console.log('STUBHUB_API_KEY:', process.env.STUBHUB_API_KEY ? 'SET' : 'NOT SET')"
node -e "console.log('VIVIDSEATS_API_KEY:', process.env.VIVIDSEATS_API_KEY ? 'SET' : 'NOT SET')"
node -e "console.log('AXS_API_KEY:', process.env.AXS_API_KEY ? 'SET' : 'NOT SET')"
```

#### Test Individual Providers
```bash
# Test StubHub
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5001/api/ticketing/search?eventName=test&preferredProvider=stubhub"

# Test Vivid Seats
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5001/api/ticketing/search?eventName=test&preferredProvider=vividseats"

# Test AXS
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5001/api/ticketing/search?eventName=test&preferredProvider=axs"
```

#### Check Logs
```bash
# View application logs
tail -f logs/combined.log | grep -i "ticketing\|stubhub\|vividseats\|axs"

# Check for authentication errors
grep -i "auth\|token\|credential" logs/error.log
```

### Support Contacts

#### StubHub Developer Support
- **Email**: developer-support@stubhub.com
- **Documentation**: https://developer.stubhub.com/docs
- **Community**: https://developer.stubhub.com/community

#### Vivid Seats Partner Support
- **Email**: partners@vividseats.com
- **Phone**: 1-866-848-8493
- **Partner Portal**: https://partner.vividseats.com

#### AXS Developer Support
- **Email**: developer-support@axs.com
- **Documentation**: https://developer.axs.com/docs
- **Support Portal**: https://support.axs.com

---

## Best Practices

### 1. Credential Management
- Store credentials securely (use environment variables)
- Rotate credentials regularly
- Use different credentials for development and production
- Never hardcode credentials in source code

### 2. API Usage
- Implement proper error handling
- Use caching to reduce API calls
- Respect rate limits
- Monitor API usage and costs

### 3. Testing
- Test with sandbox environments when available
- Use realistic test data
- Monitor API responses and errors
- Keep test credentials separate from production

### 4. Monitoring
- Set up alerts for API failures
- Monitor rate limit usage
- Track response times
- Log API errors for debugging

---

## Cost Considerations

### StubHub
- **Free Tier**: Limited API calls per month
- **Paid Plans**: Based on API call volume
- **Enterprise**: Custom pricing for high-volume usage

### Vivid Seats
- **Partnership Model**: Revenue sharing or flat fees
- **Volume Discounts**: Based on ticket sales volume
- **Custom Agreements**: For enterprise clients

### AXS
- **Partnership Pricing**: Based on business agreement
- **Volume-Based**: Pricing scales with usage
- **Enterprise**: Custom pricing for large integrations

---

## Legal and Compliance

### Terms of Service
- Review and comply with each provider's terms of service
- Understand data usage restrictions
- Follow branding and attribution requirements
- Comply with privacy regulations (GDPR, CCPA)

### Data Usage
- Respect rate limits and fair use policies
- Implement proper data retention policies
- Follow provider-specific data handling requirements
- Ensure user consent for data collection

### Attribution
- Display provider logos and branding as required
- Include proper attribution in your application
- Follow linking and referral requirements
- Comply with trademark usage guidelines

---

## Next Steps

1. **Apply for API Access**: Follow the step-by-step guides above
2. **Set Up Credentials**: Configure environment variables
3. **Test Integration**: Use the provided test scripts
4. **Monitor Usage**: Set up monitoring and alerts
5. **Scale Up**: Optimize based on usage patterns

For additional support or questions about the integration, refer to the main documentation or contact the development team. 