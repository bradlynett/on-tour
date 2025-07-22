# Concert Travel App API Documentation

## Overview
This document describes the enhanced travel API endpoints for the Concert Travel App, including Amadeus integration, multi-city flights, travel packages, and comprehensive error handling.

## Base URL
```
http://localhost:5001/api
```

## Authentication
All endpoints require JWT authentication via Bearer token:
```
Authorization: Bearer <your-jwt-token>
```

## Enhanced Travel Endpoints

### 1. Flight Search
**GET** `/travel/flights`

Search for flights between airports with enhanced error handling and performance monitoring.

**Query Parameters:**
- `origin` (required): 3-letter airport code (e.g., "LAX")
- `destination` (required): 3-letter airport code (e.g., "JFK")
- `departureDate` (required): Date in YYYY-MM-DD format
- `returnDate` (optional): Date in YYYY-MM-DD format
- `passengers` (optional): Number of passengers (1-9, default: 1)
- `maxResults` (optional): Maximum results to return (1-50, default: 10)
- `provider` (optional): Specific provider ("amadeus", "skyscanner", or "all")

**Example Request:**
```bash
curl -X GET "http://localhost:5001/api/travel/flights?origin=LAX&destination=JFK&departureDate=2024-12-25&passengers=1" \
  -H "Authorization: Bearer <your-token>"
```

**Success Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "flight-1",
      "price": { "total": "150.00", "currency": "USD" },
      "itineraries": [...],
      "airlines": ["AA"],
      "duration": "5h 30m"
    }
  ],
  "providers": [
    { "name": "amadeus", "status": "success", "count": 5 }
  ],
  "meta": {
    "origin": "LAX",
    "destination": "JFK",
    "count": 5,
    "providerCount": 1,
    "responseTime": 1250
  }
}
```

### 2. Multi-City Flight Search
**GET** `/travel/flights/multi-city`

Search for complex multi-city flight itineraries.

**Query Parameters:**
- `segments` (required): JSON string of flight segments
- `passengers` (optional): Number of passengers (1-9, default: 1)
- `maxResults` (optional): Maximum results to return (1-50, default: 10)

**Segments Format:**
```json
[
  { "origin": "LAX", "destination": "JFK", "date": "2024-12-25" },
  { "origin": "JFK", "destination": "LAX", "date": "2024-12-28" }
]
```

**Example Request:**
```bash
curl -X GET "http://localhost:5001/api/travel/flights/multi-city?segments=[%7B%22origin%22:%22LAX%22,%22destination%22:%22JFK%22,%22date%22:%222024-12-25%22%7D,%7B%22origin%22:%22JFK%22,%22destination%22:%22LAX%22,%22date%22:%222024-12-28%22%7D]&passengers=1" \
  -H "Authorization: Bearer <your-token>"
```

### 3. Hotel Search
**GET** `/travel/hotels`

Search for hotels in a specific city with enhanced error handling.

**Query Parameters:**
- `cityCode` (required): 3-letter city code (e.g., "NYC")
- `checkInDate` (required): Date in YYYY-MM-DD format
- `checkOutDate` (required): Date in YYYY-MM-DD format
- `adults` (optional): Number of adults (1-9, default: 1)
- `radius` (optional): Search radius in km (1-50, default: 5)
- `maxResults` (optional): Maximum results to return (1-50, default: 20)

### 4. Travel Packages
**GET** `/travel/packages`

Search for complete travel packages (flight + hotel + car).

**Query Parameters:**
- `origin` (required): 3-letter airport code
- `destination` (required): 3-letter airport code
- `departureDate` (required): Date in YYYY-MM-DD format
- `returnDate` (optional): Date in YYYY-MM-DD format
- `passengers` (optional): Number of passengers (1-9, default: 1)
- `includeHotel` (optional): Include hotel in package ("true"/"false", default: "true")
- `includeCar` (optional): Include car rental in package ("true"/"false", default: "false")
- `maxResults` (optional): Maximum results to return (1-20, default: 10)

### 5. Airport Search
**GET** `/travel/airports`

Search for airports and cities by keyword.

**Query Parameters:**
- `keyword` (required): Search term (2-50 characters)

### 6. Car Rental Search
**GET** `/travel/cars`

Search for car rentals at specific locations.

**Query Parameters:**
- `pickUpLocation` (required): Airport or city code
- `dropOffLocation` (required): Airport or city code
- `pickUpDate` (required): Date and time in ISO format
- `dropOffDate` (required): Date and time in ISO format
- `maxResults` (optional): Maximum results to return (1-50, default: 10)

### 7. Provider Status
**GET** `/travel/providers`

Get status of all travel providers.

**Example Response:**
```json
{
  "success": true,
  "data": {
    "amadeus": {
      "name": "Amadeus",
      "available": true,
      "health": "healthy",
      "lastCheck": "2024-12-25T10:00:00Z"
    }
  }
}
```

### 8. Health Check
**GET** `/travel/health`

Check the health status of the travel service.

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "message": "User-friendly error message",
    "shouldRetry": false
  },
  "timestamp": "2024-12-25T10:00:00Z"
}
```

