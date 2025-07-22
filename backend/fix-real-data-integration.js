const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');
const amadeusService = require('./services/amadeusService');
const eventService = require('./services/eventService');
const {
  getTicketmasterEventUrl,
  getBookingComHotelUrl,
  getHotelBrandDirectUrl,
  getGoogleFlightsUrl,
  getCarRentalUrl
} = require('./services/deepLinkHelpers');

async function fixRealDataIntegration() {
  try {
    console.log('🔧 Fixing real data integration...');
    
    // Check current database state
    const initialTripsResult = await pool.query('SELECT COUNT(*) as total FROM trip_suggestions');
    console.log(`Initial trips in database: ${initialTripsResult.rows[0].total}`);
    
    // Find a future event with real price data
    const futureEventResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id, min_price, max_price
      FROM events 
      WHERE event_date > (CURRENT_DATE + INTERVAL '3 days') 
      AND external_id IS NOT NULL 
      AND venue_city != 'Denver'
      AND (min_price IS NOT NULL OR max_price IS NOT NULL)
      ORDER BY event_date ASC
      LIMIT 1
    `);
    
    if (futureEventResult.rows.length === 0) {
      console.log('❌ No future events with price data found');
      return;
    }
    
    const event = futureEventResult.rows[0];
    console.log(`\n🎯 Processing: ${event.name} - ${event.artist}`);
    console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
    console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`);
    console.log(`   Ticket Price Range: $${event.min_price || 'N/A'} - $${event.max_price || 'N/A'}`);
    console.log(`   Ticketmaster ID: ${event.external_id}`);
    
    try {
      // Create trip using real data with proper fallback
      const trip = await createTripWithRealData(event);
      
      if (trip) {
        console.log(`✅ Trip created successfully with ID: ${trip.id}`);
        console.log(`   Total Cost: $${trip.totalCost || 0}`);
        console.log(`   Components: ${trip.components?.length || 0}`);
        
        if (trip.priceBreakdown) {
          console.log(`   Real: $${trip.priceBreakdown.real || 0}, Estimated: $${trip.priceBreakdown.estimated || 0}`);
        }
        
        // Show components with data source
        trip.components?.forEach((comp, index) => {
          console.log(`   ${index + 1}. ${comp.componentType.toUpperCase()}`);
          console.log(`      Provider: ${comp.provider}`);
          console.log(`      Price: $${comp.price || 0} (${comp.priceType || 'unknown'})`);
          console.log(`      Data Source: ${comp.dataSource || 'unknown'}`);
          if (comp.bookingUrl) {
            console.log(`      Booking URL: ${comp.bookingUrl}`);
          }
        });
      }
      
    } catch (error) {
      console.error(`❌ Failed to create trip for ${event.name}:`, error.message);
    }
    
  } catch (error) {
    console.error('❌ Error fixing real data integration:', error);
  } finally {
    await pool.end();
  }
}

