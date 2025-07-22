// Abstract interface for travel providers
class TravelProviderInterface {
    constructor() {
        if (this.constructor === TravelProviderInterface) {
            throw new Error('TravelProviderInterface is abstract and cannot be instantiated');
        }
    }

    // Flight search interface
    async searchFlights(origin, destination, departureDate, returnDate = null, passengers = 1, maxResults = 10) {
        throw new Error('searchFlights must be implemented by subclass');
    }

    // Hotel search interface
    async searchHotels(cityCode, checkInDate, checkOutDate, adults = 1, radius = 5, maxResults = 20) {
        throw new Error('searchHotels must be implemented by subclass');
    }

    // Car rental search interface
    async searchCarRentals(pickUpLocation, dropOffLocation, pickUpDate, dropOffDate, maxResults = 10) {
        throw new Error('searchCarRentals must be implemented by subclass');
    }

    // Airport/city search interface
    async searchAirports(keyword) {
        throw new Error('searchAirports must be implemented by subclass');
    }

    // Health check interface
    async healthCheck() {
        throw new Error('healthCheck must be implemented by subclass');
    }

    // Get provider name
    getProviderName() {
        throw new Error('getProviderName must be implemented by subclass');
    }

    // Check if provider is available
    async isAvailable() {
        throw new Error('isAvailable must be implemented by subclass');
    }
}

// Standardized response formats
class TravelResponseFormatter {
    static formatFlightResults(flights, provider) {
        return flights.map(flight => ({
            id: flight.id,
            provider: provider,
            price: {
                total: flight.price?.total || flight.price,
                currency: flight.price?.currency || 'USD',
                base: flight.price?.base,
                fees: flight.price?.fees
            },
            itineraries: flight.itineraries || [{
                duration: flight.duration,
                segments: [{
                    departure: {
                        airport: flight.departure?.airport || flight.departureAirport,
                        terminal: flight.departure?.terminal,
                        time: flight.departure?.time || flight.departure
                    },
                    arrival: {
                        airport: flight.arrival?.airport || flight.arrivalAirport,
                        terminal: flight.arrival?.terminal,
                        time: flight.arrival?.time || flight.arrival
                    },
                    carrier: flight.carrier || flight.airline,
                    flightNumber: flight.flightNumber,
                    aircraft: flight.aircraft?.code || flight.aircraft,
                    duration: flight.duration
                }]
            }],
            numberOfBookableSeats: flight.numberOfBookableSeats,
            cabinClass: flight.cabinClass || flight.class,
            fareType: flight.fareType
        }));
    }

    static formatHotelResults(hotels, provider) {
        return hotels.map(hotel => ({
            id: hotel.id || hotel.hotelId,
            provider: provider,
            name: hotel.name,
            rating: hotel.rating,
            location: {
                latitude: hotel.location?.latitude || hotel.latitude,
                longitude: hotel.location?.longitude || hotel.longitude,
                address: hotel.location?.address || hotel.address
            },
            amenities: hotel.amenities || [],
            offers: hotel.offers || [{
                id: hotel.id,
                price: {
                    total: hotel.price?.total || hotel.price,
                    currency: hotel.price?.currency || 'USD',
                    base: hotel.price?.base
                },
                boardType: hotel.boardType,
                room: hotel.room || hotel.roomType,
                cancellation: hotel.cancellation || hotel.cancellationPolicy
            }]
        }));
    }

    static formatCarResults(cars, provider) {
        return cars.map(car => ({
            id: car.id,
            provider: provider,
            carType: car.carType || car.carInfo?.type,
            transmission: car.transmission || car.carInfo?.transmission,
            airConditioning: car.airConditioning || car.carInfo?.airConditioning,
            fuelPolicy: car.fuelPolicy || car.carInfo?.fuelPolicy,
            seats: car.seats || car.carInfo?.seats,
            bags: car.bags || car.carInfo?.bags,
            price: {
                total: car.price?.total || car.price,
                currency: car.price?.currency || 'USD',
                base: car.price?.base
            },
            vendor: car.vendor?.name || car.provider,
            location: {
                pickUp: car.location?.pickUp || car.pickUpLocation,
                dropOff: car.location?.dropOff || car.dropOffLocation
            }
        }));
    }

    static formatAirportResults(airports, provider) {
        return airports.map(airport => ({
            code: airport.iataCode || airport.code,
            name: airport.name,
            city: airport.address?.cityName || airport.city,
            country: airport.address?.countryName || airport.country,
            type: airport.subType || airport.type,
            provider: provider
        }));
    }
}

module.exports = {
    TravelProviderInterface,
    TravelResponseFormatter
}; 