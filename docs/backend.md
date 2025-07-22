# Backend Documentation

## Overview

The Concert Travel App backend is a Node.js/Express application that provides comprehensive travel booking services integrated with multiple providers, primarily Amadeus API. The backend handles user authentication, travel search, booking management, and integrates with various external services.

## Architecture

### Core Components

- **Express.js Server**: Main application server
- **PostgreSQL Database**: User data, preferences, and booking history
- **Redis Cache**: Performance optimization and session management
- **Amadeus API**: Primary travel provider for flights, hotels, and car rentals
- **Spotify API**: Music preferences and artist data
- **Event APIs**: Concert and event information

### Service Layer

- **UnifiedTravelService**: Orchestrates multiple travel providers
- **AmadeusService**: Direct Amadeus API integration
- **ErrorHandler**: Centralized error handling and user-friendly messages
- **TripPlanningService**: Intelligent trip suggestions
- **NotificationService**: Email and SMS notifications

## API Endpoints

### Authentication

```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

### Travel Services

#### Flight Search
```
GET /travel/flights
Query Parameters:
- origin (required): 3-letter airport code
- destination (required): 3-letter airport code
- departureDate (required): YYYY-MM-DD
- returnDate (optional): YYYY-MM-DD
- passengers (optional): Number of passengers (1-9)
- maxResults (optional): Maximum results to return (1-50)
- provider (optional): Specific provider to use

Response:
{
  "success": true,
  "data": [...],
  "providers": [...],
  "meta": {
    "count": 5,
    "providerCount": 1,
    "responseTime": 1250
  }
}
```

#### Hotel Search
```
GET /travel/hotels
Query Parameters:
- cityCode (required): 3-letter city code
- checkInDate (required): YYYY-MM-DD
- checkOutDate (required): YYYY-MM-DD
- adults (optional): Number of adults (1-10)
- radius (optional): Search radius in KM (1-50)
- maxResults (optional): Maximum results to return (1-100)
```

#### Car Rental Search
```
GET /travel/cars
Query Parameters:
- pickUpLocation (required): 3-letter airport/city code
- dropOffLocation (required): 3-letter airport/city code
- pickUpDate (required): YYYY-MM-DDTHH:MM:SS
- dropOffDate (required): YYYY-MM-DDTHH:MM:SS
- maxResults (optional): Maximum results to return (1-50)
```

#### Airport/City Search
```
GET /travel/airports
Query Parameters:
- keyword (required): Search term (2-50 characters)
```

#### Multi-City Flight Search
```
GET /travel/flights/multi-city
Query Parameters:
- segments (required): JSON array of flight segments
  [{"origin": "LAX", "destination": "JFK", "date": "2024-12-25"}]
- passengers (optional): Number of passengers (1-9)
- maxResults (optional): Maximum results to return (1-50)
```

#### Travel Packages
```
GET /travel/packages
Query Parameters:
- origin (required): 3-letter airport code
- destination (required): 3-letter airport code
- departureDate (required): YYYY-MM-DD
- returnDate (optional): YYYY-MM-DD
- passengers (optional): Number of passengers (1-9)
- includeHotel (optional): "true" or "false"
- includeCar (optional): "true" or "false"
- maxResults (optional): Maximum results to return (1-20)
```

### Health and Monitoring

```
GET /travel/health
GET /travel/providers
GET /travel/providers/stats
```

## Error Handling

The backend implements comprehensive error handling with user-friendly messages:

### Error Response Format
```json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "message": "User-friendly error message",
    "shouldRetry": false,
    "technicalDetails": {} // Only in development
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Common Error Types

- **INVALID DATE**: Date is in the past or invalid format
- **INVALID LOCATION**: Airport/city code not recognized
- **NO FLIGHTS FOUND**: No flights available for route/date
- **NO HOTELS FOUND**: No hotels available for location/date
- **RATE LIMIT EXCEEDED**: Too many API requests
- **AUTHENTICATION FAILED**: API credentials issue
- **SERVICE UNAVAILABLE**: Provider temporarily unavailable
- **VALIDATION_ERROR**: Invalid request parameters
- **NETWORK_ERROR**: Connection issues

## Amadeus Integration

### Configuration

Add to your `.env` file:
```
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
```

### Features

- **Flight Search**: Real-time flight availability and pricing
- **Hotel Search**: Hotel availability with amenities and pricing
- **Car Rental**: Vehicle rental options and pricing
- **Airport Search**: Airport and city code lookup
- **Price History**: Historical pricing data (if available)

### Testing

Run the Amadeus integration test:
```bash
node scripts/test-amadeus-keys.js
```

## Caching Strategy

- **Redis Cache**: 15-minute TTL for search results
- **Cache Keys**: Include search parameters for uniqueness
- **Cache Invalidation**: Manual cache clearing via admin endpoints

## Performance Monitoring

The backend includes comprehensive performance monitoring:

- **Response Time Tracking**: All API endpoints track response times
- **Success/Error Logging**: Detailed logging for all operations
- **Provider Health Checks**: Regular monitoring of external services
- **Cache Hit/Miss Tracking**: Performance metrics for caching

## Security

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **Error Sanitization**: No sensitive data in error responses

## Development

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Start the development server:
```bash
npm run dev
```

### Testing

Run the test suite:
```bash
npm test
```

Run specific test files:
```bash
npm test -- tests/travel.test.js
```

### Database Migrations

Run migrations:
```bash
node run-migration.js
```

## Deployment

### Production Considerations

- **Environment Variables**: Ensure all required environment variables are set
- **Database**: Use production PostgreSQL instance
- **Redis**: Configure production Redis instance
- **Logging**: Configure production logging levels
- **Monitoring**: Set up application monitoring and alerting
- **SSL/TLS**: Enable HTTPS in production

### Docker Deployment

```bash
docker-compose up -d
```

## API Rate Limits

- **Amadeus API**: Respects Amadeus rate limits (varies by plan)
- **Application Level**: Implemented rate limiting per user/IP
- **Caching**: Reduces API calls through intelligent caching

## Troubleshooting

### Common Issues

1. **Amadeus Authentication Failed**
   - Verify API credentials in `.env`
   - Check Amadeus account status
   - Ensure correct environment (test/production)

2. **No Search Results**
   - Verify date is in the future
   - Check airport/city codes are valid
   - Try different dates or locations

3. **Rate Limit Exceeded**
   - Wait before making additional requests
   - Check cache for existing results
   - Consider upgrading Amadeus plan

### Debug Mode

Enable debug logging by setting:
```
NODE_ENV=development
```

This will provide detailed error information and technical details in responses.

## Related Docs
- [System Architecture](architecture.md)
- [Artist Metadata System](artist-metadata-system.md)
- [Enhanced Artist Matching](enhanced-artist-matching.md)
- [Database Documentation](database.md)

---
[Back to README](../README.md) 