### Common Error Types:
- `VALIDATION_ERROR`: Invalid request parameters
- `INVALID DATE`: Date is in the past or invalid
- `INVALID LOCATION`: Airport/city code not recognized
- `NO FLIGHTS FOUND`: No flights available for route/date
- `NO HOTELS FOUND`: No hotels available for location/date
- `RATE LIMIT EXCEEDED`: Too many requests (retry after delay)
- `AUTHENTICATION FAILED`: Invalid or expired token
- `SERVICE UNAVAILABLE`: Travel service temporarily unavailable
- `NETWORK_ERROR`: Connection issues
- `UNKNOWN_ERROR`: Unexpected error

## Performance Monitoring

All endpoints include performance metrics:
- `responseTime`: API response time in milliseconds
- `providerCount`: Number of providers queried
- `count`: Number of results returned

## Rate Limiting

- **Standard endpoints**: 100 requests per minute per user
- **Search endpoints**: 50 requests per minute per user
- **Health/status endpoints**: 200 requests per minute per user

## Caching

- **Flight search results**: Cached for 15 minutes
- **Hotel search results**: Cached for 30 minutes
- **Airport search results**: Cached for 1 hour
- **Provider status**: Cached for 5 minutes

## Testing

### Test Scripts
```bash
# Test enhanced endpoints
node scripts/test-enhanced-endpoints.js

# Test Amadeus integration
node scripts/test-amadeus-keys.js

# Run unit tests
npm test
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 http://localhost:5001/api/travel/flights?origin=LAX&destination=JFK&departureDate=2024-12-25&passengers=1
```

## Environment Variables

Required environment variables:
```env
# Amadeus API
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret

# JWT Authentication
JWT_SECRET=your_jwt_secret

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/concert_travel

# Redis (for caching)
REDIS_URL=redis://localhost:6379
```

## Support

For API support or questions:
- Check the error response for specific error details
- Review the logs for technical details
- Contact the development team with error types and timestamps 

# API Documentation

## User Interests - Drag and Drop Priority Management

### Update Single Interest Priority
Updates the priority of a single user interest.

**Endpoint:** `PUT /api/users/interests/:id`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "priority": 3
}
```

**Parameters:**
- `id` (path parameter): Interest ID (integer, > 0)
- `priority` (body): New priority value (integer, 1-1000)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Interest priority updated successfully",
  "data": {
    "id": 123,
    "priority": 3,
    "updatedAt": "2024-01-15T10:30:00Z",
    "previousPriority": 5
  }
}
```

**Error Responses:**

**400 - Invalid Input:**
```json
{
  "success": false,
  "message": "Priority must be a number between 1 and 1000",
  "error": "PRIORITY_INVALID"
}
```

**404 - Interest Not Found:**
```json
{
  "success": false,
  "message": "Interest not found or does not belong to user",
  "error": "INTEREST_NOT_FOUND"
}
```

**409 - Priority Conflict:**
```json
{
  "success": false,
  "message": "Priority conflict - another interest already has this priority",
  "error": "PRIORITY_CONFLICT"
}
```

### Bulk Update Interest Priorities
Updates multiple interest priorities in a single request (optimized for drag-and-drop operations).

**Endpoint:** `PUT /api/users/interests/bulk-priority`

**Authentication:** Required (Bearer Token)

**Request Body:**
```json
{
  "updates": [
    { "id": 123, "priority": 1 },
    { "id": 124, "priority": 2 },
    { "id": 125, "priority": 3 }
  ]
}
```

