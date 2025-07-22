# Ticketing Providers Integration

This document describes the integration of multiple ticketing providers (StubHub, Vivid Seats, AXS) into the Concert Travel App backend system.

## Overview

The ticketing providers integration provides a unified interface for searching tickets across multiple platforms, enabling users to compare prices and find the best deals for concert tickets.

## Integrated Providers

### Primary Providers
- **Ticketmaster** - Primary ticket sales and official event listings
- **Eventbrite** - Event discovery and ticket sales
- **StubHub** - Secondary market ticket resale
- **Vivid Seats** - Secondary market ticket resale
- **AXS** - Official ticketing for specific venues and events

### Provider Priority Order
1. Ticketmaster (official primary sales)
2. Eventbrite (event discovery)
3. StubHub (secondary market)
4. Vivid Seats (secondary market)
5. AXS (official venue ticketing)

## Architecture

### Unified Ticketing Service
The `UnifiedTicketingService` class provides a single interface for all ticketing operations:

```javascript
const UnifiedTicketingService = require('./services/unifiedTicketingService');
const ticketingService = new UnifiedTicketingService();

// Search tickets across all providers
const results = await ticketingService.searchTickets(
    eventId,
    eventName,
    venueName,
    eventDate,
    maxResults,
    preferredProvider
);
```

### Provider Interface
All providers implement the `TravelProviderInterface` and provide:

- **Authentication** - OAuth2 or API key authentication
- **Health Checks** - Provider availability monitoring
- **Ticket Search** - Event-based ticket discovery
- **Caching** - Redis-based result caching (15 minutes)
- **Error Handling** - Graceful fallbacks and error reporting

## API Endpoints

### Base URL
```
/api/ticketing
```

### Endpoints

#### GET `/api/ticketing/search`
Search tickets across all available providers.

**Query Parameters:**
- `eventId` (optional) - Specific event ID
- `eventName` (optional) - Event name for search
- `venueName` (optional) - Venue name for filtering
- `eventDate` (optional) - Event date (YYYY-MM-DD)
- `maxResults` (optional) - Maximum results per provider (default: 10)
- `preferredProvider` (optional) - Specific provider to search

**Response:**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "provider": "stubhub",
        "providerId": "ticket123",
        "eventId": "event456",
        "price": 150.00,
        "currency": "USD",
        "section": "100",
        "row": "A",
        "seat": "15",
        "quantity": 1,
        "deliveryMethod": "Mobile Entry",
        "ticketType": "General Admission",
        "location": {
          "venue": "MetLife Stadium",
          "section": "100",
          "row": "A",
          "seat": "15",
          "view": "Premium floor seating",
          "distance": "20 feet from stage",
          "angle": "Center stage",
          "obstructed": false
        },
        "restrictions": {
          "transferable": true,
          "refundable": false,
          "ageRestriction": "All ages",
          "photoId": false
        },
        "details": {
          "sellerRating": 4.8,
          "sellerName": "Trusted Seller",
          "listingDate": "2024-01-15T10:00:00Z",
          "lastUpdated": "2024-01-15T10:00:00Z",
          "notes": "Great seats!",
          "fees": 25.00,
          "totalPrice": 175.00
        },
        "url": "https://www.stubhub.com/ticket/ticket123",
        "lastUpdated": "2024-01-15T10:00:00Z",
        "searchProvider": "stubhub"
      }
    ],
    "providers": [
      {
        "name": "stubhub",
        "status": "success",
        "count": 5
      }
    ],
    "meta": {
      "eventId": "event456",
      "eventName": "Taylor Swift Concert",
      "venueName": "MetLife Stadium",
      "eventDate": "2024-12-15",
      "searchTime": "2024-01-15T10:00:00Z",
      "totalResults": 5
    }
  }
}
```

#### GET `/api/ticketing/providers`
Get available ticketing providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "available": ["ticketmaster", "eventbrite", "stubhub"],
    "all": ["ticketmaster", "eventbrite", "stubhub", "vividseats", "axs"]
  }
}
```

#### GET `/api/ticketing/health`
Get health status of all ticketing providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "ticketmaster": {
      "status": "healthy",
      "responseTime": "150ms",
      "rateLimit": "950/1000"
    },
    "stubhub": {
      "status": "unavailable",
      "reason": "Missing API credentials"
    }
  }
}
```

#### GET `/api/ticketing/compare`
Compare ticket prices across providers.

**Query Parameters:**
- `eventId` (optional) - Specific event ID
- `eventName` (optional) - Event name for search
- `venueName` (optional) - Venue name for filtering
- `eventDate` (optional) - Event date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "event456",
    "eventName": "Taylor Swift Concert",
    "venueName": "MetLife Stadium",
    "eventDate": "2024-12-15",
    "comparisonTime": "2024-01-15T10:00:00Z",
    "priceRanges": {
      "stubhub": {
        "min": 150.00,
        "max": 500.00,
        "average": 275.50,
        "median": 250.00,
        "count": 10
      }
    },
    "providerStats": {
      "stubhub": {
        "totalTickets": 10,
        "availableSections": ["100", "200", "300"],
        "deliveryMethods": ["Mobile Entry", "Will Call"]
      }
    }
  }
}
```

#### GET `/api/ticketing/trending`
Get trending events across all providers.

**Query Parameters:**
- `limit` (optional) - Maximum number of events (default: 20)

#### GET `/api/ticketing/details/:provider/:ticketId`
Get detailed ticket information from specific provider.

