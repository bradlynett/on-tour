# Data Enrichment & Integration Enhancement Plan

## Overview
This document outlines the comprehensive plan to enhance data richness and integrations for the Concert Travel App, ensuring users have access to all the detailed information they expect when booking travel.

## Current State Analysis

### ✅ What We Have
- Basic event data (name, artist, venue, date, price ranges)
- Simple flight details (departure/arrival, basic pricing)
- Basic hotel information (name, room type, amenities)
- Ticket information (section, row, seat)
- Booking system with component tracking

### ❌ What We're Missing
- **Detailed flight information**: Aircraft types, seat maps, meal options, baggage details
- **Comprehensive hotel data**: Room configurations, bed types, occupancy limits, detailed amenities
- **Rich ticket details**: Exact seat locations, view descriptions, accessibility info
- **Real-time pricing**: Dynamic pricing updates, availability tracking
- **Multiple data sources**: Limited to Amadeus, need more providers

## Phase 1: Data Structure Enhancement

### 1.1 Enhanced Event Data Schema
```sql
-- Enhanced events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS (
    event_time TIME,
    doors_open TIME,
    venue_capacity INTEGER,
    venue_seating_chart TEXT,
    accessibility_features JSONB,
    parking_info JSONB,
    public_transport JSONB,
    venue_photos JSONB,
    event_duration INTERVAL,
    age_restrictions VARCHAR(100),
    dress_code VARCHAR(200),
    prohibited_items TEXT[],
    covid_policies JSONB
);
```

### 1.2 Enhanced Flight Data Schema
```sql
-- Enhanced flight details in trip_components.details
{
    "flightNumber": "AA1234",
    "aircraft": {
        "type": "Boeing 737-800",
        "registration": "N12345",
        "manufacturer": "Boeing",
        "capacity": 189,
        "seatMap": "https://seatmap.example.com/737-800"
    },
    "departure": {
        "airport": "JFK",
        "terminal": "8",
        "gate": "A12",
        "time": "2024-06-15T10:00:00Z",
        "timezone": "America/New_York"
    },
    "arrival": {
        "airport": "LAX",
        "terminal": "4",
        "gate": "B8",
        "time": "2024-06-15T13:30:00Z",
        "timezone": "America/Los_Angeles"
    },
    "seats": {
        "assigned": "12A",
        "class": "Economy",
        "row": 12,
        "seat": "A",
        "window": true,
        "aisle": false,
        "exit_row": false,
        "premium": false
    },
    "baggage": {
        "checked": 1,
        "carry_on": 1,
        "personal_item": 1,
        "weight_limit": "50 lbs",
        "oversized_fees": "$150"
    },
    "amenities": {
        "wifi": true,
        "power_outlets": true,
        "entertainment": "seatback_screen",
        "meals": "snack_service",
        "alcohol": false
    },
    "cancellation": {
        "refundable": false,
        "change_fee": "$200",
        "cancellation_fee": "$200"
    }
}
```

### 1.3 Enhanced Hotel Data Schema
```sql
-- Enhanced hotel details in trip_components.details
{
    "hotelName": "Marriott Downtown",
    "chain": "Marriott International",
    "brand": "Marriott Hotels",
    "rating": 4.5,
    "stars": 4,
    "location": {
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zip": "10001",
        "country": "USA",
        "latitude": 40.7589,
        "longitude": -73.9851,
        "timezone": "America/New_York"
    },
    "room": {
        "type": "King Room",
        "category": "Standard",
        "size": "350 sq ft",
        "floor": "12",
        "roomNumber": "1205",
        "view": "City View",
        "bedding": {
            "primary": "1 King Bed",
            "capacity": 2,
            "maxOccupancy": 2,
            "extraBeds": false,
            "cribAvailable": true
        },
        "bathroom": {
            "type": "Private",
            "shower": true,
            "bathtub": true,
            "amenities": ["Hair dryer", "Toiletries", "Towels"]
        }
    },
    "amenities": {
        "room": ["Free WiFi", "Mini fridge", "Coffee maker", "Iron", "Safe"],
        "hotel": ["Pool", "Gym", "Restaurant", "Bar", "Spa", "Business center"],
        "accessibility": ["Wheelchair accessible", "Roll-in shower", "Grab bars"]
    },
    "policies": {
        "checkIn": "3:00 PM",
        "checkOut": "11:00 AM",
        "earlyCheckIn": "Available for $50",
        "lateCheckOut": "Available for $50",
        "cancellation": "Free until 6 PM day of arrival",
        "pets": "Not allowed",
        "smoking": "Non-smoking only"
    },
    "photos": [
        {
            "url": "https://example.com/room1.jpg",
            "caption": "King Room",
            "category": "room"
        }
    ]
}
```

