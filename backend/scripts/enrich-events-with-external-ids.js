// Script: enrich-events-with-external-ids.js
// Purpose: Populate seatgeek_event_id and ticketmaster_event_id for all events in the database

const { pool } = require('../config/database');
const axios = require('axios');
const logger = require('../utils/logger');

const SEATGEEK_CLIENT_ID = process.env.SEATGEEK_CLIENT_ID;
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;

if (!SEATGEEK_CLIENT_ID || !TICKETMASTER_API_KEY) {
  console.error('Missing SeatGeek or Ticketmaster API credentials in environment.');
  process.exit(1);
}

async function getAllEvents() {
  const res = await pool.query('SELECT id, name, artist, event_date, venue_name, venue_city, venue_state FROM events');
  return res.rows;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeAxiosGet(url, retries = 1, delayMs = 2000, retryDelayMs = 120000) { // 2 min retry delay
  try {
    await sleep(delayMs); // Wait before every request
    return await axios.get(url, {
      headers: {
        'User-Agent': 'ConcertTravelApp/1.0 (contact: youremail@example.com)'
      }
    });
  } catch (err) {
    if (err.response && err.response.status === 429 && retries > 0) {
      console.warn(`[RateLimit] 429 received. Waiting ${retryDelayMs / 1000}s before retrying...`);
      await sleep(retryDelayMs);
      return safeAxiosGet(url, retries - 1, delayMs, retryDelayMs);
    }
    throw err;
  }
}

async function findSeatGeekVenueId(venueName, city, state) {
  try {
    const venueQ = encodeURIComponent(venueName);
    let url = `https://api.seatgeek.com/2/venues?q=${venueQ}`;
    if (city) url += `&city=${encodeURIComponent(city)}`;
    if (state) url += `&state=${encodeURIComponent(state)}`;
    url += `&client_id=${SEATGEEK_CLIENT_ID}`;
    console.log(`[SeatGeek] Venue lookup URL: ${url}`);
    const resp = await safeAxiosGet(url);
    if (resp.data.venues && resp.data.venues.length > 0) {
      let match = resp.data.venues.find(v =>
        v.name && v.name.toLowerCase().includes(venueName.toLowerCase()) &&
        (!city || (v.city && v.city.toLowerCase() === city.toLowerCase())) &&
        (!state || (v.state && v.state.toLowerCase() === state.toLowerCase()))
      );
      if (!match) match = resp.data.venues[0];
      console.log(`[SeatGeek] Matched venue ID: ${match.id}`);
      return match.id;
    }
    console.warn(`[SeatGeek] No venue found for ${venueName}, ${city}, ${state}`);
    return null;
  } catch (err) {
    console.error(`[SeatGeek] Venue lookup failed: ${err.message}`);
    return null;
  }
}

async function findSeatGeekEventId(event) {
  try {
    const date = event.event_date.toISOString().split('T')[0];
    const venueId = await findSeatGeekVenueId(event.venue_name, event.venue_city, event.venue_state);
    if (!venueId) {
      console.warn(`[SeatGeek] Skipping event ${event.id} - no venue ID found.`);
      return null;
    }
    let url = `https://api.seatgeek.com/2/events?venue.id=${venueId}&datetime_utc=${date}&client_id=${SEATGEEK_CLIENT_ID}`;
    if (event.artist) url += `&q=${encodeURIComponent(event.artist)}`;
    console.log(`[SeatGeek] Event lookup URL: ${url}`);
    const resp = await safeAxiosGet(url);
    if (resp.data.events && resp.data.events.length > 0) {
      let match = resp.data.events.find(e => {
        const eventDate = e.datetime_utc ? e.datetime_utc.split('T')[0] : '';
        return eventDate === date && e.performers && e.performers.some(p => p.name && event.artist && p.name.toLowerCase().includes(event.artist.toLowerCase()));
      });
      if (!match) {
        match = resp.data.events.find(e => {
          const eventDate = e.datetime_utc ? e.datetime_utc.split('T')[0] : '';
          return eventDate === date;
        });
      }
      if (!match) {
        match = resp.data.events[0];
      }
      if (match && match.id) {
        console.log(`[SeatGeek] Matched event ID: ${match.id}`);
        return match.id;
      }
    }
    console.warn(`[SeatGeek] No event found for venue ID ${venueId} and date ${date}`);
    return null;
  } catch (err) {
    console.error(`[SeatGeek] Event lookup failed for event ${event.id}: ${err.message}`);
    return null;
  }
}

async function findTicketmasterEventId(event) {
  try {
    const keyword = encodeURIComponent(`${event.artist || ''} ${event.name}`.trim());
    const date = event.event_date.toISOString().split('T')[0];
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&keyword=${keyword}&venue=${encodeURIComponent(event.venue_name || '')}&city=${encodeURIComponent(event.venue_city || '')}&stateCode=${encodeURIComponent(event.venue_state || '')}&startDateTime=${date}T00:00:00Z&endDateTime=${date}T23:59:59Z`;
    console.log(`[Ticketmaster] Event lookup URL: ${url}`);
    const resp = await safeAxiosGet(url);
    if (resp.data._embedded && resp.data._embedded.events && resp.data._embedded.events.length > 0) {
      let match = resp.data._embedded.events.find(e => {
        const eventDate = e.dates && e.dates.start && e.dates.start.localDate;
        return eventDate === date && e._embedded && e._embedded.venues && e._embedded.venues[0].name && e._embedded.venues[0].name.toLowerCase().includes((event.venue_name || '').toLowerCase());
      });
      if (!match) {
        match = resp.data._embedded.events.find(e => {
          const eventDate = e.dates && e.dates.start && e.dates.start.localDate;
          return eventDate === date;
        });
      }
      if (!match) {
        match = resp.data._embedded.events[0];
      }
      if (match && match.id) {
        console.log(`[Ticketmaster] Matched event ID: ${match.id}`);
        return match.id;
      }
    }
    console.warn(`[Ticketmaster] No event found for date ${date}`);
    return null;
  } catch (err) {
    console.error(`[Ticketmaster] Event lookup failed for event ${event.id}: ${err.message}`);
    return null;
  }
}

async function updateEventIds(eventId, seatgeekId, ticketmasterId) {
  await pool.query(
    'UPDATE events SET seatgeek_event_id = $1, ticketmaster_event_id = $2 WHERE id = $3',
    [seatgeekId, ticketmasterId, eventId]
  );
}

async function main() {
  // Only process event 332 for testing
  const allEvents = await getAllEvents();
  const events = allEvents.filter(e => e.id === 332);
  console.log(`Enriching ${events.length} event(s) with external IDs...`);
  for (const event of events) {
    console.warn(`Processing event ${event.id}: ${event.artist} - ${event.name}`);
    const seatgeekId = await findSeatGeekEventId(event);
    const ticketmasterId = await findTicketmasterEventId(event);
    await updateEventIds(event.id, seatgeekId, ticketmasterId);
    console.warn(`Updated event ${event.id} with SeatGeek ID: ${seatgeekId}, Ticketmaster ID: ${ticketmasterId}`);
    await sleep(10000); // Wait 10 seconds before next event
  }
  console.log('Event enrichment complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Enrichment script failed:', err);
  process.exit(1);
}); 