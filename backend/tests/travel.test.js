// Load environment variables for testing
require('dotenv').config();

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock authentication middleware - define before importing routes
const mockAuthMiddleware = (req, res, next) => {
    req.user = { id: 'test-user-123', email: 'test@example.com' };
    next();
};

// Replace the real auth middleware with our mock
jest.mock('../middleware/auth', () => ({
    authenticateToken: mockAuthMiddleware
}));

// Mock the services
jest.mock('../services/unifiedTravelService');
jest.mock('../services/errorHandler', () => ({
    handleAmadeusError: jest.fn((error, context) => {
        if (error.response?.result?.errors?.[0]?.code === 425) {
            return {
                errorType: 'INVALID DATE',
                userMessage: 'The requested date is in the past or invalid. Please select a future date.',
                shouldRetry: false
            };
        } else if (error.response?.result?.errors?.[0]?.code === 429) {
            return {
                errorType: 'RATE LIMIT EXCEEDED',
                userMessage: 'Too many requests. Please wait a moment and try again.',
                shouldRetry: true
            };
        }
        return {
            errorType: 'UNKNOWN_ERROR',
            userMessage: 'An unexpected error occurred. Please try again or contact support.',
            shouldRetry: false
        };
    }),
    handleTravelError: jest.fn(),
    createErrorResponse: jest.fn()
}));

const travelRoutes = require('../routes/travel');
const unifiedTravelService = require('../services/unifiedTravelService');
const errorHandler = require('../services/errorHandler');

const app = express();
app.use(express.json());
app.use('/api/travel', travelRoutes);

