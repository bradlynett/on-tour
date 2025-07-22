# Booking System Documentation

## Overview

The Concert Travel App booking system provides a comprehensive, integrated solution for booking complete trips including flights, hotels, tickets, transportation, and car rentals. The system handles background processing, multiple provider integration, and provides a seamless user experience.

## Architecture

### Core Components

1. **Booking Service** (`backend/services/bookingService.js`)
   - Handles background booking processing
   - Manages multiple provider integrations
   - Provides booking status tracking
   - Handles cancellations and refunds

2. **Booking Routes** (`backend/routes/booking.js`)
   - RESTful API endpoints for booking operations
   - Input validation and error handling
   - Authentication and authorization

3. **Enhanced Trip Cards** (`frontend/src/components/EnhancedTripCard.tsx`)
   - Displays real booking options
   - Shows pricing and availability
   - Integrates with booking flow

4. **Booking Flow** (`frontend/src/components/BookingFlow.tsx`)
   - Step-by-step booking process
   - Component selection and customization
   - Background booking processing
   - Confirmation and receipt generation

### Database Schema

```sql
-- Bookings table
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    trip_id INT NOT NULL,
    status ENUM('processing', 'confirmed', 'partial', 'failed', 'cancelled', 'refund_requested'),
    total_components INT NOT NULL,
    total_cost DECIMAL(10,2),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Booking components table
CREATE TABLE booking_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(50) NOT NULL,
    component_type ENUM('flight', 'hotel', 'ticket', 'car', 'transportation'),
    provider VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status ENUM('processing', 'confirmed', 'failed', 'cancelled'),
    booking_reference VARCHAR(100),
    confirmation_number VARCHAR(100),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints

### Authentication Required Endpoints

#### POST `/api/booking/trip`
Book a complete trip with multiple components.

**Request Body:**
```json
{
  "tripId": 123,
  "selections": [
    {
      "componentType": "flight",
      "selectedOption": {
        "id": "flight-1",
        "provider": "Delta Airlines",
        "price": 350,
        "features": ["Direct Flight", "Free WiFi"],
        "availability": "available",
        "details": {
          "departure": "JFK",
          "arrival": "LAX",
          "departureTime": "10:00 AM",
          "arrivalTime": "1:30 PM"
        }
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking process initiated successfully",
  "data": {
    "bookingId": "TRIP-123-1703123456789",
    "status": "processing",
    "estimatedCompletion": "2-5 minutes",
    "components": 1,
    "totalCost": 350
  }
}
```

#### GET `/api/booking/status/:bookingId`
Get booking status and details.

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "TRIP-123-1703123456789",
    "status": "confirmed",
    "totalCost": 350,
    "components": [
      {
        "componentType": "flight",
        "provider": "Delta Airlines",
        "price": 350,
        "bookingReference": "DL-123456",
        "confirmationNumber": "CN-ABC123DEF",
        "status": "confirmed"
      }
    ],
    "createdAt": "2023-12-21T10:30:00Z",
    "updatedAt": "2023-12-21T10:32:00Z"
  }
}
```

#### GET `/api/booking/history`
Get user's booking history.

**Query Parameters:**
- `limit` (optional): Number of bookings to return (default: 10)
- `offset` (optional): Number of bookings to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "booking_id": "TRIP-123-1703123456789",
        "status": "confirmed",
        "total_cost": 350,
        "created_at": "2023-12-21T10:30:00Z"
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 1
    }
  }
}
```

#### POST `/api/booking/:bookingId/cancel`
Cancel a booking.

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "bookingId": "TRIP-123-1703123456789",
    "status": "cancelled"
  }
}
```

