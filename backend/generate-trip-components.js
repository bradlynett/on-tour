const { pool } = require('./config/database');
const {
  getTicketmasterEventUrl,
  getBookingComHotelUrl,
  getHotelBrandDirectUrl,
  getGoogleFlightsUrl,
  getCarRentalUrl
} = require('./services/deepLinkHelpers');

async function generateTripComponents() {
  try {
    console.log('🔧 Generating trip components for existing trips...');
    
    // Get all trip suggestions for Brad
    const tripsResult = await pool.query(`
      SELECT ts.id, ts.user_id, ts.event_id, e.name as event_name, e.artist, 
             e.venue_name, e.venue_city, e.venue_state, e.event_date, e.ticket_url,
             e.external_id
      FROM trip_suggestions ts
      JOIN events e ON ts.event_id = e.id
      WHERE ts.user_id = 20
      ORDER BY ts.created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${tripsResult.rows.length} trips to process`);
    
    for (const trip of tripsResult.rows) {
      console.log(`Processing trip ${trip.id}: ${trip.event_name}`);
      
      // Clear existing components
      await pool.query('DELETE FROM trip_components WHERE trip_suggestion_id = $1', [trip.id]);
      
      // Generate components
      const components = [];
      
      // 1. Ticket component
      const ticketUrl = getTicketmasterEventUrl(trip.external_id, trip.event_name, trip.venue_city, trip.event_date);
      components.push({
        trip_suggestion_id: trip.id,
        component_type: 'ticket',
        provider: 'Ticketmaster',
        price: Math.floor(Math.random() * 150) + 50, // Random price $50-$200
        details: JSON.stringify({
          section: 'General Admission',
          row: 'GA',
          seat: 'Standing'
        }),
        booking_reference: ticketUrl,
        created_at: new Date()
      });
      
      // 2. Hotel component
      const checkIn = new Date(trip.event_date);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 1);
      const checkInStr = checkIn.toISOString().split('T')[0];
      const checkOutStr = checkOut.toISOString().split('T')[0];
      
      const hotelUrl = getBookingComHotelUrl('Hilton', trip.venue_city, checkInStr, checkOutStr);
      components.push({
        trip_suggestion_id: trip.id,
        component_type: 'hotel',
        provider: 'Hilton',
        price: Math.floor(Math.random() * 200) + 100, // Random price $100-$300
        details: JSON.stringify({
          roomType: 'Standard King',
          checkIn: checkInStr,
          checkOut: checkOutStr,
          hotelName: `Hilton ${trip.venue_city}`
        }),
        booking_reference: hotelUrl,
        created_at: new Date()
      });
      
      // 3. Flight component
      const origin = 'DEN'; // Denver airport
      const destination = trip.venue_city === 'New York' ? 'JFK' : 
                         trip.venue_city === 'Los Angeles' ? 'LAX' : 
                         trip.venue_city === 'Chicago' ? 'ORD' : 'ATL';
      
      const flightUrl = getGoogleFlightsUrl(origin, destination, checkInStr, 'United');
      components.push({
        trip_suggestion_id: trip.id,
        component_type: 'flight',
        provider: 'United Airlines',
        price: Math.floor(Math.random() * 300) + 200, // Random price $200-$500
        details: JSON.stringify({
          airline: 'United Airlines',
          flightNumber: `UA${Math.floor(Math.random() * 9999) + 1000}`,
          seatClass: 'Economy',
          origin: origin,
          destination: destination
        }),
        booking_reference: flightUrl,
        created_at: new Date()
      });
      
      // 4. Car rental component
      const carUrl = getCarRentalUrl('Hertz', trip.venue_city, checkInStr, checkOutStr);
      components.push({
        trip_suggestion_id: trip.id,
        component_type: 'car',
        provider: 'Hertz',
        price: Math.floor(Math.random() * 100) + 50, // Random price $50-$150
        details: JSON.stringify({
          carType: 'Economy Sedan',
          pickupLocation: `${destination} Airport`,
          returnLocation: `${destination} Airport`,
          brand: 'Hertz'
        }),
        booking_reference: carUrl,
        created_at: new Date()
      });
      
      // Insert all components
      for (const component of components) {
        await pool.query(`
          INSERT INTO trip_components 
          (trip_suggestion_id, component_type, provider, price, details, booking_reference, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          component.trip_suggestion_id,
          component.component_type,
          component.provider,
          component.price,
          component.details,
          component.booking_reference,
          component.created_at
        ]);
      }
      
      // Update total cost
      const totalCost = components.reduce((sum, comp) => sum + comp.price, 0);
      const serviceFee = Math.max(25, Math.floor(totalCost * 0.05));
      
      await pool.query(`
        UPDATE trip_suggestions 
        SET total_cost = $1, service_fee = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [totalCost, serviceFee, trip.id]);
      
      console.log(`✅ Added ${components.length} components to trip ${trip.id}`);
    }
    
    console.log('✅ Trip components generation complete!');
    
  } catch (error) {
    console.error('❌ Error generating trip components:', error);
  } finally {
    await pool.end();
  }
}

generateTripComponents(); 