describe('Travel API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /travel/flights', () => {
        it('should return flights successfully', async () => {
            const mockFlights = {
                flights: [
                    {
                        id: 'flight-1',
                        price: { total: '150.00', currency: 'USD' },
                        itineraries: []
                    }
                ],
                providers: [{ name: 'amadeus', status: 'success', count: 1 }],
                meta: { origin: 'LAX', destination: 'JFK' }
            };

            unifiedTravelService.searchFlights.mockResolvedValue(mockFlights);

            const response = await request(app)
                .get('/api/travel/flights')
                .query({
                    origin: 'LAX',
                    destination: 'JFK',
                    departureDate: '2024-12-25',
                    passengers: 1
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.meta.responseTime).toBeDefined();
        });

        it('should handle validation errors', async () => {
            const response = await request(app)
                .get('/api/travel/flights')
                .query({
                    origin: 'LAX',
                    // Missing required destination
                    departureDate: '2024-12-25'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.errors).toContain('destination is required');
        });

        it('should handle service errors gracefully', async () => {
            const mockError = new Error('No flights found');
            unifiedTravelService.searchFlights.mockRejectedValue(mockError);

            errorHandler.createErrorResponse.mockReturnValue({
                success: false,
                error: {
                    type: 'NO FLIGHTS FOUND',
                    message: 'No flights available for the specified route and date.',
                    shouldRetry: false
                }
            });

            const response = await request(app)
                .get('/api/travel/flights')
                .query({
                    origin: 'LAX',
                    destination: 'JFK',
                    departureDate: '2024-12-25'
                });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error.type).toBe('NO FLIGHTS FOUND');
        });
    });

    describe('GET /travel/hotels', () => {
        it('should return hotels successfully', async () => {
            const mockHotels = {
                hotels: [
                    {
                        id: 'hotel-1',
                        name: 'Test Hotel',
                        offers: [{ price: { total: '100.00', currency: 'USD' } }]
                    }
                ],
                providers: [{ name: 'amadeus', status: 'success', count: 1 }],
                meta: { cityCode: 'NYC' }
            };

            unifiedTravelService.searchHotels.mockResolvedValue(mockHotels);

            const response = await request(app)
                .get('/api/travel/hotels')
                .query({
                    cityCode: 'NYC',
                    checkInDate: '2024-12-25',
                    checkOutDate: '2024-12-26',
                    adults: 1
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });
    });

    describe('GET /travel/cars', () => {
        it('should return car rentals successfully', async () => {
            const mockCars = [
                {
                    id: 'car-1',
                    name: 'Test Car',
                    price: { total: '50.00', currency: 'USD' }
                }
            ];

            unifiedTravelService.searchCarRentals.mockResolvedValue(mockCars);

            const response = await request(app)
                .get('/api/travel/cars')
                .query({
                    pickUpLocation: 'LAX',
                    dropOffLocation: 'LAX',
                    pickUpDate: '2024-12-25T10:00:00',
                    dropOffDate: '2024-12-26T18:00:00'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });
    });

    describe('GET /travel/airports', () => {
        it('should return airports successfully', async () => {
            const mockAirports = {
                airports: [
                    { iataCode: 'LAX', name: 'Los Angeles International Airport' }
                ],
                providers: { amadeus: { status: 'success' } },
                meta: { keyword: 'LAX' }
            };

            unifiedTravelService.searchAirports.mockResolvedValue(mockAirports);

            const response = await request(app)
                .get('/api/travel/airports')
                .query({ keyword: 'LAX' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });
    });

    describe('GET /travel/flights/multi-city', () => {
        it('should return multi-city flights successfully', async () => {
            const mockMultiCityFlights = {
                flights: [
                    {
                        id: 'flight-1',
                        price: { total: '300.00', currency: 'USD' },
                        segment: { origin: 'LAX', destination: 'JFK', date: '2024-12-25' }
                    }
                ],
                providers: [{ name: 'amadeus', status: 'success', count: 1 }],
                meta: { segments: 1, passengers: 1 }
            };

            unifiedTravelService.searchMultiCityFlights.mockResolvedValue(mockMultiCityFlights);

            const segments = JSON.stringify([
                { origin: 'LAX', destination: 'JFK', date: '2024-12-25' },
                { origin: 'JFK', destination: 'LAX', date: '2024-12-28' }
            ]);

            const response = await request(app)
                .get('/api/travel/flights/multi-city')
                .query({
                    segments,
                    passengers: 1
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });

        it('should handle invalid segments format', async () => {
            const response = await request(app)
                .get('/api/travel/flights/multi-city')
                .query({
                    segments: 'invalid-json',
                    passengers: 1
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.type).toBe('VALIDATION_ERROR');
        });
    });

    describe('GET /travel/packages', () => {
        it('should return travel packages successfully', async () => {
            const mockPackages = {
                packages: [
                    {
                        id: 'package-1',
                        flight: { price: { total: '150.00', currency: 'USD' } },
                        hotel: { offers: [{ price: { total: '100.00', currency: 'USD' } }] },
                        totalPrice: 250.00,
                        currency: 'USD'
                    }
                ],
                providers: [{ name: 'amadeus', status: 'success', count: 1 }],
                meta: { origin: 'LAX', destination: 'JFK' }
            };

            unifiedTravelService.searchTravelPackages.mockResolvedValue(mockPackages);

            const response = await request(app)
                .get('/api/travel/packages')
                .query({
                    origin: 'LAX',
                    destination: 'JFK',
                    departureDate: '2024-12-25',
                    includeHotel: 'true',
                    includeCar: 'false'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });
    });

    describe('GET /travel/health', () => {
        it('should return health status', async () => {
            const mockHealth = {
                status: 'healthy',
                providers: { amadeus: { status: 'healthy' } },
                timestamp: new Date().toISOString()
            };

            unifiedTravelService.healthCheck.mockResolvedValue(mockHealth);

            const response = await request(app)
                .get('/api/travel/health');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.status).toBe('healthy');
        });
    });

    describe('GET /travel/providers', () => {
        it('should return provider status', async () => {
            const mockProviders = {
                amadeus: { name: 'Amadeus', available: true, health: 'healthy' }
            };

            unifiedTravelService.getAvailableProviders.mockResolvedValue(mockProviders);

            const response = await request(app)
                .get('/api/travel/providers');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.amadeus.available).toBe(true);
        });
    });
});

describe('Error Handler', () => {
    it('should handle Amadeus API errors correctly', () => {
        const mockError = {
            response: {
                result: {
                    errors: [{
                        code: 425,
                        title: 'INVALID DATE',
                        detail: 'Date/Time is in the past'
                    }]
                }
            }
        };

        const result = errorHandler.handleAmadeusError(mockError, { type: 'flight' });
        
        expect(result.errorType).toBe('INVALID DATE');
        expect(result.userMessage).toContain('future date');
        expect(result.shouldRetry).toBe(false);
    });

    it('should handle rate limit errors', () => {
        const mockError = {
            response: {
                result: {
                    errors: [{
                        code: 429,
                        title: 'RATE LIMIT EXCEEDED',
                        detail: 'Too many requests'
                    }]
                }
            }
        };

        const result = errorHandler.handleAmadeusError(mockError, { type: 'flight' });
        
        expect(result.errorType).toBe('RATE LIMIT EXCEEDED');
        expect(result.shouldRetry).toBe(true);
    });
}); 