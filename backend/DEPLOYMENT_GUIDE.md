# Concert Travel App Backend Deployment Guide

## Overview
This guide covers deploying the enhanced Concert Travel App backend with Amadeus integration, multi-city flights, travel packages, and comprehensive error handling.

## Prerequisites

### Required Services
- **Node.js** 18+ 
- **PostgreSQL** 13+
- **Redis** 6+ (for caching)
- **PM2** (for process management)

### Environment Variables
Create a `.env` file with all required variables:

```env
# Server Configuration
PORT=5001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/concert_travel

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your_very_secure_jwt_secret_key

# Amadeus API
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret

# Spotify (if using)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://yourdomain.com/spotify

# Logging
LOG_LEVEL=info
```

## Installation Steps

### 1. Install Dependencies
```bash
npm install --production
```

### 2. Database Setup
```bash
# Run migrations
npm run migrate

# Seed initial data (if needed)
npm run seed
```

### 3. Redis Setup
```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test Redis connection
redis-cli ping
```

### 4. PM2 Setup
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'concert-travel-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10
  }]
};
EOF

# Create logs directory
mkdir -p logs
```

## Deployment Options

### Option 1: Direct Server Deployment

#### 1. Start the Application
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

#### 2. Nginx Configuration
Create `/etc/nginx/sites-available/concert-travel-backend`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/concert-travel-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5001

CMD ["node", "server.js"]
```

#### 2. Create docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/concert_travel
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: concert_travel
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 3. Deploy with Docker
```bash
# Build and start services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run migrate
```

### Option 3: Cloud Deployment (AWS/GCP/Azure)

#### AWS EC2 with PM2
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Clone and setup application
git clone <your-repo>
cd concert-travel-app/backend
npm install --production

# Setup environment variables
cp .env.example .env
# Edit .env with production values

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Monitoring and Maintenance

### 1. Health Checks
```bash
# Check application health
curl http://localhost:5001/health

# Check PM2 status
pm2 status

# Check logs
pm2 logs concert-travel-backend
```

### 2. Performance Monitoring
```bash
# Monitor system resources
pm2 monit

# Check Redis memory usage
redis-cli info memory

# Check database connections
psql -d concert_travel -c "SELECT count(*) FROM pg_stat_activity;"
```

### 3. Backup Strategy
```bash
# Database backup
pg_dump concert_travel > backup_$(date +%Y%m%d_%H%M%S).sql

# Redis backup
redis-cli BGSAVE

# Application logs backup
tar -czf logs_backup_$(date +%Y%m%d_%H%M%S).tar.gz logs/
```

### 4. Scaling
```bash
# Scale PM2 instances
pm2 scale concert-travel-backend 4

# Load balancer configuration (nginx)
upstream backend {
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    server 127.0.0.1:5003;
    server 127.0.0.1:5004;
}
```

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files to version control
- Use strong, unique secrets for JWT_SECRET
- Rotate API keys regularly

### 2. Network Security
```bash
# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 3. SSL/TLS
```bash
# Install Certbot for Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### 4. Rate Limiting
The application includes built-in rate limiting:
- Standard endpoints: 100 requests/minute
- Search endpoints: 50 requests/minute
- Health endpoints: 200 requests/minute

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
sudo systemctl status postgresql

# Check connection
psql -d concert_travel -c "SELECT version();"
```

#### 2. Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h

# Check PM2 memory usage
pm2 monit
```

#### 4. API Errors
```bash
# Check application logs
pm2 logs concert-travel-backend

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX idx_flights_origin_destination ON flights(origin, destination);
CREATE INDEX idx_hotels_city_code ON hotels(city_code);
```

#### 2. Redis Optimization
```bash
# Configure Redis for better performance
echo "maxmemory 256mb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
```

#### 3. Node.js Optimization
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
```

## Updates and Maintenance

### 1. Application Updates
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install --production

# Run migrations
npm run migrate

# Restart application
pm2 restart concert-travel-backend
```

### 2. Dependency Updates
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Test application
npm test
```

### 3. Monitoring Setup
Consider setting up monitoring tools:
- **PM2 Plus** for application monitoring
- **New Relic** for performance monitoring
- **Sentry** for error tracking
- **Grafana** for metrics visualization

## Support

For deployment issues:
1. Check the logs: `pm2 logs concert-travel-backend`
2. Verify environment variables are set correctly
3. Test database and Redis connections
4. Check firewall and network configuration
5. Review the troubleshooting section above 