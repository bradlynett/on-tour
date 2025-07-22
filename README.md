# Concert Travel App

> **IMPORTANT:** All development, scripts, and builds should be run from the `concert-travel-app/` directory. The root directory and its files are deprecated and should not be used. Please ignore or delete any files or scripts outside of `concert-travel-app/`.

A comprehensive platform for discovering and booking concert travel experiences, featuring personalized trip suggestions based on user music preferences and travel habits.

## 🚀 Recent Updates - Mobile App Development Complete!

The mobile app has been fully developed with production-ready features:

- **📱 Cross-Platform Mobile App**: React Native with iOS and Android support
- **🎨 Pixel-Perfect Styling**: Shared theme system matching web app design
- **🔗 Real-Time Data Integration**: Connected to backend API with live trip suggestions
- **🔐 Mobile Authentication**: JWT-based authentication with error recovery
- **🛠️ Comprehensive Debugging**: Network connectivity and API testing tools
- **📊 Dashboard Integration**: Real trip suggestions with dynamic component display

## 🎯 **Development Compliance Guidelines**

**IMPORTANT**: Before building any new features, review the [Development Compliance Guidelines](docs/development-compliance-guidelines.md) to ensure all work follows established patterns and utilizes reference documents properly.

## Features

### Core Functionality
- **Personalized Trip Suggestions**: AI-powered recommendations based on user music preferences
- **Multi-Source Event Integration**: Aggregates events from Ticketmaster, Eventbrite, and more
- **Artist Metadata System**: Comprehensive artist information and genre matching
- **Travel Preferences**: Customizable travel and accommodation preferences
- **Spotify Integration**: Seamless music preference import and synchronization
- **Mobile App**: Native mobile experience with real-time data synchronization

### Technical Features
- **Scalable Backend**: Redis caching, rate limiting, background jobs
- **Real-time Updates**: Live event synchronization and user preference updates
- **Comprehensive Logging**: Production-ready monitoring and debugging
- **API-First Design**: RESTful APIs for frontend and mobile integration
- **Database Migrations**: Version-controlled schema management
- **Cross-Platform Mobile**: React Native with shared theme system

## Architecture

### Backend (Node.js/Express)
- **Stateless Design**: JWT authentication, horizontal scaling ready
- **Redis Integration**: Distributed caching and rate limiting
- **PostgreSQL**: Reliable data storage with migrations
- **BullMQ**: Background job processing for heavy tasks
- **Winston**: Structured logging for production monitoring

### Frontend (React)
- **Modern UI**: Responsive design with Material-UI components
- **State Management**: Context API for user authentication and preferences
- **Real-time Updates**: Live synchronization with backend services

### Mobile (React Native)
- **Cross-platform**: iOS and Android support with Expo
- **Shared Theme System**: React Native Paper with Material Design
- **Real-time Data**: Live trip suggestions and user profile integration
- **Network Optimization**: Local network IP configuration for device testing
- **Authentication**: JWT-based auth with error recovery

## Quick Start

### Prerequisites
- Node.js v20.x (LTS)
- PostgreSQL
- Redis (for caching and rate limiting)
- Expo CLI (`npm install -g @expo/cli`)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd concert-travel-app
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up the database**
   ```bash
   cd backend
   npm run db:setup
   ```

4. **Start Redis server**
   - Ensure Redis is running on localhost:6379

5. **Start the application**
   ```bash
   npm run dev
   ```

### Mobile App Setup

1. **Install Expo CLI**
   ```bash
   npm install -g @expo/cli
   ```

2. **Start mobile development**
   ```bash
   cd mobile
   npm start
   ```

3. **Run on device**
   - Install Expo Go app on your mobile device
   - Scan the QR code from the terminal
   - Ensure backend is running on your local network IP

### Environment Variables

Create a `.env` file in the backend directory:

```bash
# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=concert_travel
DB_USER=postgres
DB_PASSWORD=password

# Redis (for caching and rate limiting)
REDIS_URL=redis://localhost:6379

# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/spotify

# JWT
JWT_SECRET=your_jwt_secret

# Environment
NODE_ENV=development
```

## API Documentation

- **Backend API**: [Backend Documentation](docs/backend.md)
- **Database Schema**: [Database Documentation](docs/database.md)
- **System Architecture**: [Architecture Overview](docs/architecture.md)
- **Mobile App**: [Mobile Documentation](docs/mobile.md)

## Development

### Backend Development
```bash
cd backend
npm run dev          # Start with nodemon
npm run db:migrate   # Run database migrations
npm run test         # Run tests
```

### Frontend Development
```bash
cd frontend
npm start            # Start React development server
```

### Mobile Development
```bash
cd mobile
npm start            # Start Expo development server
node debug-mobile.js # Test API connectivity
```

### Health Checks
- Backend health: `GET http://localhost:5001/health`
- Frontend: `http://localhost:3000`
- Mobile: Scan QR code with Expo Go app

## Production Deployment

### Backend Requirements
- **Redis Server**: Required for caching and rate limiting
- **PostgreSQL**: Database server
- **Environment Variables**: All required variables must be set
- **Load Balancer**: For multiple backend instances

### Mobile App Deployment
- **Expo Build Service**: For iOS and Android builds
- **App Store**: iOS App Store deployment
- **Play Store**: Google Play Store deployment
- **Code Signing**: Proper app signing for both platforms

### Scaling Considerations
- **Multiple Instances**: Backend is stateless and can run multiple instances
- **Redis Cluster**: For high availability caching
- **Database Connection Pooling**: Configured for production loads
- **Log Monitoring**: Monitor `combined.log` for application health
- **Mobile CDN**: For app updates and assets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license information here]

---

## Support

For questions or issues, please refer to the documentation or create an issue in the repository. 