### 1.4 Enhanced Ticket Data Schema
```sql
-- Enhanced ticket details in trip_components.details
{
    "ticketType": "VIP Package",
    "section": "100",
    "row": "A",
    "seat": "15",
    "price": {
        "faceValue": 150.00,
        "serviceFees": 25.00,
        "total": 175.00,
        "currency": "USD"
    },
    "location": {
        "venue": "Madison Square Garden",
        "section": "100",
        "row": "A",
        "seat": "15",
        "view": "Premium floor seating",
        "distance": "20 feet from stage",
        "angle": "Center stage",
        "obstructed": false
    },
    "package": {
        "includes": [
            "Premium floor seating",
            "Early entry (30 minutes)",
            "Exclusive merchandise",
            "Meet & greet opportunity",
            "Commemorative laminate"
        ],
        "exclusions": [
            "Food and beverages",
            "Parking",
            "Transportation"
        ]
    },
    "delivery": {
        "method": "Mobile Entry",
        "available": "2 hours before event",
        "instructions": "Present QR code at venue entrance"
    },
    "restrictions": {
        "transferable": true,
        "transferDeadline": "24 hours before event",
        "refundable": false,
        "ageRestriction": "All ages",
        "photoId": "Required for VIP package"
    }
}
```

## Phase 2: Data Provider Integrations

### 2.1 Flight Data Providers
**Priority 1: Real-time Flight Data**
- **Amadeus API** (already integrated) - Enhance with more details
- **Sabre API** - Alternative GDS for better coverage
- **Skyscanner API** - Price comparison and booking
- **Google Flights API** - Comprehensive search
- **FlightAware API** - Real-time flight tracking

**Priority 2: Seat and Aircraft Data**
- **SeatGuru API** - Detailed seat maps and reviews
- **Aircraft Database APIs** - Aircraft specifications
- **Airline-specific APIs** - Direct airline data

### 2.2 Hotel Data Providers
**Priority 1: Comprehensive Hotel Data**
- **Amadeus Hotels API** (already integrated) - Enhance details
- **Booking.com API** - Extensive hotel inventory
- **Hotels.com API** - Alternative pricing
- **Expedia API** - Package deals
- **Marriott/Hilton APIs** - Direct chain data

**Priority 2: Hotel Details**
- **TripAdvisor API** - Reviews and photos
- **Google Places API** - Location and photos
- **Hotel-specific APIs** - Direct hotel data

### 2.3 Ticket Data Providers
**Priority 1: Ticket Inventory**
- **Ticketmaster API** (already integrated) - Enhance with details
- **Eventbrite API** (already integrated) - Enhance with details
- **StubHub API** - Secondary market
- **Vivid Seats API** - Alternative secondary market
- **SeatGeek API** - Comprehensive ticket search

**Priority 2: Venue and Seating Data**
- **Venue-specific APIs** - Direct venue data
- **Seat mapping services** - Interactive seat maps
- **Accessibility databases** - ADA compliance info

### 2.4 Additional Data Sources
- **Weather APIs** - Event day weather forecasts
- **Transportation APIs** - Public transit, rideshare
- **Restaurant APIs** - Nearby dining options
- **Parking APIs** - Venue parking information

## Phase 3: Real-time Data Enhancement

### 3.1 Dynamic Pricing
```javascript
// Real-time price tracking
class PriceTracker {
    async trackPrices(componentId) {
        // Monitor price changes
        // Send notifications for significant changes
        // Update booking recommendations
    }
    
    async getPriceHistory(componentId) {
        // Historical price data
        // Price prediction algorithms
        // Best time to book recommendations
    }
}
```

### 3.2 Availability Monitoring
```javascript
// Real-time availability tracking
class AvailabilityMonitor {
    async checkAvailability(componentId) {
        // Real-time inventory checks
        // Low availability alerts
        // Alternative recommendations
    }
    
    async getWaitlistStatus(eventId) {
        // Waitlist management
        // Notification when tickets become available
    }
}
```

### 3.3 Dynamic Content Updates
```javascript
// Real-time content updates
class ContentUpdater {
    async updateEventDetails(eventId) {
        // Real-time event updates
        // Schedule changes
        // Venue updates
    }
    
    async updateFlightStatus(flightId) {
        // Real-time flight status
        // Delay notifications
        // Gate changes
    }
}
```

## Phase 4: User Experience Enhancements

### 4.1 Detailed Component Views
- **Interactive seat maps** for flights and events
- **360° hotel room views**
- **Venue seating charts** with view previews
- **Real-time pricing graphs**
- **Availability heat maps**