async function createTripWithRealData(event) {
  try {
    // User preferences
    const preferences = {
      primary_airport: 'DEN',
      preferred_airlines: ['United', 'Southwest'],
      preferred_hotel_brands: ['Hilton', 'Marriott'],
      rental_car_preference: 'Hertz'
    };
    
    // Get destination airport
    const destinationAirport = await tripSuggestionEngine.getEventPrimaryAirport(event.venue_city, event.venue_state);
    
    // Calculate dates
    const eventDate = new Date(event.event_date);
    const departureDate = new Date(eventDate);
    departureDate.setDate(eventDate.getDate() - 1);
    const returnDate = new Date(eventDate);
    returnDate.setDate(eventDate.getDate() + 1);
    
    const checkInStr = departureDate.toISOString().split('T')[0];
    const checkOutStr = returnDate.toISOString().split('T')[0];
    const eventDateStr = eventDate.toISOString().split('T')[0];
    
    // Generate components with real data first
    const components = [];
    let totalCost = 0;
    let realCost = 0;
    let estimatedCost = 0;
    
    // 1. Ticket component - Get real data from Ticketmaster
    if (event.external_id) {
      console.log(`   🎫 Getting real ticket data for ${event.external_id}...`);
      let ticketPrice = null;
      let ticketDetails = null;
      let ticketDataSource = 'estimated';
      
      try {
        // Use the correct method name: getEventById
        const ticketData = await eventService.getEventById(event.external_id);
        if (ticketData && ticketData.priceRanges && ticketData.priceRanges.length > 0) {
          const priceRange = ticketData.priceRanges[0];
          ticketPrice = priceRange.min || event.min_price || 100;
          ticketDetails = {
            section: priceRange.type || 'General Admission',
            ticketType: 'Standard',
            delivery: 'Mobile Entry',
            priceRange: `${priceRange.min || 'N/A'} - ${priceRange.max || 'N/A'}`,
            currency: priceRange.currency || 'USD'
          };
          ticketDataSource = 'real';
          console.log(`   ✅ Got real ticket data: $${ticketPrice} (${priceRange.currency || 'USD'})`);
        } else if (event.min_price || event.max_price) {
          // Use database price data
          ticketPrice = event.min_price || event.max_price || 100;
          ticketDetails = {
            section: 'General Admission',
            ticketType: 'Standard',
            delivery: 'Mobile Entry',
            priceRange: `${event.min_price || 'N/A'} - ${event.max_price || 'N/A'}`,
            note: 'Price from database'
          };
          ticketDataSource = 'real';
          console.log(`   ✅ Using database ticket data: $${ticketPrice}`);
        } else {
          throw new Error('No price data available');
        }
      } catch (error) {
        console.log(`   ⚠️ Using estimated ticket data: ${error.message}`);
        ticketPrice = 100; // Fallback price
        ticketDetails = {
          section: 'General Admission',
          ticketType: 'Standard',
          delivery: 'Mobile Entry',
          note: 'Price estimated - check Ticketmaster for current rates'
        };
      }
      
      const ticketBookingUrl = getTicketmasterEventUrl(event.external_id, event.name, event.venue_city, event.event_date);
      
      components.push({
        componentType: 'ticket',
        provider: 'ticketmaster',
        price: ticketPrice,
        priceType: ticketDataSource === 'real' ? 'real' : 'estimated',
        dataSource: ticketDataSource,
        bookingUrl: ticketBookingUrl,
        details: ticketDetails
      });
      
      if (ticketDataSource === 'real') {
        realCost += ticketPrice;
      } else {
        estimatedCost += ticketPrice;
      }
    }
    
    // 2. Flight component - Try real Amadeus data
    if (destinationAirport && destinationAirport !== 'DEN') {
      console.log(`   ✈️ Getting real flight data for DEN-${destinationAirport}...`);
      let flightPrice = null;
      let flightDetails = null;
      let flightDataSource = 'estimated';
      
      try {
        // Try to get real flight data from Amadeus
        const flightData = await amadeusService.searchFlights('DEN', destinationAirport, eventDateStr, 1);
        if (flightData && flightData.length > 0) {
          const flight = flightData[0];
          flightPrice = flight.price?.total || flight.price || 300;
          flightDetails = {
            airline: flight.validatingAirlineCodes?.[0] || 'Multiple Airlines',
            departure: 'DEN',
            arrival: destinationAirport,
            date: eventDateStr,
            flightNumber: flight.itineraries?.[0]?.segments?.[0]?.carrierCode || 'N/A',
            currency: flight.price?.currency || 'USD'
          };
          flightDataSource = 'real';
          console.log(`   ✅ Got real flight data: $${flightPrice} (${flight.price?.currency || 'USD'})`);
        } else {
          throw new Error('No flight data available');
        }
      } catch (error) {
        console.log(`   ⚠️ Using estimated flight data: ${error.message}`);
        flightPrice = 300; // Fallback price
        flightDetails = {
          airline: 'Multiple Airlines',
          departure: 'DEN',
          arrival: destinationAirport,
          date: eventDateStr,
          note: 'Price estimated - check Google Flights for current rates'
        };
      }
      
      const airline = preferences.preferred_airlines[0] || 'Any';
      const flightBookingUrl = getGoogleFlightsUrl('DEN', destinationAirport, eventDateStr, airline);
      
      components.push({
        componentType: 'flight',
        provider: 'google_flights',
        price: flightPrice,
        priceType: flightDataSource === 'real' ? 'real' : 'estimated',
        dataSource: flightDataSource,
        bookingUrl: flightBookingUrl,
        details: flightDetails
      });
      
      if (flightDataSource === 'real') {
        realCost += flightPrice;
      } else {
        estimatedCost += flightPrice;
      }
    }
    
    // 3. Hotel component - Try real Amadeus data
    if (event.venue_city) {
      console.log(`   🏨 Getting real hotel data for ${event.venue_city}...`);
      let hotelPrice = null;
      let hotelDetails = null;
      let hotelDataSource = 'estimated';
      
      try {
        // Try to get real hotel data from Amadeus
        const hotelData = await amadeusService.searchHotels(event.venue_city, checkInStr, checkOutStr, 1);
        if (hotelData && hotelData.length > 0) {
          const hotel = hotelData[0];
          hotelPrice = hotel.price?.total || hotel.price || 150;
          hotelDetails = {
            name: hotel.name || 'Various Hotels',
            brand: hotel.chainCode || 'Various Brands',
            city: event.venue_city,
            checkIn: checkInStr,
            checkOut: checkOutStr,
            rating: hotel.rating || 'N/A',
            currency: hotel.price?.currency || 'USD'
          };
          hotelDataSource = 'real';
          console.log(`   ✅ Got real hotel data: $${hotelPrice} (${hotel.price?.currency || 'USD'})`);
        } else {
          throw new Error('No hotel data available');
        }
      } catch (error) {
        console.log(`   ⚠️ Using estimated hotel data: ${error.message}`);
        hotelPrice = 150; // Fallback price
        hotelDetails = {
          name: 'Various Hotels',
          brand: 'Various Brands',
          city: event.venue_city,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          note: 'Price estimated - check Booking.com for current rates'
        };
      }
      
      const hotelBrand = preferences.preferred_hotel_brands[0] || 'Any';
      const hotelDirectUrl = getHotelBrandDirectUrl(hotelBrand, event.venue_city, checkInStr, checkOutStr);
      const hotelBookingUrl = hotelDirectUrl || getBookingComHotelUrl(hotelBrand, event.venue_city, checkInStr, checkOutStr);
      
      components.push({
        componentType: 'hotel',
        provider: hotelDirectUrl ? hotelBrand.toLowerCase() : 'booking.com',
        price: hotelPrice,
        priceType: hotelDataSource === 'real' ? 'real' : 'estimated',
        dataSource: hotelDataSource,
        bookingUrl: hotelBookingUrl,
        details: hotelDetails
      });
      
      if (hotelDataSource === 'real') {
        realCost += hotelPrice;
      } else {
        estimatedCost += hotelPrice;
      }
    }
    
    // 4. Car rental component - Use estimated data (no real API)
    if (event.venue_city) {
      const carPrice = getEstimatedCarPrice(event.venue_city);
      const carBrand = preferences.rental_car_preference || 'Any';
      const carBookingUrl = getCarRentalUrl(carBrand, event.venue_city, checkInStr, checkOutStr);
      
      components.push({
        componentType: 'car',
        provider: carBrand !== 'Any' ? carBrand.toLowerCase() : 'expedia',
        price: carPrice,
        priceType: 'estimated',
        dataSource: 'estimated',
        bookingUrl: carBookingUrl,
        details: {
          brand: carBrand !== 'Any' ? carBrand : 'Various Rentals',
          pickupLocation: event.venue_city,
          pickupDate: checkInStr,
          returnDate: checkOutStr,
          note: 'Price estimated - check rental sites for current rates'
        }
      });
      
      estimatedCost += carPrice;
    }
    
    // Calculate totals
    totalCost = realCost + estimatedCost;
    const serviceFee = Math.max(totalCost * 0.05, 25); // 5% or $25 minimum
    
    // Create trip suggestion in database
    const tripResult = await pool.query(`
      INSERT INTO trip_suggestions (user_id, event_id, status, total_cost, service_fee)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [20, event.id, 'pending', totalCost, serviceFee]);
    
    if (tripResult.rows.length === 0) {
      throw new Error('Failed to create trip suggestion');
    }
    
    const tripId = tripResult.rows[0].id;
    
    // Save components to database
    for (const component of components) {
      await pool.query(`
        INSERT INTO trip_components (trip_suggestion_id, component_type, provider, price, details, booking_reference)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        tripId,
        component.componentType,
        component.provider,
        component.price,
        JSON.stringify(component.details),
        component.bookingUrl
      ]);
    }
    
    // Return the complete trip object
    return {
      id: tripId,
      userId: 20,
      eventId: event.id,
      status: 'pending',
      totalCost: totalCost,
      serviceFee: serviceFee,
      components: components,
      priceBreakdown: {
        real: realCost,
        estimated: estimatedCost
      },
      bookingUrls: {
        ticket: components.find(c => c.componentType === 'ticket')?.bookingUrl,
        flight: components.find(c => c.componentType === 'flight')?.bookingUrl,
        hotel: components.find(c => c.componentType === 'hotel')?.bookingUrl,
        car: components.find(c => c.componentType === 'car')?.bookingUrl
      },
      eventName: event.name,
      artist: event.artist,
      venueName: event.venue_name,
      venueCity: event.venue_city,
      venueState: event.venue_state,
      eventDate: event.event_date,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
  } catch (error) {
    console.error('Error creating trip with real data:', error);
    throw error;
  }
}

function getEstimatedCarPrice(city) {
  const cityEstimates = {
    'New York': 80,
    'Los Angeles': 60,
    'Chicago': 50,
    'Austin': 45,
    'Denver': 55,
    'Miami': 65,
    'Las Vegas': 70,
    'Nashville': 55,
    'Atlanta': 50,
    'Boston': 75,
    'Berkeley': 60,
    'San Francisco': 70
  };
  return cityEstimates[city] || 50; // Default $50/day
}

fixRealDataIntegration(); 