#### GET `/api/ticketing/stats`
Get ticketing service statistics.

## Environment Variables

### StubHub
```bash
STUBHUB_API_URL=https://api.stubhub.com
STUBHUB_API_KEY=your_api_key
STUBHUB_CLIENT_ID=your_client_id
STUBHUB_CLIENT_SECRET=your_client_secret
```

### Vivid Seats
```bash
VIVIDSEATS_API_URL=https://api.vividseats.com
VIVIDSEATS_API_KEY=your_api_key
VIVIDSEATS_PARTNER_ID=your_partner_id
```

### AXS
```bash
AXS_API_URL=https://api.axs.com
AXS_API_KEY=your_api_key
AXS_CLIENT_ID=your_client_id
AXS_CLIENT_SECRET=your_client_secret
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Add the required environment variables to your `.env` file:

```bash
# StubHub Configuration
STUBHUB_API_KEY=your_stubhub_api_key
STUBHUB_CLIENT_ID=your_stubhub_client_id
STUBHUB_CLIENT_SECRET=your_stubhub_client_secret

# Vivid Seats Configuration
VIVIDSEATS_API_KEY=your_vividseats_api_key
VIVIDSEATS_PARTNER_ID=your_vividseats_partner_id

# AXS Configuration
AXS_API_KEY=your_axs_api_key
AXS_CLIENT_ID=your_axs_client_id
AXS_CLIENT_SECRET=your_axs_client_secret
```

### 3. Start the Server
```bash
npm start
```

### 4. Test the Integration
```bash
# Run the test script
node scripts/test-ticketing-providers.js

# Or use PowerShell
.\scripts\test-ticketing-providers.ps1
```

## Usage Examples

### Search Tickets
```javascript
// Search for tickets by event name
const response = await fetch('/api/ticketing/search?eventName=Taylor Swift&venueName=MetLife Stadium&maxResults=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const results = await response.json();
console.log(`Found ${results.data.tickets.length} tickets`);
```

### Compare Prices
```javascript
// Compare prices across providers
const response = await fetch('/api/ticketing/compare?eventName=Taylor Swift', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const comparison = await response.json();
console.log('Price ranges:', comparison.data.priceRanges);
```

### Check Provider Health
```javascript
// Check provider health
const response = await fetch('/api/ticketing/health', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const health = await response.json();
Object.entries(health.data).forEach(([provider, status]) => {
  console.log(`${provider}: ${status.status}`);
});
```

## Error Handling

The system includes comprehensive error handling:

### Provider Unavailable
- Providers without valid credentials are marked as "unavailable"
- The system continues to search other available providers
- Users receive clear feedback about which providers are working

### API Errors
- Network timeouts and API errors are caught and logged
- Failed providers don't prevent other providers from being searched
- Detailed error messages are provided for debugging

### Rate Limiting
- Each provider implements its own rate limiting
- Requests are cached to reduce API calls
- Exponential backoff is used for retries

## Caching Strategy

### Redis Caching
- Search results are cached for 15 minutes
- Cache keys include search parameters for uniqueness
- Cache is automatically invalidated after expiration

### Cache Keys
```
unified_tickets_{eventId}_{eventDate}_{maxResults}_{preferredProvider}
stubhub_tickets_{eventId}_{eventDate}_{maxResults}
vividseats_tickets_{eventId}_{eventDate}_{maxResults}
axs_tickets_{eventId}_{eventDate}_{maxResults}
```

## Monitoring and Logging

### Health Monitoring
- Provider health is checked regularly
- Status is reported via `/api/ticketing/health` endpoint
- Failed providers are logged for investigation

### Performance Metrics
- Response times are tracked for each provider
- Success/failure rates are monitored
- Cache hit rates are measured

### Logging
- All API calls are logged with timestamps
- Error details are captured for debugging
- Provider-specific logs help identify issues

## Future Enhancements

### Planned Features
1. **Real-time Price Tracking** - Monitor price changes and alert users
2. **Price Prediction** - Use historical data to predict price trends
3. **Smart Recommendations** - Suggest best times to buy based on patterns
4. **Mobile Notifications** - Push notifications for price drops
5. **Advanced Filtering** - Filter by section, price range, delivery method

### Additional Providers
1. **SeatGeek** - Additional secondary market
2. **Gametime** - Last-minute ticket sales
3. **Venue-specific APIs** - Direct venue integrations

## Troubleshooting

### Common Issues

#### Provider Not Available
**Problem:** Provider shows as "unavailable"
**Solution:** Check environment variables and API credentials

#### No Results Found
**Problem:** Search returns no tickets
**Solution:** Verify event details and try different search parameters

#### Slow Response Times
**Problem:** API calls are slow
**Solution:** Check network connectivity and provider rate limits

### Debug Commands
```bash
# Check provider health
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/ticketing/health

# Test specific provider
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5001/api/ticketing/search?eventName=test&preferredProvider=stubhub"

# Check available providers
curl http://localhost:5001/api/ticketing/providers
```

## Support

For issues with the ticketing providers integration:

1. Check the logs in `logs/` directory
2. Verify environment variables are set correctly
3. Test individual providers using the health endpoint
4. Review the test script output for specific errors

## API Documentation

For complete API documentation, see the individual provider documentation:

- [StubHub API Documentation](https://developer.stubhub.com/)
- [Vivid Seats API Documentation](https://developer.vividseats.com/)
- [AXS API Documentation](https://developer.axs.com/) 