# Provider Credentials Quick Reference

## 🚀 Quick Start

### 1. Apply for API Access
| Provider | Application Link | Contact | Estimated Time |
|----------|------------------|---------|----------------|
| **StubHub** | [Developer Portal](https://developer.stubhub.com/) | developer-support@stubhub.com | 1-2 weeks |
| **Vivid Seats** | [Partner Program](https://www.vividseats.com/partner-program) | partners@vividseats.com | 2-4 weeks |
| **AXS** | [Business Solutions](https://www.axs.com/business-solutions) | developer-support@axs.com | 3-6 weeks |

### 2. Required Environment Variables
```bash
# Add to your .env file
STUBHUB_API_KEY=your_key_here
STUBHUB_CLIENT_ID=your_client_id_here
STUBHUB_CLIENT_SECRET=your_client_secret_here

VIVIDSEATS_API_KEY=your_key_here
VIVIDSEATS_PARTNER_ID=your_partner_id_here

AXS_API_KEY=your_key_here
AXS_CLIENT_ID=your_client_id_here
AXS_CLIENT_SECRET=your_client_secret_here
```

### 3. Test Your Setup
```bash
# Run the test script
node scripts/test-ticketing-providers.js

# Or check health directly
curl http://localhost:5001/api/ticketing/health
```

---

## 📋 Application Checklist

### StubHub
- [ ] Create developer account at [developer.stubhub.com](https://developer.stubhub.com/)
- [ ] Create application with OAuth2 settings
- [ ] Get Client ID, Client Secret, and API Key
- [ ] Configure scopes: `read:events`, `read:tickets`, `read:venues`

### Vivid Seats
- [ ] Contact partnership team via [partner program](https://www.vividseats.com/partner-program)
- [ ] Complete business review and sign agreement
- [ ] Get API Key and Partner ID
- [ ] Set up developer portal access

### AXS
- [ ] Contact business development via [business solutions](https://www.axs.com/business-solutions)
- [ ] Complete technical evaluation and compliance check
- [ ] Get API Key, Client ID, and Client Secret
- [ ] Configure OAuth2 settings

---

## 🔧 API Endpoints

### Base URLs
- **StubHub**: `https://api.stubhub.com`
- **Vivid Seats**: `https://api.vividseats.com`
- **AXS**: `https://api.axs.com`

### Authentication Methods
- **StubHub**: OAuth2 Bearer Token
- **Vivid Seats**: API Key + Partner ID
- **AXS**: OAuth2 Bearer Token + API Key

---

## 🧪 Testing Commands

### Health Check
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/ticketing/health
```

### Provider List
```bash
curl http://localhost:5001/api/ticketing/providers
```

### Search Test
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5001/api/ticketing/search?eventName=concert&maxResults=5"
```

### Individual Provider Test
```bash
# Test specific provider
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5001/api/ticketing/search?eventName=test&preferredProvider=stubhub"
```

---

## 🚨 Common Issues

### "Provider Unavailable"
- Check environment variables are set
- Verify API credentials are valid
- Ensure proper authentication format

### "401 Unauthorized"
- Verify Client ID and Client Secret
- Check if OAuth2 tokens are expired
- Ensure proper authentication headers

### "429 Rate Limited"
- Implement request throttling
- Use caching to reduce API calls
- Check rate limit quotas

---

## 📞 Support Contacts

| Provider | Email | Phone | Documentation |
|----------|-------|-------|---------------|
| **StubHub** | developer-support@stubhub.com | - | [docs](https://developer.stubhub.com/docs) |
| **Vivid Seats** | partners@vividseats.com | 1-866-848-8493 | [partner portal](https://partner.vividseats.com) |
| **AXS** | developer-support@axs.com | - | [docs](https://developer.axs.com/docs) |

---

## 💰 Cost Overview

| Provider | Model | Typical Cost |
|----------|-------|--------------|
| **StubHub** | Volume-based | $0.01-0.10 per API call |
| **Vivid Seats** | Revenue sharing | 5-15% of ticket sales |
| **AXS** | Partnership-based | Custom pricing |

---

## 🔒 Security Best Practices

- ✅ Store credentials in environment variables
- ✅ Never commit `.env` files to version control
- ✅ Use different credentials for dev/prod
- ✅ Rotate credentials regularly
- ✅ Monitor API usage and costs

---

## 📚 Full Documentation

For complete setup instructions, see:
- [Provider Credentials Setup Guide](./provider-credentials-guide.md)
- [Ticketing Providers Integration](./ticketing-providers-integration.md)

---

## 🎯 Next Steps

1. **Apply for API access** using the links above
2. **Set up environment variables** in your `.env` file
3. **Test the integration** using the provided scripts
4. **Monitor usage** and optimize based on patterns
5. **Scale up** as your application grows 