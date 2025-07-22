const SeatGeekProvider = require('./services/providers/seatgeekProvider');
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'concert_travel',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

const tripSuggestionId = 601;
const eventId = 28;

async function main() {
  try {
    // Get the SeatGeek event ID from the DB
    const eventRes = await pool.query('SELECT seatgeek_event_id FROM events WHERE id = $1', [eventId]);
    if (!eventRes.rows.length || !eventRes.rows[0].seatgeek_event_id) {
      console.error('No seatgeek_event_id found for event', eventId);
      process.exit(1);
    }
    const seatgeekEventId = eventRes.rows[0].seatgeek_event_id;
    const provider = new SeatGeekProvider();

    // Print the full raw SeatGeek API response for debugging
    const seatgeekUrl = `https://api.seatgeek.com/2/events/${seatgeekEventId}?client_id=${provider.clientId}`;
    const rawResp = await axios.get(seatgeekUrl);
    console.log('\n================ RAW SEATGEEK API RESPONSE ================\n');
    console.log(JSON.stringify(rawResp.data, null, 2));
    console.log('\n==========================================================\n');

    const tickets = await provider.searchTicketsByEventId(seatgeekEventId, 20);
    console.log('SeatGeek API response (parsed tickets):', JSON.stringify(tickets, null, 2));
    if (!tickets.length) {
      console.log('No tickets found.');
      process.exit(0);
    }
    let inserted = 0;
    for (const ticket of tickets) {
      await pool.query(
        `INSERT INTO trip_components (trip_suggestion_id, component_type, provider, price, details, booking_reference, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          tripSuggestionId,
          'ticket',
          'seatgeek',
          ticket.price || null,
          JSON.stringify(ticket),
          ticket.url || null
        ]
      );
      inserted++;
    }
    console.log(`Inserted ${inserted} SeatGeek ticket options into trip_components for trip_suggestion_id ${tripSuggestionId}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main(); 