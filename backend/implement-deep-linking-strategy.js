const { pool } = require('./config/database');
const tripSuggestionEngine = require('./services/tripSuggestionEngine');
const {
  getTicketmasterEventUrl,
  getBookingComHotelUrl,
  getHotelBrandDirectUrl,
  getGoogleFlightsUrl,
  getCarRentalUrl
} = require('./services/deepLinkHelpers');
const averageHotelPrices = require('./services/averageHotelPrices.json');
const averageFlightPrices = require('./services/averageFlightPrices.json');

async function implementDeepLinkingStrategy() {
  try {
    console.log('🔧 Implementing deep linking strategy with fallback pricing...');
    
    // Check current database state
    const initialTripsResult = await pool.query('SELECT COUNT(*) as total FROM trip_suggestions');
    console.log(`Initial trips in database: ${initialTripsResult.rows[0].total}`);
    
    // Find future events (avoiding Denver to prevent DEN-DEN flights)
    const futureEventsResult = await pool.query(`
      SELECT id, name, artist, venue_name, venue_city, venue_state, event_date, external_id
      FROM events 
      WHERE event_date > (CURRENT_DATE + INTERVAL '3 days') 
      AND external_id IS NOT NULL 
      AND venue_city != 'Denver'
      ORDER BY event_date ASC
      LIMIT 5
    `);
    
    console.log(`\nFound ${futureEventsResult.rows.length} future events for trip generation`);
    
    if (futureEventsResult.rows.length === 0) {
      console.log('❌ No future events found');
      return;
    }
    
    // Generate trips for each event using deep linking strategy
    for (const event of futureEventsResult.rows) {
      console.log(`\n🎯 Processing: ${event.name} - ${event.artist}`);
      console.log(`   Venue: ${event.venue_name}, ${event.venue_city}, ${event.venue_state}`);
      console.log(`   Date: ${new Date(event.event_date).toLocaleDateString()}`);
      
      try {
        // Create trip using our deep linking strategy
        const trip = await createTripWithDeepLinking(event);
        
        if (trip) {
          console.log(`✅ Trip created successfully with ID: ${trip.id}`);
          console.log(`   Total Cost: $${trip.totalCost || 0}`);
          console.log(`   Components: ${trip.components?.length || 0}`);
          
          if (trip.priceBreakdown) {
            console.log(`   Real: $${trip.priceBreakdown.real || 0}, Estimated: $${trip.priceBreakdown.estimated || 0}`);
          }
          
          // Show components
          trip.components?.forEach((comp, index) => {
            console.log(`   ${index + 1}. ${comp.componentType}: $${comp.price || 0} (${comp.priceType || 'unknown'}) - ${comp.provider}`);
            if (comp.bookingUrl) {
              console.log(`      Booking URL: ${comp.bookingUrl}`);
            }
          });
        }
        
      } catch (error) {
        console.error(`❌ Failed to create trip for ${event.name}:`, error.message);
      }
    }
    
    // Check final database state
    console.log('\n📊 Final database state:');
    const finalTripsResult = await pool.query('SELECT COUNT(*) as total FROM trip_suggestions');
    console.log(`   Total trips: ${finalTripsResult.rows[0].total}`);
    
    const finalComponentsResult = await pool.query('SELECT COUNT(*) as total FROM trip_components');
    console.log(`   Total components: ${finalComponentsResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error implementing deep linking strategy:', error);
  } finally {
    await pool.end();
  }
}

async function createTripWithDeepLinking(event) {
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
    
    // Generate deep links and fallback pricing
    const components = [];
    let totalCost = 0;
    let realCost = 0;
    let estimatedCost = 0;
    
    // 1. Ticket component
    if (event.external_id) {
      const ticketPrice = 100; // Estimated ticket price
      const ticketBookingUrl = getTicketmasterEventUrl(event.external_id, event.name, event.venue_city, event.event_date);
      
      components.push({
        componentType: 'ticket',
        provider: 'ticketmaster',
        price: ticketPrice,
        priceType: 'estimated',
        bookingUrl: ticketBookingUrl,
        details: {
          section: 'General Admission',
          ticketType: 'Standard',
          delivery: 'Mobile Entry'
        }
      });
      
      estimatedCost += ticketPrice;
    }
    
    // 2. Flight component
    if (destinationAirport && destinationAirport !== 'DEN') {
      const routeKey = `DEN-${destinationAirport}`;
      const flightPrice = averageFlightPrices[routeKey] || 300; // Fallback price
      const airline = preferences.preferred_airlines[0] || 'Any';
      const flightBookingUrl = getGoogleFlightsUrl('DEN', destinationAirport, eventDateStr, airline);
      
      components.push({
        componentType: 'flight',
        provider: 'google_flights',
        price: flightPrice,
        priceType: 'estimated',
        bookingUrl: flightBookingUrl,
        details: {
          airline: airline !== 'Any' ? airline : 'Multiple Airlines',
          departure: 'DEN',
          arrival: destinationAirport,
          date: eventDateStr
        }
      });
      
      estimatedCost += flightPrice;
    }
    
    // 3. Hotel component
    if (event.venue_city) {
      const hotelBrand = preferences.preferred_hotel_brands[0] || 'Any';
      const hotelPrice = averageHotelPrices[event.venue_city]?.[hotelBrand] || averageHotelPrices[event.venue_city]?.['Any'] || 150;
      const hotelDirectUrl = getHotelBrandDirectUrl(hotelBrand, event.venue_city, checkInStr, checkOutStr);
      const hotelBookingUrl = hotelDirectUrl || getBookingComHotelUrl(hotelBrand, event.venue_city, checkInStr, checkOutStr);
      
      components.push({
        componentType: 'hotel',
        provider: hotelDirectUrl ? hotelBrand.toLowerCase() : 'booking.com',
        price: hotelPrice,
        priceType: 'estimated',
        bookingUrl: hotelBookingUrl,
        details: {
          brand: hotelBrand !== 'Any' ? hotelBrand : 'Various Hotels',
          city: event.venue_city,
          checkIn: checkInStr,
          checkOut: checkOutStr
        }
      });
      
      estimatedCost += hotelPrice;
    }
    
    // 4. Car rental component
    if (event.venue_city) {
      const carPrice = getEstimatedCarPrice(event.venue_city);
      const carBrand = preferences.rental_car_preference || 'Any';
      const carBookingUrl = getCarRentalUrl(carBrand, event.venue_city, checkInStr, checkOutStr);
      
      components.push({
        componentType: 'car',
        provider: carBrand !== 'Any' ? carBrand.toLowerCase() : 'expedia',
        price: carPrice,
        priceType: 'estimated',
        bookingUrl: carBookingUrl,
        details: {
          brand: carBrand !== 'Any' ? carBrand : 'Various Rentals',
          pickupLocation: event.venue_city,
          pickupDate: checkInStr,
          returnDate: checkOutStr
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
    console.error('Error creating trip with deep linking:', error);
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

implementDeepLinkingStrategy(); 