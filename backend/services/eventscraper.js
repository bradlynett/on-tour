// backend/services/eventScraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const { pool } = require('../config/database');

class EventScraper {
    constructor() {
        this.providers = [
            'ticketmaster',
            'livenation',
            'stubhub',
            'vividseats'
        ];
        
        // User agents to avoid being blocked
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async scrapeTicketmaster() {
        try {
            console.log('🎫 Scraping Ticketmaster...');
            
            // For development, we'll generate mock data
            // In production, you would implement actual scraping logic
            const mockEvents = this.generateMockEvents('ticketmaster', 15);
            
            console.log(`✅ Ticketmaster scraping completed. Found ${mockEvents.length} events`);
            return mockEvents;
        } catch (error) {
            console.error('❌ Ticketmaster scraping failed:', error);
            return [];
        }
    }

    async scrapeLiveNation() {
        try {
            console.log('🎫 Scraping Live Nation...');
            
            // For development, we'll generate mock data
            const mockEvents = this.generateMockEvents('livenation', 12);
            
            console.log(`✅ Live Nation scraping completed. Found ${mockEvents.length} events`);
            return mockEvents;
        } catch (error) {
            console.error('❌ Live Nation scraping failed:', error);
            return [];
        }
    }

    async scrapeStubHub() {
        try {
            console.log('🎫 Scraping StubHub...');
            
            // For development, we'll generate mock data
            const mockEvents = this.generateMockEvents('stubhub', 10);
            
            console.log(`✅ StubHub scraping completed. Found ${mockEvents.length} events`);
            return mockEvents;
        } catch (error) {
            console.error('❌ StubHub scraping failed:', error);
            return [];
        }
    }

    async scrapeVividSeats() {
        try {
            console.log('🎫 Scraping Vivid Seats...');
            
            // For development, we'll generate mock data
            const mockEvents = this.generateMockEvents('vividseats', 8);
            
            console.log(`✅ Vivid Seats scraping completed. Found ${mockEvents.length} events`);
            return mockEvents;
        } catch (error) {
            console.error('❌ Vivid Seats scraping failed:', error);
            return [];
        }
    }

    generateMockEvents(provider, count) {
        const artists = [
            'Taylor Swift', 'Ed Sheeran', 'Beyoncé', 'Drake', 'Bad Bunny',
            'The Weeknd', 'Post Malone', 'Ariana Grande', 'Justin Bieber',
            'Dua Lipa', 'Billie Eilish', 'Travis Scott', 'Kendrick Lamar',
            'Lady Gaga', 'Bruno Mars', 'Coldplay', 'U2', 'The Rolling Stones',
            'Paul McCartney', 'Elton John'
        ];

        const venues = [
            'Madison Square Garden', 'Staples Center', 'United Center',
            'American Airlines Arena', 'Climate Pledge Arena', 'T-Mobile Arena',
            'Mercedes-Benz Stadium', 'SoFi Stadium', 'Allegiant Stadium',
            'MetLife Stadium', 'AT&T Stadium', 'Gillette Stadium',
            'Heinz Field', 'Soldier Field', 'Arrowhead Stadium'
        ];

        const cities = [
            'New York', 'Los Angeles', 'Chicago', 'Miami', 'Seattle',
            'Las Vegas', 'Atlanta', 'Dallas', 'Boston', 'Philadelphia',
            'Pittsburgh', 'Kansas City', 'Denver', 'Phoenix', 'Houston'
        ];

        const states = [
            'NY', 'CA', 'IL', 'FL', 'WA', 'NV', 'GA', 'TX', 'MA', 'PA',
            'MO', 'CO', 'AZ', 'OH', 'MI'
        ];

        const events = [];
        const now = new Date();
        
        for (let i = 0; i < count; i++) {
            const artist = artists[Math.floor(Math.random() * artists.length)];
            const venue = venues[Math.floor(Math.random() * venues.length)];
            const city = cities[Math.floor(Math.random() * cities.length)];
            const state = states[Math.floor(Math.random() * states.length)];
            
            // Generate random date between now and 1 year from now
            const eventDate = new Date(now.getTime() + Math.random() * 365 * 24 * 60 * 60 * 1000);
            
            // Generate random prices
            const minPrice = Math.floor(Math.random() * 200) + 50;
            const maxPrice = minPrice + Math.floor(Math.random() * 300) + 100;
            
            events.push({
                externalId: `${provider}_${Date.now()}_${i}`,
                name: `${artist} Live in Concert`,
                artist: artist,
                venueName: venue,
                venueCity: city,
                venueState: state,
                eventDate: eventDate.toISOString(),
                ticketUrl: `https://www.${provider}.com/event/${Date.now()}_${i}`,
                minPrice: minPrice,
                maxPrice: maxPrice
            });
        }
        
        return events;
    }

    async scrapeAllProviders() {
        const allEvents = [];
        
        for (const provider of this.providers) {
            try {
                console.log(`🎫 Starting ${provider} scraping...`);
                const events = await this[`scrape${provider.charAt(0).toUpperCase() + provider.slice(1)}`]();
                allEvents.push(...events);
                
                // Add delay between providers to be respectful
                await this.delay(1000 + Math.random() * 2000);
            } catch (error) {
                console.error(`❌ Failed to scrape ${provider}:`, error);
            }
        }
        
        console.log(`🎉 Total events scraped: ${allEvents.length}`);
        return allEvents;
    }

    async saveEvents(events) {
        console.log(`💾 Saving ${events.length} events to database...`);
        
        let savedCount = 0;
        let updatedCount = 0;
        
        for (const event of events) {
            try {
                const result = await pool.query(`
                    INSERT INTO events 
                    (external_id, name, artist, venue_name, venue_city, venue_state, 
                     event_date, ticket_url, min_price, max_price)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (external_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        artist = EXCLUDED.artist,
                        venue_name = EXCLUDED.venue_name,
                        venue_city = EXCLUDED.venue_city,
                        venue_state = EXCLUDED.venue_state,
                        event_date = EXCLUDED.event_date,
                        ticket_url = EXCLUDED.ticket_url,
                        min_price = EXCLUDED.min_price,
                        max_price = EXCLUDED.max_price
                    RETURNING id
                `, [
                    event.externalId, 
                    event.name, 
                    event.artist, 
                    event.venueName,
                    event.venueCity, 
                    event.venueState, 
                    event.eventDate,
                    event.ticketUrl, 
                    event.minPrice, 
                    event.maxPrice
                ]);
                
                if (result.rows[0]) {
                    savedCount++;
                } else {
                    updatedCount++;
                }
            } catch (error) {
                console.error('❌ Failed to save event:', error);
            }
        }
        
        console.log(`✅ Database update completed: ${savedCount} new events, ${updatedCount} updated events`);
        return { savedCount, updatedCount };
    }

    // Helper method to add delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Method to scrape specific artist events
    async scrapeArtistEvents(artistName) {
        try {
            console.log(`🎫 Scraping events for artist: ${artistName}`);
            
            // This would implement actual scraping logic for a specific artist
            // For now, we'll generate mock events for the artist
            const mockEvents = this.generateMockEvents('artist_search', 5);
            
            // Filter to only include the specific artist
            const artistEvents = mockEvents.filter(event => 
                event.artist.toLowerCase().includes(artistName.toLowerCase())
            );
            
            console.log(`✅ Found ${artistEvents.length} events for ${artistName}`);
            return artistEvents;
        } catch (error) {
            console.error(`❌ Failed to scrape events for ${artistName}:`, error);
            return [];
        }
    }

    // Method to scrape events by location
    async scrapeLocationEvents(city, state) {
        try {
            console.log(`🎫 Scraping events in ${city}, ${state}`);
            
            // This would implement actual scraping logic for a specific location
            const mockEvents = this.generateMockEvents('location_search', 8);
            
            // Filter to only include events in the specified location
            const locationEvents = mockEvents.filter(event => 
                event.venueCity.toLowerCase().includes(city.toLowerCase()) &&
                event.venueState.toLowerCase().includes(state.toLowerCase())
            );
            
            console.log(`✅ Found ${locationEvents.length} events in ${city}, ${state}`);
            return locationEvents;
        } catch (error) {
            console.error(`❌ Failed to scrape events in ${city}, ${state}:`, error);
            return [];
        }
    }

    // Method to get scraping statistics
    async getScrapingStats() {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total_events,
                    COUNT(CASE WHEN event_date >= CURRENT_DATE THEN 1 END) as upcoming_events,
                    COUNT(CASE WHEN event_date < CURRENT_DATE THEN 1 END) as past_events,
                    MIN(event_date) as earliest_event,
                    MAX(event_date) as latest_event,
                    AVG(min_price) as avg_min_price,
                    AVG(max_price) as avg_max_price
                FROM events
            `);
            
            return result.rows[0];
        } catch (error) {
            console.error('❌ Failed to get scraping stats:', error);
            return null;
        }
    }
}

module.exports = EventScraper;