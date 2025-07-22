// TicketmasterProvider.js
// Placeholder implementation for Ticketmaster ticket provider
// Replace with real API integration as needed

const axios = require('axios');

class TicketmasterProvider {
    constructor() {
        this.providerName = 'ticketmaster';
        this.apiKey = process.env.TICKETMASTER_API_KEY || null;
        this.baseUrl = 'https://app.ticketmaster.com/discovery/v2';
    }

    // Check if provider is available (API key present)
    async isAvailable() {
        return !!this.apiKey;
    }

    // Search for tickets using the Ticketmaster Discovery API
    async searchTickets(eventId, eventName, venueName, eventDate, maxResults = 10) {
        if (!this.apiKey) return [];
        try {
            let url = `${this.baseUrl}/events.json`;
            let params = {
                apikey: this.apiKey,
                size: maxResults
            };
            if (eventId) {
                url = `${this.baseUrl}/events/${eventId}.json`;
            } else {
                if (eventName) params.keyword = eventName;
                if (venueName) params.venue = venueName;
                if (eventDate) {
                    // Format as YYYY-MM-DDT00:00:00Z (try only startDateTime)
                    let datePart = eventDate.split('T')[0];
                    params.startDateTime = `${datePart}T00:00:00Z`;
                    // params.endDateTime = `${datePart}T23:59:59Z`; // Commented out for test
                }
            }
            // Log the full request URL and params
            const queryString = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
            console.log(`[TicketmasterProvider] Requesting: ${url}?${queryString}`);
            console.log(`[TicketmasterProvider] Params:`, params);
            const response = await axios.get(url, { params });
            let events = [];
            if (eventId && response.data) {
                events = [response.data];
            } else if (response.data && response.data._embedded && response.data._embedded.events) {
                events = response.data._embedded.events;
            }
            const ticketOptions = [];
            for (const event of events) {
                if (event.priceRanges && event.priceRanges.length > 0) {
                    for (const price of event.priceRanges) {
                        ticketOptions.push({
                            provider: this.providerName,
                            price: price.min,
                            maxPrice: price.max,
                            currency: price.currency || 'USD',
                            url: event.url,
                            section: null,
                            row: null,
                            seat: null,
                            delivery: null,
                            details: event.info || event.pleaseNote || null
                        });
                    }
                } else {
                    ticketOptions.push({
                        provider: this.providerName,
                        price: null,
                        maxPrice: null,
                        currency: 'USD',
                        url: event.url,
                        section: null,
                        row: null,
                        seat: null,
                        delivery: null,
                        details: event.info || event.pleaseNote || null
                    });
                }
            }
            return ticketOptions;
        } catch (error) {
            // Enhanced error logging
            console.error('[TicketmasterProvider] searchTickets error:', error);
            if (error.response) {
                console.error('[TicketmasterProvider] API response data:', error.response.data);
            }
            if (process.env.NODE_ENV === 'development') {
                return [{ provider: this.providerName, error: error.message, apiResponse: error.response?.data }];
            }
            return [];
        }
    }

    async searchTicketsByEventId(eventId, maxResults = 10) {
        if (!this.apiKey) return [];
        try {
            const url = `${this.baseUrl}/events/${eventId}.json?apikey=${this.apiKey}`;
            const resp = await axios.get(url);
            let event = resp.data;
            if (!event) return [];
            const ticketOptions = [];
            if (event.priceRanges && event.priceRanges.length > 0) {
                for (const price of event.priceRanges) {
                    ticketOptions.push({
                        provider: this.providerName,
                        price: price.min,
                        maxPrice: price.max,
                        currency: price.currency || 'USD',
                        url: event.url,
                        section: null,
                        row: null,
                        seat: null,
                        delivery: null,
                        details: price
                    });
                }
            } else {
                ticketOptions.push({
                    provider: this.providerName,
                    price: null,
                    maxPrice: null,
                    currency: 'USD',
                    url: event.url,
                    section: null,
                    row: null,
                    seat: null,
                    delivery: null,
                    details: event.info || event.pleaseNote || null
                });
            }
            return ticketOptions.slice(0, maxResults);
        } catch (err) {
            console.error(`[TicketmasterProvider] searchTicketsByEventId error:`, err.message);
            return [];
        }
    }

    async healthCheck() {
        if (!this.apiKey) {
            return { status: 'unavailable', reason: 'Missing API key' };
        }
        return { status: 'ok' };
    }
}

module.exports = TicketmasterProvider; 