**Parameters:**
- `updates` (array): Array of update objects
  - `id` (integer): Interest ID (> 0)
  - `priority` (integer): New priority value (1-1000)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully updated 3 interest priorities",
  "data": {
    "updatedCount": 3,
    "updates": [
      {
        "id": 123,
        "priority": 1,
        "updatedAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": 124,
        "priority": 2,
        "updatedAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": 125,
        "priority": 3,
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

**Error Responses:**

**400 - Invalid Request Format:**
```json
{
  "success": false,
  "message": "Updates array is required and must not be empty",
  "error": "INVALID_REQUEST_FORMAT"
}
```

**400 - Duplicate Priorities:**
```json
{
  "success": false,
  "message": "Duplicate priorities are not allowed",
  "error": "DUPLICATE_PRIORITIES"
}
```

**404 - Interests Not Found:**
```json
{
  "success": false,
  "message": "One or more interests not found or do not belong to user",
  "error": "INTERESTS_NOT_FOUND"
}
```

## Error Codes Reference

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `INTEREST_ID_INVALID` | Interest ID is not a valid positive integer | 400 |
| `PRIORITY_INVALID` | Priority value is outside valid range (1-1000) | 400 |
| `INVALID_REQUEST_FORMAT` | Request body format is invalid | 400 |
| `INVALID_UPDATE_DATA` | Update data contains invalid values | 400 |
| `DUPLICATE_PRIORITIES` | Multiple interests assigned same priority | 400 |
| `INTEREST_NOT_FOUND` | Interest does not exist or doesn't belong to user | 404 |
| `INTERESTS_NOT_FOUND` | One or more interests not found | 404 |
| `PRIORITY_CONFLICT` | Priority conflicts with existing interests | 409 |
| `UPDATE_FAILED` | Database update operation failed | 500 |
| `FOREIGN_KEY_VIOLATION` | Invalid reference to non-existent data | 400 |

## Usage Examples

### Frontend Implementation Example

```javascript
// Single interest update
const updateSinglePriority = async (interestId, newPriority) => {
  try {
    const response = await fetch(`/api/users/interests/${interestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ priority: newPriority })
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return result.data;
  } catch (error) {
    console.error('Failed to update priority:', error);
    throw error;
  }
};

// Bulk update for drag-and-drop
const updateBulkPriorities = async (updates) => {
  try {
    const response = await fetch('/api/users/interests/bulk-priority', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ updates })
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }
    
    return result.data;
  } catch (error) {
    console.error('Failed to update priorities:', error);
    throw error;
  }
};

// Example usage in drag-and-drop handler
const handleDragEnd = async (reorderedInterests) => {
  const updates = reorderedInterests.map((interest, index) => ({
    id: interest.id,
    priority: index + 1
  }));
  
  try {
    await updateBulkPriorities(updates);
    console.log('Priorities updated successfully');
  } catch (error) {
    console.error('Failed to update priorities:', error);
    // Handle error (show user notification, revert UI, etc.)
  }
};
```

## Best Practices

1. **Use Bulk Updates for Drag-and-Drop**: When reordering multiple interests, use the bulk endpoint for better performance
2. **Validate on Frontend**: Always validate priority values before sending to API
3. **Handle Errors Gracefully**: Implement proper error handling and user feedback
4. **Optimistic Updates**: Update UI immediately, then sync with backend
5. **Transaction Safety**: All updates are wrapped in database transactions for data consistency
6. **Rate Limiting**: Be aware of API rate limits when making multiple requests 

### Events Table (New Columns)
- `seatgeek_event_id` (VARCHAR): SeatGeek unique event identifier for direct event/ticket lookup.
- `ticketmaster_event_id` (VARCHAR): Ticketmaster unique event identifier for direct event/ticket lookup. 

## Security & Account Management

### Two-Factor Authentication (2FA)

#### Enable 2FA
**POST** `/api/2fa/setup`
- Authenticated. Returns TOTP secret and QR code for setup.

#### Verify 2FA
**POST** `/api/2fa/verify`
- Authenticated. Body: `{ token, secret }`. Enables 2FA and returns backup codes.

#### Disable 2FA
**POST** `/api/2fa/disable`
- Authenticated. Body: `{ token }` (TOTP or backup code).

#### Get Backup Codes
**GET** `/api/2fa/backup-codes`
- Authenticated. Returns masked backup codes.

#### Regenerate Backup Codes
**POST** `/api/2fa/backup-codes/regenerate`
- Authenticated. Returns new backup codes.

#### Use Backup Code
**POST** `/api/2fa/use-backup-code`
- Authenticated. Body: `{ code, action }` (action: 'login' or 'disable').

#### Login with 2FA
**POST** `/api/auth/login`
- If 2FA is enabled, include `totp` or `backupCode` in body. If required, response includes `twoFactorRequired: true`.

---

### Password Management

#### Forgot Password
**POST** `/api/auth/forgot-password`
- Body: `{ email }`. Sends reset link if user exists.

#### Reset Password
**POST** `/api/auth/reset-password`
- Body: `{ token, newPassword }`. Sets new password if token valid.

#### Change Password
**POST** `/api/auth/change-password`
- Authenticated. Body: `{ oldPassword, newPassword }`.

---

### Session/Token Invalidation
- On password change/reset, all existing sessions/tokens are invalidated.
- JWTs include `password_changed_at` timestamp; if DB value is newer, token is rejected.

---

### Example: 2FA Login
```json
{
  "email": "user@example.com",
  "password": "...",
  "totp": "123456"
}
```
If 2FA required and not provided:
```json
{
  "success": false,
  "message": "2FA required",
  "twoFactorRequired": true
}
```

### Example: Forgot Password
```json
{
  "email": "user@example.com"
}
```

### Example: Reset Password
```json
{
  "token": "reset-token",
  "newPassword": "NewPassword123"
}
```

---

## Security Notes
- All sensitive fields (TOTP secrets, backup codes) are encrypted at rest.
- Passwords must be strong (min 8 chars, upper/lower/number).
- 2FA and password reset flows are rate-limited for security. 

# API Documentation

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "streetAddress": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please complete your profile setup.",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "streetAddress": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA",
      "createdAt": "2025-07-22T04:57:15.106Z",
      "needsOnboarding": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (No 2FA):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "twoFactorEnabled": false,
      "needsOnboarding": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (2FA Required):**
```json
{
  "success": false,
  "message": "2FA required",
  "twoFactorRequired": true
}
```

### POST /api/auth/login (with 2FA)
Complete login with 2FA code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "totp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "twoFactorEnabled": true,
      "needsOnboarding": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /api/auth/check-email
Check if an email exists in the system.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "exists": true
}
```