### 4.2 Smart Recommendations
- **Price drop alerts**
- **Better seat recommendations** based on preferences
- **Hotel room suggestions** based on group size
- **Alternative flight options** when prices change

### 4.3 Enhanced Booking Flow
- **Detailed component comparison** with side-by-side views
- **Real-time availability** during booking
- **Dynamic pricing** updates during checkout
- **Comprehensive confirmation** with all details

## Phase 5: Implementation Timeline

### Week 1-2: Data Schema Updates
- [ ] Update database schemas for enhanced data
- [ ] Create migration scripts
- [ ] Update TypeScript interfaces
- [ ] Test data structure changes

### Week 3-4: Provider Integration
- [ ] Enhance Amadeus integration with detailed data
- [ ] Integrate additional flight providers
- [ ] Integrate additional hotel providers
- [ ] Integrate additional ticket providers

### Week 5-6: Real-time Features
- [ ] Implement price tracking
- [ ] Implement availability monitoring
- [ ] Implement dynamic content updates
- [ ] Set up notification systems

### Week 7-8: UI/UX Enhancements
- [ ] Create detailed component views
- [ ] Implement interactive features
- [ ] Update booking flow with rich data
- [ ] Add comparison tools

### Week 9-10: Testing & Optimization
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] User acceptance testing
- [ ] Documentation updates

## Success Metrics

### Data Quality
- **Flight details**: 95%+ complete with aircraft, seat, and amenity info
- **Hotel details**: 90%+ complete with room configurations and photos
- **Ticket details**: 95%+ complete with exact seating and package info

### User Experience
- **Booking completion rate**: Target 85%+ (up from current ~70%)
- **User satisfaction**: Target 4.5/5 stars
- **Time to book**: Target <5 minutes for complete trips

### Technical Performance
- **API response time**: <500ms for search results
- **Data freshness**: <5 minutes for pricing updates
- **Uptime**: 99.9% availability

## Risk Mitigation

### Data Provider Dependencies
- **Multiple providers** for each component type
- **Fallback mechanisms** when primary providers fail
- **Caching strategies** to reduce API calls
- **Rate limiting** to stay within provider limits

### Data Quality Assurance
- **Validation rules** for all incoming data
- **Data cleaning** processes
- **Quality monitoring** and alerting
- **User feedback** loops for data accuracy

### Performance Considerations
- **CDN caching** for static content
- **Database optimization** for large datasets
- **Background processing** for real-time updates
- **Scalable architecture** for growth

## Airport and Metro Area Mapping (Authoritative Source)

All airport and metro area mapping for flight data enrichment is performed using the `airports` and `metro_areas` tables in the database. All travel provider integrations, including Amadeus, must use this mapping for enriching flight data before returning results to the frontend. This ensures:
- Consistent airport/city/metro naming across all services
- Accurate mapping for multi-airport metro areas (e.g., NYC = JFK, LGA, EWR)
- No reliance on static or external mappings for airport/city/metro lookups

### Enrichment Pipeline
- For each flight segment (departure/arrival), the backend queries the `airports` table by IATA code to get the full airport name, city, state/country, and (if needed) latitude/longitude.
- If a metro area mapping is needed, the backend uses the `metro_areas` table or the same logic as `getNearestAirport` in `tripSuggestionEngine.js`.
- The backend attaches these enriched fields to each segment: `airport_code`, `airport_name`, `city`, `state`, `country`, `metro_area` (if applicable).
- Airline codes are mapped to names using the airlines table or a static mapping.
- All times are formatted as ISO strings and/or readable formats, with timezones attached using helpers or the airports table.
- The frontend receives only enriched, user-facing data and never has to look up airport or airline names itself.

## Implementation Notes (2025-07-18)
- Event airport lookup uses the `metro_areas` table (city/state -> primary_airport) as the authoritative source.
- Hotel search is based on the event's venue city/state (not airport proximity).
- Ticket search always uses the Ticketmaster `external_id` if available; fallback search is only used if missing.
- All trip component enrichment (airline/airport names, readable times, amenities, etc.) is required for user-facing APIs.

### API Response Requirements for Trip Cards
- All enriched fields (airline name, airport name, readable times, amenities, baggage, cancellation, etc.) must be included in the API response for trip cards.
- The frontend must never have to look up codes or enrich data itself; all user-facing fields must be present in the API response.
- This enables users to make fully informed travel decisions directly from the trip cards.

This comprehensive plan will transform the Concert Travel App into a data-rich platform that provides users with all the detailed information they need to make informed travel decisions. 