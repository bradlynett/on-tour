# Developer Guide

## Getting Started

### Prerequisites
- **Node.js** (LTS version 18+)
- **PostgreSQL** (version 12+)
- **Git** for version control
- **PowerShell** (Windows) or **Bash** (Linux/Mac)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd concert-travel-app
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Database setup**
   ```bash
   # From backend directory
   cd ../backend
   
   # Create database (if not exists)
   createdb concert_travel_app
   
   # Run migrations
   npm run db:migrate
   ```

4. **Environment configuration**
   ```bash
   # Backend .env (create if not exists)
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Frontend .env (create if not exists)
   cd ../frontend
   cp .env.example .env
   # Edit .env with API URLs
   ```

5. **Data Enrichment Setup**
   ```bash
   # Backend .env - Add data enrichment configuration
   # AMADEUS_CLIENT_ID=your_amadeus_client_id
   # AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
   # REDIS_URL=redis://localhost:6379
   
   # Install Redis (if not already installed)
   # Windows: Use WSL or Docker
   # macOS: brew install redis
   # Linux: sudo apt-get install redis-server
   ```

## Development Workflow

### Starting Development Servers

#### Backend
```bash
cd backend
npm start          # Production mode
npm run dev        # Development mode with nodemon
```

#### Frontend
```bash
cd frontend
npm start          # Starts on http://localhost:3000
```

#### Both (using scripts)
```bash
# From project root
./start-app.ps1    # PowerShell script
./start-simple.ps1 # Simplified version
```

### Database Development

#### Running Migrations
```bash
cd backend
npm run db:migrate        # Run all pending migrations
npm run db:migrate:status # Check migration status
```

#### Creating New Migrations
1. Create new `.sql` file in `backend/database/migrations/`
2. Use descriptive naming: `09_add_new_feature.sql`
3. Include both CREATE and DROP statements
4. Test with `npm run db:migrate:status`

#### Testing Database Changes
```bash
# Test triggers
node scripts/test-updated-at-trigger.js

# Test artist metadata
node scripts/test-artist-metadata.js

# Test trip suggestions
node scripts/test-trip-suggestions.js

# Test data enrichment (after Migration 18)
node scripts/test-enhanced-trip-engine.js
node scripts/test-amadeus-keys.js
```

#### Data Enrichment Development
```bash
# Test enhanced flight data
node scripts/test-enhanced-trip-engine.js

# Test Amadeus integration
node scripts/test-amadeus.ps1

# Test price tracking
node -e "const { DataEnrichmentService } = require('./services/dataEnrichmentService'); new DataEnrichmentService().testPriceTracking();"

# Verify Redis connectivity
node -e "const redis = require('redis'); const client = redis.createClient(); client.ping().then(() => console.log('Redis connected')).catch(console.error).finally(() => client.quit());"
```

### Code Structure

#### Backend
```
backend/
├── routes/          # API endpoints
├── services/        # Business logic
│   ├── amadeusService.js      # Enhanced flight/hotel data
│   ├── dataEnrichmentService.js # Component enrichment
│   └── ...                    # Other services
├── middleware/      # Auth, validation
├── database/        # Migrations, schema
├── scripts/         # Utilities, tests
└── config/          # Configuration
```

#### Frontend
```
frontend/
├── src/
│   ├── components/  # Reusable components
│   ├── contexts/    # React contexts
│   ├── pages/       # Page components
│   └── config/      # API config
└── public/          # Static assets
```

## Testing

### Backend Testing
```bash
cd backend

# Run specific test scripts
node scripts/test-updated-at-trigger.js
node scripts/test-artist-metadata.js
node scripts/test-trip-suggestions.js

# Test data enrichment features
node scripts/test-enhanced-trip-engine.js
node scripts/test-amadeus-keys.js

# Test API endpoints
node scripts/test-api-endpoints.ps1
```

### Frontend Testing
```bash
cd frontend
npm test             # Run test suite
npm test -- --watch  # Watch mode
```

### Integration Testing
- Test user flows end-to-end
- Verify API responses
- Check database state after operations

## Debugging

### Backend Debugging
```bash
# Enable debug logging
DEBUG=* npm start

# Check server health
node scripts/test-server-health.js

# Database connection test
node -e "const { pool } = require('./config/database'); pool.query('SELECT 1').then(() => console.log('Connected')).catch(console.error).finally(() => pool.end());"
```

### Frontend Debugging
- Use React Developer Tools
- Check browser console for errors
- Verify API calls in Network tab

### Database Debugging
```bash
# Connect to database
psql -d concert_travel_app

# Check migration status
SELECT * FROM database_migrations ORDER BY applied_at;

# Test triggers
UPDATE events SET name = 'Test' WHERE id = 1;
SELECT created_at, updated_at FROM events WHERE id = 1;
```

## Deployment

### Production Setup
1. **Environment variables**
   - Set production database credentials
   - Configure API keys (Spotify, Amadeus, etc.)
   - Set CORS origins
   - Configure Redis for caching and price tracking

2. **Database**
   - Run migrations on production database (including Migration 18)
   - Set up automated backups
   - Configure connection pooling
   - Verify enhanced data fields are present

3. **Data Enrichment Services**
   - Configure Amadeus API credentials
   - Set up Redis for price history caching
   - Verify data enrichment service connectivity
   - Test enhanced flight and hotel data retrieval

3. **Build and deploy**
   ```bash
   # Backend
   cd backend
   npm run build
   
   # Frontend
   cd frontend
   npm run build
   ```

### Docker Deployment
```bash
# Build and run with Docker Compose
cd backend
docker-compose up -d
```

## Contributing

### Code Standards
- **JavaScript/TypeScript**: Use ES6+ features, consistent formatting
- **SQL**: Use descriptive names, include comments for complex queries
- **React**: Functional components with hooks, TypeScript interfaces
- **Documentation**: Update docs for new features

### Git Workflow
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test
3. Update documentation if needed
4. Commit with descriptive messages
5. Create pull request

### Pull Request Guidelines
- **Title**: Clear, descriptive title
- **Description**: What was changed and why
- **Testing**: How to test the changes
- **Documentation**: Any docs that need updating

### Code Review Checklist
- [ ] Code follows project standards
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No security issues
- [ ] Performance considerations addressed

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check database status
pg_ctl status

# Restart database
pg_ctl restart

# Check connection
psql -d concert_travel_app -c "SELECT 1"
```

#### Migration Issues
```bash
# Check migration status
npm run db:migrate:status

# Reset failed migrations (if needed)
# Manually update database_migrations table
```

#### Port Conflicts
```bash
# Check what's using port 3000
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <process-id> /F
```

### Performance Issues
- Check database query performance
- Monitor API response times
- Review frontend bundle size
- Optimize images and assets

## Resources

### Documentation
- [System Architecture](architecture.md)
- [Backend & API](backend.md)
- [Frontend](frontend.md)
- [Database](database.md)
- [Artist Metadata System](artist-metadata-system.md)
- [Data Enrichment Plan](data-enrichment-plan.md)
- [Booking System](booking-system.md)

### External Resources
- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Documentation](https://expressjs.com/)

---
[Back to README](../README.md) 