#### GET `/api/booking/analytics`
Get booking analytics for the user.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_bookings": 5,
    "successful_bookings": 4,
    "failed_bookings": 1,
    "partial_bookings": 0,
    "total_spent": 1250.00,
    "avg_components_per_booking": 3.2
  }
}
```

#### GET `/api/booking/:bookingId/receipt`
Get booking receipt.

**Response:**
```json
{
  "success": true,
  "data": {
    "bookingId": "TRIP-123-1703123456789",
    "bookingDate": "2023-12-21T10:30:00Z",
    "totalAmount": 350,
    "components": [
      {
        "type": "flight",
        "provider": "Delta Airlines",
        "price": 350,
        "bookingReference": "DL-123456",
        "confirmationNumber": "CN-ABC123DEF"
      }
    ],
    "status": "confirmed"
  }
}
```

#### POST `/api/booking/:bookingId/refund`
Request a refund for a booking.

**Request Body:**
```json
{
  "reason": "Change of plans - need to cancel this booking due to unexpected circumstances",
  "components": ["flight", "hotel"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refund request submitted successfully",
  "data": {
    "bookingId": "TRIP-123-1703123456789",
    "status": "refund_requested",
    "estimatedProcessingTime": "3-5 business days"
  }
}
```

### Public Endpoints

#### GET `/api/booking/providers`
Get available booking providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "flights": ["Skyscanner", "Amadeus", "Expedia", "Kayak"],
    "hotels": ["Booking.com", "Hotels.com", "Airbnb", "Expedia"],
    "tickets": ["Ticketmaster", "Eventbrite", "StubHub", "Vivid Seats"],
    "transportation": ["Uber", "Lyft", "Taxi", "Public Transit"],
    "cars": ["Hertz", "Avis", "Enterprise", "Budget"]
  }
}
```

#### GET `/api/booking/health`
Check booking service health.

**Response:**
```json
{
  "success": true,
  "message": "Booking service is healthy",
  "timestamp": "2023-12-21T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "booking": "operational"
  }
}
```

## Frontend Integration

### Enhanced Trip Cards

The enhanced trip cards display real booking options with pricing, availability, and features. Users can expand components to see multiple options and select their preferences.

**Key Features:**
- Real-time pricing and availability
- Provider ratings and reviews
- Feature highlights and cancellation policies
- Popularity indicators and savings badges
- Favorite functionality

### Booking Flow

The booking flow provides a step-by-step process for customizing and booking trips:

1. **Component Selection**: Choose preferred options for each component
2. **Customization**: Review and customize selections
3. **Review & Confirm**: Final review of all selections and total cost
4. **Processing**: Background booking processing with progress tracking
5. **Completion**: Confirmation with booking details and receipts

**Key Features:**
- Real-time progress tracking
- Background processing
- Comprehensive error handling
- Booking confirmation with details
- Receipt generation

## Usage Examples

### Basic Trip Booking

```javascript
// 1. Get trip suggestions
const suggestions = await api.get('/trips');

// 2. Create booking
const bookingResponse = await api.post('/booking/trip', {
  tripId: 123,
  selections: [
    {
      componentType: 'flight',
      selectedOption: {
        id: 'flight-1',
        provider: 'Delta Airlines',
        price: 350,
        features: ['Direct Flight', 'Free WiFi'],
        availability: 'available',
        details: {
          departure: 'JFK',
          arrival: 'LAX',
          departureTime: '10:00 AM',
          arrivalTime: '1:30 PM'
        }
      }
    }
  ]
});

// 3. Check booking status
const status = await api.get(`/booking/status/${bookingResponse.data.bookingId}`);

// 4. Get receipt
const receipt = await api.get(`/booking/receipt/${bookingResponse.data.bookingId}`);
```

### Booking Management

```javascript
// Get booking history
const history = await api.get('/booking/history?limit=10&offset=0');

// Get analytics
const analytics = await api.get('/booking/analytics');

// Cancel booking
const cancellation = await api.post(`/booking/${bookingId}/cancel`);

// Request refund
const refund = await api.post(`/booking/${bookingId}/refund`, {
  reason: 'Change of plans',
  components: ['flight']
});
```

## Error Handling

The booking system includes comprehensive error handling:

### Common Error Codes

- `400`: Invalid request data (validation errors)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (access denied)
- `404`: Booking not found
- `409`: Booking conflict
- `429`: Rate limit exceeded
- `500`: Internal server error

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "errors": [
    {
      "field": "selections.0.componentType",
      "message": "Component type is required"
    }
  ]
}
```

## Background Processing

The booking system uses background processing to handle multiple provider integrations:

### Processing Flow

1. **Immediate Response**: Return booking ID and estimated completion time
2. **Background Processing**: Process each component with different providers
3. **Status Updates**: Update booking status as components are processed
4. **Completion**: Final status update with all booking details

### Provider Integration

The system supports multiple providers for each component type:

- **Flights**: Skyscanner, Amadeus, Expedia, Kayak
- **Hotels**: Booking.com, Hotels.com, Airbnb, Expedia
- **Tickets**: Ticketmaster, Eventbrite, StubHub, Vivid Seats
- **Transportation**: Uber, Lyft, Taxi, Public Transit
- **Cars**: Hertz, Avis, Enterprise, Budget

## Testing

### Running Tests

```bash
# Run booking system tests
node scripts/test-booking-system.js