### POST /api/auth/forgot-password
Request a password reset link.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If your email is registered, a reset link has been sent."
}
```

### POST /api/auth/reset-password
Reset password using a reset token.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### POST /api/auth/change-password
Change password for authenticated user.

**Request Body:**
```json
{
  "oldPassword": "CurrentPassword123",
  "newPassword": "NewSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## User Endpoints

### GET /api/users/me
Get current user information including 2FA status.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "streetAddress": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA",
      "createdAt": "2025-07-22T04:57:15.106Z",
      "is2faEnabled": false,
      "needsOnboarding": false
    }
  }
}
```

### PUT /api/users/onboarding-complete
Mark user's onboarding as complete.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "data": {
    "user": {
      "needsOnboarding": false
    }
  }
}
```

## Two-Factor Authentication (2FA) Endpoints

### POST /api/2fa/setup
Generate TOTP secret and QR code for 2FA setup.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### POST /api/2fa/verify
Verify TOTP code and enable 2FA.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "token": "123456",
  "secret": "JBSWY3DPEHPK3PXP"
}
```

**Response:**
```json
{
  "success": true,
  "backupCodes": ["ABCD1234", "EFGH5678", "IJKL9012", "MNOP3456", "QRST7890", "UVWX1234", "YZAB5678", "CDEF9012"]
}
```

### GET /api/2fa/backup-codes
Get masked backup codes.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "backupCodes": ["XXXX-1234", "XXXX-5678", "XXXX-9012", "XXXX-3456", "XXXX-7890", "XXXX-1234", "XXXX-5678", "XXXX-9012"]
}
```

### POST /api/2fa/backup-codes/regenerate
Regenerate backup codes.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "backupCodes": ["WXYZ1234", "ABCD5678", "EFGH9012", "IJKL3456", "MNOP7890", "QRST1234", "UVWX5678", "YZAB9012"]
}
```

### POST /api/2fa/disable
Disable 2FA using TOTP token or backup code.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

### POST /api/2fa/use-backup-code
Use a backup code for 2FA (login or disable).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "code": "ABCD1234",
  "action": "login"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backup code accepted"
}
```

## Session/Token Invalidation

The system automatically invalidates user sessions when:
- User changes their password
- User resets their password
- Token expires (7 days for access tokens)

When a session is invalidated, the user will receive a 401 response with the message "Session invalidated. Please log in again."

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created (registration)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `404` - Not Found
- `500` - Internal Server Error 