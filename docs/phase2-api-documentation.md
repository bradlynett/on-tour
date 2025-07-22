# Phase 2 API Documentation - Core Booking & Payment Flow

## Overview

Phase 2 implements the core booking and payment functionality for the Concert Travel App, including trip customization, bundling, and Stripe payment processing.

## Base URL
```
http://localhost:5001/api
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Trip Customization & Booking

### 1. Generate Trip Customization Options

**Endpoint:** `POST /booking/customize/:eventId`

**Description:** Generates customizable trip options for an event including flights, hotels, cars, and tickets with different tiers and bundle options.

**Request Body:**
```json
{
  "dateFlexibility": 2,
  "preferences": {
    "flightClass": "economy",
    "hotelTier": "standard",
    "includeCar": true,
    "budget": 1000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": 1,
      "name": "Taylor Swift Concert",
      "artist": "Taylor Swift",
      "venue_city": "Los Angeles",
      "event_date": "2024-08-15T20:00:00Z"
    },
    "dateOptions": [
      {
        "date": "2024-08-13",
        "dayOfWeek": "Tuesday",
        "isEventDate": false,
        "daysFromEvent": -2
      }
    ],
    "flightOptions": {
      "economy": [...],
      "premiumEconomy": [...],
      "business": [...],
      "firstClass": [...]
    },
    "hotelOptions": {
      "budget": [...],
      "standard": [...],
      "premium": [...],
      "luxury": [...]
    },
    "carOptions": {
      "economy": [...],
      "standard": [...],
      "premium": [...],
      "luxury": [...]
    },
    "ticketOptions": {
      "general": [...],
      "premium": [...],
      "vip": [...]
    },
    "bundles": [
      {
        "id": "bundle_best_match",
        "name": "Best Match",
        "description": "Curated selection based on your preferences",
        "components": {...},
        "totalPrice": 850,
        "savings": 50,
        "features": ["Personalized Selection", "Good Value"]
      }
    ]
  }
}
```

### 2. Create Booking

**Endpoint:** `POST /booking/create`

**Description:** Creates a booking from selected trip components.

**Request Body:**
```json
{
  "eventId": 1,
  "selectedComponents": {
    "flight": {...},
    "hotel": {...},
    "car": {...},
    "ticket": {...}
  },
  "preferences": {
    "startDate": "2024-08-13",
    "endDate": "2024-08-16"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tripPlanId": 123,
    "totalCost": 850,
    "serviceFee": 42.50,
    "grandTotal": 892.50,
    "components": {...},
    "status": "planning"
  }
}
```

### 3. Get Booking Details

**Endpoint:** `GET /booking/:bookingId`

**Description:** Retrieves detailed information about a specific booking.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "Trip to Taylor Swift Concert",
    "status": "planning",
    "total_cost": 850,
    "service_fee": 42.50,
    "event_name": "Taylor Swift Concert",
    "artist": "Taylor Swift",
    "venue_city": "Los Angeles",
    "components": [
      {
        "type": "flight",
        "provider": "amadeus",
        "price": 350,
        "status": "pending"
      }
    ]
  }
}
```

### 4. Get User Bookings

**Endpoint:** `GET /booking?status=planning&page=1&limit=10`

**Description:** Retrieves paginated list of user's bookings with optional status filtering.

**Query Parameters:**
- `status` (optional): Filter by status (planning, booked, completed, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 5. Update Booking Status

**Endpoint:** `PATCH /booking/:bookingId/status`

**Description:** Updates the status of a booking.

**Request Body:**
```json
{
  "status": "booked"
}
```

**Valid Status Values:** planning, booked, completed, cancelled

### 6. Get Booking Statistics

**Endpoint:** `GET /booking/stats/overview`

**Description:** Retrieves booking statistics and analytics for the user.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_bookings": 15,
      "planning_bookings": 3,
      "booked_bookings": 10,
      "completed_bookings": 2,
      "avg_total_cost": 750.50,
      "total_spent": 11257.50
    },
    "recentBookings": [...],
    "topEvents": [...]
  }
}
```

---

## Payment Processing

### 1. Create Payment Intent

**Endpoint:** `POST /payment/create-intent`

**Description:** Creates a Stripe payment intent for a booking.

**Request Body:**
```json
{
  "bookingId": 123,
  "amount": 892.50,
  "currency": "usd"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx",
    "amount": 892.50,
    "serviceFee": 42.50,
    "currency": "usd"
  }
}
```

### 2. Confirm Payment

**Endpoint:** `POST /payment/confirm`

**Description:** Confirms a payment and updates booking status.

**Request Body:**
```json
{
  "paymentIntentId": "pi_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "bookingId": 123,
    "paymentIntentId": "pi_xxx",
    "amount": 892.50,
    "status": "confirmed"
  }
}
```

### 3. Process Refund

**Endpoint:** `POST /payment/refund`

**Description:** Processes a refund for a booking.

**Request Body:**
```json
{
  "bookingId": 123,
  "refundAmount": 892.50,
  "reason": "Customer request"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "refundId": "re_xxx",
    "amount": 892.50,
    "status": "refunded"
  }
}
```

### 4. Get Payment Methods

**Endpoint:** `GET /payment/payment-methods`

**Description:** Retrieves user's saved payment methods.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pm_xxx",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "expMonth": 12,
        "expYear": 2025
      }
    }
  ]
}
```