# Run specific test
node -e "require('./scripts/test-booking-system.js').testCreateBooking()"
```

### Test Coverage

The test suite covers:
- Authentication and authorization
- Trip suggestion retrieval
- Booking creation and management
- Status checking and updates
- Cancellation and refund requests
- Validation and error handling
- Provider integration
- Analytics and reporting

## Monitoring and Logging

### Logging

The booking system uses structured logging for all operations:

```javascript
logger.info('Trip booking request received', {
  userId,
  tripId,
  componentCount: selections.length
});

logger.error('Booking process failed', {
  bookingId,
  error: error.message
});
```

### Health Checks

Regular health checks monitor:
- Database connectivity
- Redis cache status
- External provider availability
- System resource usage

### Metrics

Key metrics tracked:
- Booking success rate
- Processing time
- Provider response times
- Error rates
- User engagement

## Security Considerations

### Authentication
- JWT token-based authentication
- Token expiration and refresh
- Role-based access control

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting

### Payment Security
- Secure payment processing
- PCI compliance
- Fraud detection
- Secure refund handling

## Performance Optimization

### Caching
- Redis caching for booking status
- Provider response caching
- User session caching

### Database Optimization
- Indexed queries
- Connection pooling
- Query optimization

### Background Processing
- Asynchronous booking processing
- Queue-based job processing
- Parallel component processing

## Deployment

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=concert_travel
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret

# External APIs
SKYSCANNER_API_KEY=your_skyscanner_key
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Run migrations
docker-compose exec backend npm run migrate

# Run tests
docker-compose exec backend npm test
```

## Troubleshooting

### Common Issues

1. **Booking Status Stuck**: Check background job processing
2. **Provider Timeouts**: Verify external API connectivity
3. **Database Errors**: Check connection pool and indexes
4. **Redis Issues**: Verify Redis connectivity and memory

### Debug Commands

```bash
# Check service health
curl http://localhost:5001/api/booking/health

# Check booking status
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/booking/status/$BOOKING_ID

# View logs
docker-compose logs -f backend
```

## Future Enhancements

### Planned Features

1. **Real-time Notifications**: WebSocket-based status updates
2. **Advanced Analytics**: Machine learning for booking optimization
3. **Multi-currency Support**: International booking support
4. **Group Bookings**: Support for multiple travelers
5. **Loyalty Program**: Points and rewards system
6. **Mobile App**: Native mobile booking experience

### Integration Opportunities

1. **Payment Processors**: Stripe, PayPal integration
2. **Insurance Providers**: Travel insurance integration
3. **Weather Services**: Weather-based booking recommendations
4. **Social Features**: Share bookings and reviews
5. **AI Recommendations**: Personalized booking suggestions 