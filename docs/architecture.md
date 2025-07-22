# System Architecture

## Overview
The Concert Travel App is a full-stack platform for discovering concerts, planning travel, and receiving personalized trip suggestions. It consists of:
- **Backend**: Node.js/Express API, PostgreSQL database, services, migrations
- **Frontend**: React SPA for user/admin dashboards
- **Mobile**: (Optional) React Native app for mobile users
- **Shared**: Utilities and types shared across layers

## High-Level Diagram
```
[User/Mobile/Browser]
      |
      v
[Frontend (React)] <----> [Backend API (Express/Node.js)] <----> [PostgreSQL Database]
      |                             |                      
      |                             +----> [External APIs: Spotify, Ticketmaster, Amadeus, etc.]
      |                             |
      |                             +----> [Data Enrichment Services]
      |                             |     ├── AmadeusService (Enhanced)
      |                             |     ├── DataEnrichmentService
      |                             |     └── Price Tracking & Alerts
      |                             |
      |                             +----> [Redis Cache]
      |                                   └── Price History & Availability
      |
      v
[Mobile App (React Native)]
```

## Data Flow
1. **User interacts** with frontend/mobile (search, login, preferences)
2. **Frontend** calls backend API endpoints
3. **Backend** processes requests, queries database, integrates with external APIs
4. **Data Enrichment Services** enhance raw data with detailed information
5. **Redis Cache** stores price history and availability data for performance
6. **Database** stores users, events, trips, artist metadata, and enriched data
7. **Backend** returns personalized, enriched data to frontend/mobile

## Key Components
- **Backend**: [docs/backend.md](backend.md)
- **Frontend**: [docs/frontend.md](frontend.md)
- **Database**: [docs/database.md](database.md)
- **Artist Metadata**: [docs/artist-metadata-system.md](artist-metadata-system.md)
- **Enhanced Artist Matching**: [docs/enhanced-artist-matching.md](enhanced-artist-matching.md)
- **Data Enrichment**: [docs/data-enrichment-plan.md](data-enrichment-plan.md)
- **Booking System**: [docs/booking-system.md](booking-system.md)

## Extensibility
- Modular service architecture
- Easy to add new APIs, data sources, or UI features
- Data enrichment pipeline for comprehensive information
- Real-time price tracking and availability monitoring
- Multi-provider redundancy for reliability

---
[Back to README](../README.md) 