### 5. Save Payment Method

**Endpoint:** `POST /payment/payment-methods`

**Description:** Saves a payment method for the user.

**Request Body:**
```json
{
  "paymentMethodId": "pm_xxx"
}
```

### 6. Get Payment History

**Endpoint:** `GET /payment/history?page=1&limit=10`

**Description:** Retrieves user's payment history.

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

## Enhanced Travel Search

### 1. Multi-City Flight Search

**Endpoint:** `GET /travel/flights/multi-city?segments=[{"origin":"SEA","destination":"LAX","date":"2024-08-13"},{"origin":"LAX","destination":"SEA","date":"2024-08-16"}]&passengers=1&maxResults=10`

**Description:** Searches for multi-city flight itineraries.

**Query Parameters:**
- `segments`: JSON array of flight segments
- `passengers`: Number of passengers (1-9)
- `maxResults`: Maximum results to return (1-50)

### 2. Travel Package Search

**Endpoint:** `GET /travel/packages?origin=SEA&destination=LAX&departureDate=2024-08-13&returnDate=2024-08-16&passengers=1&includeHotel=true&includeCar=false&maxResults=10`

**Description:** Searches for complete travel packages including flights, hotels, and cars.

**Query Parameters:**
- `origin`: Origin airport code
- `destination`: Destination airport code
- `departureDate`: Departure date (YYYY-MM-DD)
- `returnDate`: Return date (YYYY-MM-DD, optional)
- `passengers`: Number of passengers (1-9)
- `includeHotel`: Include hotel search (true/false)
- `includeCar`: Include car rental search (true/false)
- `maxResults`: Maximum results to return (1-20)

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": ["Booking ID is required"]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123"
  }
}
```

**Error Types:**
- `VALIDATION_ERROR`: Invalid input parameters
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `PAYMENT_ERROR`: Payment processing error
- `INTERNAL_ERROR`: Server error

---

## Rate Limiting

All endpoints are rate limited:
- **General API**: 100 requests per 15 minutes per IP
- **Payment endpoints**: 50 requests per 15 minutes per user
- **Search endpoints**: 200 requests per 15 minutes per user

---

## Webhooks

### Stripe Webhook

**Endpoint:** `POST /payment/webhook`

**Description:** Handles Stripe webhook events for payment status updates.

**Supported Events:**
- `payment_intent.succeeded`: Payment completed successfully
- `payment_intent.payment_failed`: Payment failed
- `charge.refunded`: Refund processed

**Headers Required:**
- `stripe-signature`: Stripe webhook signature for verification

---

## Environment Variables

Required environment variables for Phase 2:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Amadeus Configuration
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/concert_travel

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

---

## Testing

### Test Trip Customization
```bash
curl -X POST http://localhost:5001/api/booking/customize/1 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"dateFlexibility": 2, "preferences": {"flightClass": "economy"}}'
```

### Test Payment Intent Creation
```bash
curl -X POST http://localhost:5001/api/payment/create-intent \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"bookingId": 123, "amount": 892.50}'
```

---

## Next Steps

Phase 2 is now complete with:
- ✅ Trip customization and bundling
- ✅ Booking management
- ✅ Stripe payment processing
- ✅ Multi-city flight support
- ✅ Travel package search
- ✅ Comprehensive error handling
- ✅ Webhook integration

**Phase 3** will focus on:
- Group trip and social features
- Enhanced trip suggestion engine for tours
- Natural language UI
- Advanced event type support 