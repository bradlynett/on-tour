// backend/services/tripSuggestionEngine.js
const { pool } = require('../config/database');
const ArtistMetadataService = require('./artistMetadataService');
const unifiedMetadataService = require('./unifiedMetadataService');
const amadeusService = require('./amadeusService');
const enhancedUnifiedTravelService = require('./enhancedUnifiedTravelService');
const { redisClient } = require('../redisClient');
const eventService = require('./eventService'); // Ticketmaster integration
const winston = require('winston');
const logger = winston;
const {
  getTicketmasterEventUrl,
  getBookingComHotelUrl,
  getHotelBrandDirectUrl,
  getGoogleFlightsUrl,
  getCarRentalUrl
} = require('./deepLinkHelpers');
const averageHotelPrices = require('./averageHotelPrices.json');
const averageFlightPrices = require('./averageFlightPrices.json');

class TripSuggestionEngine {
    constructor() {
        this.serviceFeeRate = 0.05; // 5% service fee
        this.minServiceFee = 25; // $25 minimum
        
        // Cache configuration
        this.cacheConfig = {
            userInterests: { ttl: 300 }, // 5 minutes
            eventQueries: { ttl: 600 }, // 10 minutes
            tripSuggestions: { ttl: 300 }, // 5 minutes
            artistMetadata: { ttl: 3600 }, // 1 hour
            userPreferences: { ttl: 1800 }, // 30 minutes
            userBehavior: { ttl: 1800 }, // 30 minutes
            marketTrends: { ttl: 3600 }, // 1 hour
            seasonalFactors: { ttl: 86400 } // 24 hours
        };

        // Advanced scoring weights
        this.scoringWeights = {
            artistMatch: 0.25,
            locationProximity: 0.20,
            dateProximity: 0.15,
            priceValue: 0.15,
            popularity: 0.10,
            metadataQuality: 0.05,
            seasonalFactor: 0.05,
            userBehavior: 0.05
        };

        // Seasonal factors for different months
        this.seasonalFactors = {
            1: 0.8,   // January - post-holiday lull
            2: 0.7,   // February - winter
            3: 0.9,   // March - spring break
            4: 1.0,   // April - spring
            5: 1.1,   // May - graduation season
            6: 1.2,   // June - summer start
            7: 1.3,   // July - peak summer
            8: 1.2,   // August - summer
            9: 1.0,   // September - back to school
            10: 1.1,  // October - fall
            11: 0.9,  // November - pre-holiday
            12: 1.4   // December - holiday season
        };

        // Similarity weights for feedback
        this.similarityWeights = {
            event: 0.35,
            artist: 0.35,
            venue: 0.1,
            city: 0.1,
            genre: 0.1
        };
    }

    // Cache utility methods
    async getCache(key) {
        try {
            const cached = await redisClient.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.warn('Cache get error:', error);
            return null;
        }
    }

    async setCache(key, data, ttl = 300) {
        try {
            console.log(`[TripEngine] Setting cache for key: ${key} (count: ${Array.isArray(data) ? data.length : 'n/a'}) TTL: ${ttl}`);
            await redisClient.set(key, JSON.stringify(data), { EX: ttl });
        } catch (error) {
            console.warn('[TripEngine] Cache set error:', error);
        }
    }

    async invalidateCache(pattern) {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
                console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
            }
        } catch (error) {
            console.warn('Cache invalidation error:', error);
        }
    }

    // Generate cache keys
    getUserInterestsKey(userId) {
        return `user:${userId}:interests`;
    }

    getEventQueryKey(interestType, interestValue, limit = 20) {
        return `events:${interestType}:${interestValue}:${limit}`;
    }

    getTripSuggestionsKey(userId, limit = 5) {
        const key = `trips:${userId}:${limit}`;
        console.log(`[TripEngine] getTripSuggestionsKey: ${key}`);
        return key;
    }

    getUserPreferencesKey(userId) {
        return `user:${userId}:preferences`;
    }

    getArtistMetadataKey(artistName) {
        return `artist:${artistName.toLowerCase()}:metadata`;
    }

    // Utility function to convert snake_case to camelCase
    toCamelCase(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => this.toCamelCase(item));
        }
        if (obj instanceof Date) {
            return obj.toISOString();
        }
        if (obj !== null && typeof obj === 'object') {
            const camelCaseObj = {};
            for (const [key, value] of Object.entries(obj)) {
                const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
                camelCaseObj[camelKey] = this.toCamelCase(value);
            }
            return camelCaseObj;
        }
        return obj;
    }

    async findMatchingEvents(userId) {
        try {
            console.log(`🎯 Finding matching events for user ${userId}`);
            
            // Try to get user interests from cache first
            const interestsCacheKey = this.getUserInterestsKey(userId);
            let interests = await this.getCache(interestsCacheKey);
            
            if (!interests) {
                // Get user interests from database
                const interestsResult = await pool.query(`
                    SELECT interest_type, interest_value, priority
                    FROM user_interests 
                    WHERE user_id = $1
                    ORDER BY priority ASC
                `, [userId]);

                interests = interestsResult.rows;
                
                // Cache the interests
                await this.setCache(interestsCacheKey, interests, this.cacheConfig.userInterests.ttl);
            }

            if (interests.length === 0) {
                console.log('No interests found for user');
                return { events: [], interests: [], preferences: {}, requirePreferredAirport: false };
            }

            // Try to get user preferences from cache first
            const preferencesCacheKey = this.getUserPreferencesKey(userId);
            let userInfo = await this.getCache(preferencesCacheKey);
            
            if (!userInfo) {
                // Get user location and travel preferences from database
                const userInfoResult = await pool.query(`
                    SELECT 
                        u.city as home_city, 
                        u.state as home_state,
                        tp.primary_airport, 
                        tp.preferred_airlines, 
                        tp.flight_class, 
                        tp.preferred_hotel_brands, 
                        tp.rental_car_preference,
                        tp.preferred_destinations
                    FROM users u
                    LEFT JOIN travel_preferences tp ON u.id = tp.user_id
                    WHERE u.id = $1
                `, [userId]);

                userInfo = userInfoResult.rows[0] || {};
                
                // Cache the preferences
                await this.setCache(preferencesCacheKey, userInfo, this.cacheConfig.userPreferences.ttl);
            }

            let requirePreferredAirport = false;
            // If no preferred airport, try to set it to nearest major airport
            if (!userInfo.primary_airport && userInfo.home_city && userInfo.home_state) {
                const nearestAirport = await this.getNearestAirport(userInfo.home_city, userInfo.home_state);
                if (nearestAirport) {
                    // Save to DB
                    await pool.query(
                        `INSERT INTO travel_preferences (user_id, primary_airport) VALUES ($1, $2)
                         ON CONFLICT (user_id) DO UPDATE SET primary_airport = EXCLUDED.primary_airport`,
                        [userId, nearestAirport]
                    );
                    userInfo.primary_airport = nearestAirport;
                } else {
                    requirePreferredAirport = true;
                }
            } else if (!userInfo.primary_airport) {
                requirePreferredAirport = true;
            }

            let preferredDestinations = [];

            // Safely parse preferred_destinations, handling NULL values
            if (userInfo.preferred_destinations && userInfo.preferred_destinations !== null) {
                try {
                    preferredDestinations = JSON.parse(userInfo.preferred_destinations);
                } catch (error) {
                    console.warn('Failed to parse preferred_destinations, using empty array:', error.message);
                    preferredDestinations = [];
                }
            }

            // Find matching events with enhanced metadata and caching
            const matchingEvents = await this.findEventsByInterestsWithMetadata(interests);
            
            // Apply enhanced prioritization with metadata
            const prioritizedEvents = await this.prioritizeEventsWithMetadata(
                matchingEvents, 
                userInfo, 
                preferredDestinations,
                interests
            );
            
            console.log(`Found ${prioritizedEvents.length} prioritized events for user`);
            return {
                events: prioritizedEvents,
                interests: interests,
                preferences: userInfo,
                requirePreferredAirport
            };
        } catch (error) {
            console.error('❌ Failed to find matching events:', error);
            return { events: [], interests: [], preferences: {}, requirePreferredAirport: false };
        }
    }

        async findEventsByInterestsWithMetadata(interests) {
        const matchingEvents = [];
        const seenEventIds = new Set();
        
        // Filter to supported interest types, now including event_type and event_subtype
        const supportedInterests = interests.filter(interest => 
            ['artist', 'venue', 'city', 'genre', 'event_type', 'event_subtype'].includes(interest.interest_type)
        );

        // Build a set of explicit user interest artists (case-insensitive)
        const userArtistInterests = new Set(
            interests.filter(i => i.interest_type === 'artist').map(i => (i.interest_value || '').toLowerCase())
        );

        for (const interest of supportedInterests) {
            // Try to get cached events first
            const eventCacheKey = this.getEventQueryKey(interest.interest_type, interest.interest_value);
            let cachedEvents = await this.getCache(eventCacheKey);
            
            if (!cachedEvents) {
                let query = `
                    SELECT id, external_id, name, artist, venue_name, venue_city, venue_state, 
                           event_date, ticket_url, min_price, max_price, event_type, event_subtype, created_at
                    FROM events 
                    WHERE event_date >= CURRENT_DATE
                `;
                const params = [];

                switch (interest.interest_type) {
                    case 'artist': {
                        const artistMatches = await this.generateArtistMatchPatterns(interest.interest_value, interest.priority);
                        if (artistMatches.patterns.length > 0) {
                            const orConditions = artistMatches.patterns.map((_, idx) => 
                                `LOWER(artist) LIKE LOWER($${idx + 1})`
                            ).join(' OR ');
                            artistMatches.patterns.forEach(p => params.push(`%${p}%`));
                            query += ` AND (${orConditions})`;
                        } else {
                            continue;
                        }
                        break;
                    }
                    case 'venue':
                        params.push(`%${interest.interest_value}%`);
                        query += ` AND LOWER(venue_name) LIKE LOWER($${params.length})`;
                        break;
                    case 'city':
                        params.push(`%${interest.interest_value}%`);
                        query += ` AND LOWER(venue_city) LIKE LOWER($${params.length})`;
                        break;
                    case 'genre':
                        const genreEvents = await this.findEventsByGenre(interest.interest_value, interest.priority);
                        genreEvents.forEach(event => {
                            if (!seenEventIds.has(event.id)) {
                                seenEventIds.add(event.id);
                                event.matchScore = this.calculateGenreMatchScore(
                                    interest.interest_value,
                                    event.artist,
                                    interest.priority
                                );
                                matchingEvents.push(event);
                            }
                        });
                        continue;
                    case 'event_type':
                        params.push(interest.interest_value);
                        query += ` AND event_type = $${params.length}`;
                        break;
                    case 'event_subtype':
                        params.push(interest.interest_value);
                        query += ` AND event_subtype = $${params.length}`;
                        break;
                }

                query += ` ORDER BY event_date ASC LIMIT 20`;

                try {
                    const result = await pool.query(query, params);
                    cachedEvents = result.rows;
                    
                    // Cache the events
                    await this.setCache(eventCacheKey, cachedEvents, this.cacheConfig.eventQueries.ttl);
                } catch (error) {
                    console.error(`Error finding events for interest ${interest.interest_value}:`, error);
                    continue;
                }
            }

            // Process cached events
            for (const event of cachedEvents) {
                if (!seenEventIds.has(event.id)) {
                    seenEventIds.add(event.id);
                    if (interest.interest_type === 'artist') {
                        event.matchScore = await this.calculateArtistMatchScoreWithMetadata(
                            interest.interest_value, 
                            event.artist, 
                            interest.priority
                        );
                        event.artistMetadata = await this.getArtistMetadataForEvent(event.artist);
                    }
                    // Tribute band filtering: exclude unless in user interests
                    const artistName = (event.artist || '').toLowerCase();
                    const artistMeta = event.artistMetadata;
                    if (
                        this.isTributeBand(event.artist, artistMeta) &&
                        !userArtistInterests.has(artistName)
                    ) {
                        continue; // skip this event
                    }
                    // Add event_type/subtype match scoring
                    if (interest.interest_type === 'event_type' && event.event_type === interest.interest_value) {
                        event.matchScore = (event.matchScore || 0) + 50 * interest.priority;
                    }
                    if (interest.interest_type === 'event_subtype' && event.event_subtype === interest.interest_value) {
                        event.matchScore = (event.matchScore || 0) + 40 * interest.priority;
                    }
                    matchingEvents.push(event);
                }
            }
        }

        // Enhanced sorting with metadata consideration
        matchingEvents.sort((a, b) => {
            // Primary sort by match score
            if (a.matchScore && b.matchScore) {
                if (b.matchScore !== a.matchScore) {
                    return b.matchScore - a.matchScore;
                }
            }
            
            // Secondary sort by event date (earlier events first)
            const dateA = new Date(a.event_date);
            const dateB = new Date(b.event_date);
            return dateA - dateB;
        });

        return matchingEvents;
    }

    // Enhanced method that includes metadata capabilities
    async findEventsByInterests(interests) {
        return this.findEventsByInterestsWithMetadata(interests);
    }

    // Generate intelligent artist match patterns
    async generateArtistMatchPatterns(artistName, priority = 1) {
        const patterns = [];
        const cleanName = this.cleanArtistName(artistName);
        
        // Artist aliases and common variations
        const aliases = await this.getArtistAliases(cleanName);
        
        // Base patterns
        patterns.push(cleanName);
        patterns.push(artistName); // Original name
        
        // Add aliases
        aliases.forEach(alias => {
            if (!patterns.includes(alias)) {
                patterns.push(alias);
            }
        });
        
        // Generate variations
        const variations = this.generateArtistVariations(cleanName);
        variations.forEach(variation => {
            if (!patterns.includes(variation)) {
                patterns.push(variation);
            }
        });
        
        // Handle special characters and formatting
        const specialVariations = this.generateSpecialCharacterVariations(cleanName);
        specialVariations.forEach(variation => {
            if (!patterns.includes(variation)) {
                patterns.push(variation);
            }
        });
        
        // Handle collaborative artists
        const collaborativeVariations = this.generateCollaborativeVariations(cleanName);
        collaborativeVariations.forEach(variation => {
            if (!patterns.includes(variation)) {
                patterns.push(variation);
            }
        });
        
        // Remove duplicates and filter out empty patterns
        const uniquePatterns = [...new Set(patterns)].filter(p => p && p.trim().length > 0);
        
        console.log(`🎵 Generated ${uniquePatterns.length} patterns for artist "${artistName}":`, uniquePatterns);
        
        return {
            patterns: uniquePatterns,
            aliases: aliases,
            priority: priority
        };
    }

    // Generate variations for collaborative artists
    generateCollaborativeVariations(artistName) {
        const variations = [];
        const name = artistName.toLowerCase().trim();
        
        // Handle "feat.", "featuring", "ft.", "with" variations
        const collaborationPatterns = [
            { pattern: /feat\.?\s+/gi, replacement: 'featuring ' },
            { pattern: /featuring\s+/gi, replacement: 'feat ' },
            { pattern: /ft\.?\s+/gi, replacement: 'featuring ' },
            { pattern: /with\s+/gi, replacement: 'featuring ' },
            { pattern: /&\s+/gi, replacement: 'and ' },
            { pattern: /\s+&\s+/gi, replacement: ' and ' }
        ];
        
        collaborationPatterns.forEach(({ pattern, replacement }) => {
            if (pattern.test(name)) {
                variations.push(name.replace(pattern, replacement));
            }
        });
        
        // Handle "vs" and "versus" variations
        if (name.includes(' vs ')) {
            variations.push(name.replace(/ vs /g, ' versus '));
        }
        if (name.includes(' versus ')) {
            variations.push(name.replace(/ versus /g, ' vs '));
        }
        
        // Handle "x" as collaboration symbol
        if (name.includes(' x ')) {
            variations.push(name.replace(/ x /g, ' and '));
            variations.push(name.replace(/ x /g, ' featuring '));
        }
        
        return variations;
    }

    // Get artist aliases from a mapping system
    async getArtistAliases(artistName) {
        const aliases = [];
        
        // Get aliases from database
        const dbAliases = await this.getArtistAliasesFromDB(artistName);
        aliases.push(...dbAliases);
        
        // Get hardcoded aliases
        const hardcodedAliases = await this.getHardcodedArtistAliases(artistName);
        aliases.push(...hardcodedAliases);
        
        // Remove duplicates
        return [...new Set(aliases)];
    }

    // Separate method for hardcoded aliases
    async getHardcodedArtistAliases(artistName) {
        const aliasMap = {
            // Common artist aliases and variations
            'taylor swift': ['taylor alison swift', 'tswift', 'tay'],
            'ed sheeran': ['edward christopher sheeran', 'ed'],
            'beyonce': ['beyoncé', 'beyonce knowles', 'beyoncé knowles-carter'],
            'drake': ['aubrey drake graham', 'drizzy', 'champagne papi'],
            'post malone': ['austin richard post', 'posty'],
            'ariana grande': ['ariana grande-butera'],
            'bruno mars': ['peter gene hernandez', 'bruno'],
            'justin bieber': ['justin drew bieber', 'biebs'],
            'lady gaga': ['stefani joanne angelina germanotta', 'gaga'],
            'kendrick lamar': ['kendrick lamar duckworth', 'k dot'],
            'the weeknd': ['abel makkonen tesfaye', 'weeknd'],
            'billie eilish': ['billie eilish pirate baird o\'connell'],
            'dua lipa': ['dua lipa'],
            'olivia rodrigo': ['olivia rodrigo'],
            'harry styles': ['harry edward styles'],
            'bad bunny': ['benito antonio martínez ocasio'],
            'morgan wallen': ['morgan cole wallen'],
            'luke combs': ['luke albert combs'],
            'zach bryan': ['zachary lane bryan'],
            // Add more artist aliases as needed
        };
        
        const normalizedName = artistName.toLowerCase().trim();
        return aliasMap[normalizedName] || [];
    }

    // Generate common artist name variations
    generateArtistVariations(artistName) {
        const variations = [];
        const name = artistName.toLowerCase().trim();
        
        // Handle "The" prefix variations
        if (name.startsWith('the ')) {
            variations.push(name.substring(4)); // Remove "the "
            variations.push(name); // Keep original
        } else {
            variations.push('the ' + name); // Add "the "
            variations.push(name); // Keep original
        }
        
        // Handle "&" vs "and" variations
        if (name.includes(' & ')) {
            variations.push(name.replace(/ & /g, ' and '));
        }
        if (name.includes(' and ')) {
            variations.push(name.replace(/ and /g, ' & '));
        }
        
        // Handle common abbreviations
        const abbreviationMap = {
            'featuring': 'feat',
            'feat': 'featuring',
            'versus': 'vs',
            'vs': 'versus',
            'street': 'st',
            'avenue': 'ave',
            'boulevard': 'blvd'
        };
        
        Object.entries(abbreviationMap).forEach(([full, abbrev]) => {
            if (name.includes(full)) {
                variations.push(name.replace(new RegExp(full, 'g'), abbrev));
            }
            if (name.includes(abbrev)) {
                variations.push(name.replace(new RegExp(abbrev, 'g'), full));
            }
        });
        
        return variations;
    }

    // Generate variations with special characters
    generateSpecialCharacterVariations(artistName) {
        const variations = [];
        const name = artistName.toLowerCase().trim();
        
        // Handle accented characters
        const accentMap = {
            'é': 'e',
            'è': 'e',
            'ê': 'e',
            'ë': 'e',
            'á': 'a',
            'à': 'a',
            'â': 'a',
            'ã': 'a',
            'ä': 'a',
            'í': 'i',
            'ì': 'i',
            'î': 'i',
            'ï': 'i',
            'ó': 'o',
            'ò': 'o',
            'ô': 'o',
            'õ': 'o',
            'ö': 'o',
            'ú': 'u',
            'ù': 'u',
            'û': 'u',
            'ü': 'u',
            'ñ': 'n',
            'ç': 'c'
        };
        
        // Create version with accents removed
        let withoutAccents = name;
        Object.entries(accentMap).forEach(([accent, plain]) => {
            withoutAccents = withoutAccents.replace(new RegExp(accent, 'g'), plain);
        });
        if (withoutAccents !== name) {
            variations.push(withoutAccents);
        }
        
        // Handle special punctuation
        const punctuationMap = {
            '.': '',
            ',': '',
            '!': '',
            '?': '',
            '-': ' ',
            '_': ' ',
            '(': '',
            ')': '',
            '[': '',
            ']': '',
            '{': '',
            '}': ''
        };
        
        let withoutPunctuation = name;
        Object.entries(punctuationMap).forEach(([punct, replacement]) => {
            withoutPunctuation = withoutPunctuation.replace(new RegExp('\\' + punct, 'g'), replacement);
        });
        if (withoutPunctuation !== name) {
            variations.push(withoutPunctuation.trim());
        }
        
        return variations;
    }

    // Enhanced match scoring with fuzzy matching and metadata
    calculateArtistMatchScore(interestValue, eventArtist, priority = 1) {
        if (!eventArtist) return 0;
        
        const interest = interestValue.toLowerCase().trim();
        const artist = eventArtist.toLowerCase().trim();
        
        let score = 0;
        
        // Exact match gets highest score
        if (artist === interest) {
            score += 100;
        }
        // Contains the full interest name
        else if (artist.includes(interest)) {
            score += 80;
        }
        // Interest contains the artist name (partial match)
        else if (interest.includes(artist)) {
            score += 60;
        }
        // Word-by-word matching with fuzzy logic
        else {
            const interestWords = interest.split(/\s+/);
            const artistWords = artist.split(/\s+/);
            
            let wordMatches = 0;
            let fuzzyMatches = 0;
            
            interestWords.forEach(word => {
                // Exact word match
                if (artistWords.some(artistWord => artistWord === word)) {
                    wordMatches++;
                }
                // Contains word match
                else if (artistWords.some(artistWord => artistWord.includes(word) || word.includes(artistWord))) {
                    wordMatches++;
                }
                // Fuzzy match (similarity > 80%)
                else {
                    const bestMatch = artistWords.reduce((best, artistWord) => {
                        const similarity = this.calculateStringSimilarity(word, artistWord);
                        return similarity > best ? similarity : best;
                    }, 0);
                    
                    if (bestMatch > 0.8) {
                        fuzzyMatches++;
                    }
                }
            });
            
            if (wordMatches > 0) {
                score += (wordMatches / interestWords.length) * 50;
            }
            if (fuzzyMatches > 0) {
                score += (fuzzyMatches / interestWords.length) * 30;
            }
        }
        
        // Apply priority multiplier
        score *= priority;
        
        // Bonus for shorter names (more specific matches)
        if (interest.length <= 3) {
            score += 10;
        }
        
        // Bonus for collaborative matches
        if (this.isCollaborativeMatch(interest, artist)) {
            score += 15;
        }
        
        return Math.round(score);
    }

    // Enhanced artist match scoring with metadata integration
    async calculateArtistMatchScoreWithMetadata(interestValue, eventArtist, priority = 1) {
        const baseScore = this.calculateArtistMatchScore(interestValue, eventArtist, priority);
        // Get unified metadata for both interest and event artist (cache-only)
        const interestMetadata = await unifiedMetadataService.getCachedMetadataOrNull(interestValue);
        if (!interestMetadata) unifiedMetadataService.refreshMetadataInBackground(interestValue); // background only
        const eventArtistMetadata = await unifiedMetadataService.getCachedMetadataOrNull(eventArtist);
        if (!eventArtistMetadata) unifiedMetadataService.refreshMetadataInBackground(eventArtist); // background only
        let metadataBonus = 0;
        // Only use metadata if available, do not block
        if (interestMetadata && eventArtistMetadata && interestMetadata.genres && eventArtistMetadata.genres) {
            const genreOverlap = interestMetadata.genres.filter(genre => 
                eventArtistMetadata.genres.includes(genre)
            );
            if (genreOverlap.length > 0) {
                metadataBonus += genreOverlap.length * 15; // 15 points per matching genre
            }
        }
        if (eventArtistMetadata && eventArtistMetadata.popularity_score) {
            const qualityMultiplier = unifiedMetadataService.calculateMetadataQuality(eventArtistMetadata) / 100;
            metadataBonus += Math.floor(eventArtistMetadata.popularity_score * 0.2 * qualityMultiplier);
        }
        if (eventArtistMetadata && eventArtistMetadata.verified) {
            metadataBonus += 10;
        }
        if (interestMetadata && eventArtistMetadata && interestMetadata.collaborations && eventArtistMetadata.collaborations) {
            const hasCollaboration = interestMetadata.collaborations.some(collab => 
                collab.artist.toLowerCase() === eventArtist.toLowerCase()
            ) || eventArtistMetadata.collaborations.some(collab => 
                collab.artist.toLowerCase() === interestValue.toLowerCase()
            );
            if (hasCollaboration) {
                metadataBonus += 25; // High bonus for collaborations
            }
        }
        if (eventArtistMetadata && eventArtistMetadata.social_media) {
            const socialPlatforms = Object.keys(eventArtistMetadata.social_media).length;
            metadataBonus += Math.min(socialPlatforms * 3, 15); // Up to 15 points for social presence
        }
        return Math.round(baseScore + metadataBonus);
    }

    // Find events by genre using metadata
    async findEventsByGenre(genre, priority = 1) {
        try {
            console.log(`🎵 Finding events for genre: ${genre}`);
            
            // Get all events and filter by genre using metadata
            const result = await pool.query(`
                SELECT id, external_id, name, artist, venue_name, venue_city, venue_state, 
                       event_date, ticket_url, min_price, max_price, created_at
                FROM events 
                WHERE event_date >= CURRENT_DATE
                ORDER BY event_date ASC
                LIMIT 50
            `);
            
            const genreEvents = [];
            
            for (const event of result.rows) {
                if (event.artist) {
                    const metadata = await unifiedMetadataService.getCachedMetadataOrNull(event.artist);
                    if (!metadata) unifiedMetadataService.refreshMetadataInBackground(event.artist);
                    if (metadata && metadata.genres) {
                        const genreMatch = metadata.genres.some(g => 
                            g.toLowerCase().includes(genre.toLowerCase()) ||
                            genre.toLowerCase().includes(g.toLowerCase())
                        );
                        
                        if (genreMatch) {
                            genreEvents.push(event);
                        }
                    }
                }
            }
            
            console.log(`Found ${genreEvents.length} events for genre: ${genre}`);
            return genreEvents;
        } catch (error) {
            console.error(`Error finding events for genre ${genre}:`, error);
            return [];
        }
    }

    // Calculate genre match score
    calculateGenreMatchScore(genre, artist, priority = 1) {
        let score = 0;
        
        // Base score for genre interest
        score += 50 * priority;
        
        // Additional scoring can be enhanced with metadata
        return score;
    }

    // Get artist metadata for event
    async getArtistMetadataForEvent(artistName) {
        if (!artistName) return null;
        // Try to get cached metadata first
        const metadataCacheKey = this.getArtistMetadataKey(artistName);
        let metadata = await this.getCache(metadataCacheKey);
        if (!metadata) {
            // Use cache-only unified metadata
            metadata = await unifiedMetadataService.getCachedMetadataOrNull(artistName);
            if (!metadata) unifiedMetadataService.refreshMetadataInBackground(artistName); // background only
            // Cache the metadata
            if (metadata) {
                await this.setCache(metadataCacheKey, metadata, this.cacheConfig.artistMetadata.ttl);
            }
        }
        return metadata;
    }

    // Enhanced event prioritization with metadata
    async prioritizeEventsWithMetadata(events, userInfo, preferredDestinations, userInterests) {
        if (events.length === 0) return [];
        // Get user behavior analysis for personalized scoring
        const userId = userInfo.user_id; // Assuming user_id is available
        const userBehavior = await this.analyzeUserBehavior(userId);
        const prioritizedEvents = await Promise.all(events.map(async (event) => {
            const eventDate = new Date(event.event_date);
            const now = new Date();
            const daysUntilEvent = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
            // Initialize component scores
            const componentScores = {
                artistMatch: 0,
                locationProximity: 0,
                dateProximity: 0,
                priceValue: 0,
                popularity: 0,
                metadataQuality: 0,
                seasonalFactor: 0,
                userBehavior: 0
            };
            // 1. Artist Match Score (25% weight)
            if (event.matchScore) {
                componentScores.artistMatch = event.matchScore;
            }
            // 2. Location Proximity Score (20% weight)
            if (userInfo.home_city && userInfo.home_state) {
                const distance = this.calculateDistance(
                    userInfo.home_city, userInfo.home_state,
                    event.venue_city, event.venue_state
                );
                componentScores.locationProximity = this.calculateEnhancedDistanceScore(distance, userBehavior);
                // Bonus for preferred destinations
                if (preferredDestinations.length > 0) {
                    const isPreferredDestination = preferredDestinations.some(dest => 
                        dest.toLowerCase().includes(event.venue_city.toLowerCase()) ||
                        dest.toLowerCase().includes(event.venue_state.toLowerCase())
                    );
                    if (isPreferredDestination) {
                        componentScores.locationProximity += 20;
                    }
                }
            }
            // 3. Date Proximity Score (15% weight)
            if (daysUntilEvent <= 30) componentScores.dateProximity = 100;
            else if (daysUntilEvent <= 90) componentScores.dateProximity = 80;
            else if (daysUntilEvent <= 180) componentScores.dateProximity = 60;
            else componentScores.dateProximity = 40;
            // 4. Price Value Score (15% weight)
            componentScores.priceValue = await this.analyzePricingValue(event, userBehavior);
            // 5. Popularity Score (10% weight)
            if (event.artist) {
                componentScores.popularity = await this.getMarketTrendScore(event.artist);
            }
            // 6. Metadata Quality Score (5% weight)
            if (event.artistMetadata) {
                componentScores.metadataQuality = unifiedMetadataService.calculateMetadataQuality(event.artistMetadata);
            }
            // 7. Seasonal Factor (5% weight)
            const seasonalMultiplier = this.getSeasonalFactor(eventDate);
            componentScores.seasonalFactor = seasonalMultiplier * 100;
            // 8. User Behavior Score (5% weight)
            componentScores.userBehavior = userBehavior.total_interactions > 0 ? 
                Math.min(userBehavior.total_interactions * 2, 100) : 50;
            // Calculate weighted total score
            let totalScore = 0;
            Object.keys(this.scoringWeights).forEach(component => {
                totalScore += componentScores[component] * this.scoringWeights[component];
            });
            // Apply event type/subtype bonuses
            if (userInterests) {
                const typeInterests = userInterests.filter(i => i.interest_type === 'event_type');
                typeInterests.forEach(typeInterest => {
                    if (event.event_type === typeInterest.interest_value) {
                        totalScore += 30 * typeInterest.priority;
                    }
                });
                const subtypeInterests = userInterests.filter(i => i.interest_type === 'event_subtype');
                subtypeInterests.forEach(subtypeInterest => {
                    if (event.event_subtype === subtypeInterest.interest_value) {
                        totalScore += 20 * subtypeInterest.priority;
                    }
                });
            }
            // Enhanced metadata-based artist scoring
            if (event.artist) {
                // Only use cached metadata, trigger background refresh if missing
                const artistMetadata = event.artistMetadata || await unifiedMetadataService.getCachedMetadataOrNull(event.artist);
                if (!artistMetadata) unifiedMetadataService.refreshMetadataInBackground(event.artist); // background only
                if (artistMetadata) {
                    // Genre matching bonus
                    if (artistMetadata.genres && userInterests) {
                        const genreInterests = userInterests.filter(interest => 
                            interest.interest_type === 'genre'
                        );
                        genreInterests.forEach(genreInterest => {
                            const genreMatch = artistMetadata.genres.some(genre => 
                                genre.toLowerCase().includes(genreInterest.interest_value.toLowerCase()) ||
                                genreInterest.interest_value.toLowerCase().includes(genre.toLowerCase())
                            );
                            if (genreMatch) {
                                totalScore += 15 * genreInterest.priority;
                            }
                        });
                    }
                    // Verified artist bonus
                    if (artistMetadata.verified) {
                        totalScore += 10;
                    }
                    // Collaboration bonus
                    if (artistMetadata.collaborations && userInterests) {
                        const artistInterests = userInterests.filter(interest => 
                            interest.interest_type === 'artist'
                        );
                        artistInterests.forEach(artistInterest => {
                            const hasCollaboration = artistMetadata.collaborations.some(collab => 
                                collab.artist.toLowerCase().includes(artistInterest.interest_value.toLowerCase())
                            );
                            if (hasCollaboration) {
                                totalScore += 25 * artistInterest.priority;
                            }
                        });
                    }
                }
            }
            return {
                ...event,
                priorityScore: Math.round(totalScore),
                daysUntilEvent: daysUntilEvent,
                componentScores: componentScores // Keep for debugging/analysis
            };
        }));
        // Enhanced sorting with multiple criteria
        prioritizedEvents.sort((a, b) => {
            // Primary sort by priority score
            if (b.priorityScore !== a.priorityScore) {
                return b.priorityScore - a.priorityScore;
            }
            // Secondary sort by metadata quality
            if (a.componentScores && b.componentScores) {
                if (a.componentScores.metadataQuality !== b.componentScores.metadataQuality) {
                    return b.componentScores.metadataQuality - a.componentScores.metadataQuality;
                }
            }
            // Tertiary sort by date
            return new Date(a.event_date) - new Date(b.event_date);
        });
        // Remove the scoring data and return clean events
        return prioritizedEvents.map(({ priorityScore, daysUntilEvent, componentScores, ...event }) => event);
    }

    // Calculate string similarity using Levenshtein distance
    calculateStringSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        if (str1.length === 0) return 0;
        if (str2.length === 0) return 0;
        
        const matrix = [];
        
        // Initialize matrix
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        // Fill matrix
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        const distance = matrix[str2.length][str1.length];
        const maxLength = Math.max(str1.length, str2.length);
        return 1 - (distance / maxLength);
    }

    // Check if this is a collaborative match
    isCollaborativeMatch(interest, artist) {
        const collaborationKeywords = ['feat', 'featuring', 'ft', 'with', 'and', '&', 'x', 'vs', 'versus'];
        
        const interestHasCollab = collaborationKeywords.some(keyword => 
            interest.includes(keyword)
        );
        const artistHasCollab = collaborationKeywords.some(keyword => 
            artist.includes(keyword)
        );
        
        return interestHasCollab || artistHasCollab;
    }

    // Enhanced artist name cleaning with better normalization
    cleanArtistName(artistName) {
        if (!artistName) return '';
        
        return artistName
            .replace(/"/g, '') // Remove quotes
            .replace(/'/g, '') // Remove single quotes
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/^\s+|\s+$/g, '') // Trim
            .toLowerCase() // Normalize case
            .replace(/[^\w\s\-&]/g, '') // Remove special characters except hyphens and ampersands
            .replace(/\s+/g, ' ') // Normalize whitespace again
            .trim();
    }

    // Generate trip suggestions with optional forceRefresh to bypass cache
    async generateTripSuggestions(userId, limit = 100, forceRefresh = false) {
        try {
            const tripCacheKey = this.getTripSuggestionsKey(userId, limit);
            console.log(`[TripEngine] generateTripSuggestions called for user ${userId} with limit ${limit}, forceRefresh=${forceRefresh}`);
            if (!forceRefresh) {
                let cachedSuggestions = await this.getCache(tripCacheKey);
                if (cachedSuggestions) {
                    console.log(`[TripEngine] Cache HIT for key: ${tripCacheKey} (count: ${cachedSuggestions.length})`);
                    // Trigger background refresh (do not await)
                    this.refreshTripSuggestionsInBackground(userId, limit).catch(err => {
                        console.warn('[TripEngine] Background trip suggestion refresh failed:', err);
                    });
                    return cachedSuggestions;
                } else {
                    console.log(`[TripEngine] Cache MISS for key: ${tripCacheKey}`);
                }
            } else {
                console.log(`[TripEngine] Force refresh requested, bypassing cache for key: ${tripCacheKey}`);
                await this.invalidateCache(tripCacheKey);
            }
            // If no cache or forceRefresh, generate synchronously
            return await this._generateTripSuggestionsSync(userId, limit);
        } catch (error) {
            console.error('[TripEngine] ❌ Failed to generate trip suggestions:', error);
            return [];
        }
    }

    async _generateTripSuggestionsSync(userId, limit) {
        try {
            const inProgressKey = `trips:inprogress:${userId}`;
            await redisClient.del(inProgressKey);
            console.log(`[TripEngine] _generateTripSuggestionsSync for user ${userId} with limit ${limit}`);
            const { events, interests, preferences } = await this.findMatchingEvents(userId);
            if (events.length === 0) {
                console.log('[TripEngine] No matching events found for trip suggestions');
                return [];
            }
            // Fetch all existing trip suggestions for this user
            const existingTripsResult = await pool.query(
                'SELECT event_id, id FROM trip_suggestions WHERE user_id = $1',
                [userId]
            );
            const existingEventIds = new Set(existingTripsResult.rows.map(row => row.event_id));
            const allFeedback = await this.getAllUserFeedback(userId);
            const tripSuggestions = [];
            const processedEvents = new Set();
            const concurrency = 8; // Max parallel trip generations
            // Only generate trips for events that do not already have a suggestion
            const newEventCandidates = events.filter(e => !existingEventIds.has(e.id)).slice(0, limit * 2);
            let active = 0;
            let idx = 0;
            const startTime = Date.now();
            const makeTrip = async (event) => {
                const tripStart = Date.now();
                if (tripSuggestions.length >= limit) return;
                if (processedEvents.has(event.id)) return;
                processedEvents.add(event.id);
                let isSuppressed = false;
                for (const feedback of allFeedback) {
                    if (feedback.feedback === 'down') {
                        const feedbackTrip = await this.getTripSuggestionWithDetails(feedback.trip_suggestion_id);
                        const sim = this.computeTripSimilarity(event, feedbackTrip);
                        if (sim >= 0.5) {
                            isSuppressed = true;
                            break;
                        }
                    }
                }
                if (isSuppressed) return;
                try {
                    const tripSuggestion = await this.createEnhancedTripSuggestion(userId, event, preferences);
                    if (tripSuggestion) {
                        let feedbackBoost = 0;
                        for (const feedback of allFeedback) {
                            if (feedback.feedback === 'up' || feedback.feedback === 'double_up') {
                                const feedbackTrip = await this.getTripSuggestionWithDetails(feedback.trip_suggestion_id);
                                const sim = this.computeTripSimilarity(event, feedbackTrip);
                                if (sim >= 0.5) {
                                    feedbackBoost += (feedback.feedback === 'double_up') ? 50 : 20;
                                }
                            }
                        }
                        if (feedbackBoost > 0) {
                            tripSuggestion.feedbackBoost = feedbackBoost;
                            tripSuggestion.priorityScore = (tripSuggestion.priorityScore || 0) + feedbackBoost;
                        }
                        tripSuggestions.push(tripSuggestion);
                        await redisClient.rPush(inProgressKey, JSON.stringify(tripSuggestion));
                        await redisClient.expire(inProgressKey, 1800);
                        const tripEnd = Date.now();
                        console.log(`[TripEngine] Trip suggestion for event ${event.id} took ${tripEnd - tripStart} ms`);
                    }
                } catch (error) {
                    console.error(`[TripEngine] Error creating trip suggestion for event ${event.id}:`, error);
                }
            };
            // Concurrency pool
            const poolArr = [];
            const next = async () => {
                if (tripSuggestions.length >= limit || idx >= newEventCandidates.length) return;
                const event = newEventCandidates[idx++];
                active++;
                await makeTrip(event);
                active--;
                await next();
            };
            // Start pool
            const starters = [];
            for (let i = 0; i < concurrency && i < newEventCandidates.length; i++) {
                starters.push(next());
            }
            await Promise.all(starters);
            // No longer sort or replace all trips; just add new ones
            // Expire old trips (event date passed)
            await pool.query(
                'DELETE FROM trip_suggestions WHERE user_id = $1 AND event_id IN (SELECT e.id FROM events e WHERE e.id = trip_suggestions.event_id AND e.event_date < CURRENT_DATE)',
                [userId]
            );
            const totalTime = Date.now() - startTime;
            console.log(`[TripEngine] Generated ${tripSuggestions.length} new trip suggestions for user ${userId} in ${totalTime} ms`);
            return tripSuggestions;
        } catch (error) {
            console.error('[TripEngine] ❌ Failed to generate trip suggestions:', error);
            return [];
        }
    }

    async refreshTripSuggestionsInBackground(userId, limit) {
        setTimeout(async () => {
            try {
                console.log(`[TripEngine] [BG] Refreshing trip suggestions for user ${userId} with limit ${limit}`);
                await this._generateTripSuggestionsSync(userId, limit);
                console.log(`[TripEngine] [BG] Trip suggestions refreshed for user ${userId}`);
            } catch (err) {
                console.warn(`[TripEngine] [BG] Failed to refresh trip suggestions for user ${userId}:`, err);
            }
        }, 0);
    }

    // Create enhanced trip suggestion with metadata insights
    async createEnhancedTripSuggestion(userId, event, preferences = {}) {
        try {
            console.log(`🎯 Creating enhanced trip suggestion for user ${userId}, event ${event.id}`);
            // Get or use existing metadata
            const artistMetadata = event.artistMetadata || await this.getArtistMetadataForEvent(event.artist);
            // Create base trip suggestion
            const baseSuggestion = await this.createTripSuggestion(userId, event.id, preferences);
            console.warn(`[TripEngine][DEBUG] baseSuggestion.hotels for user ${userId}, event ${event.id}:`, JSON.stringify(baseSuggestion.hotels, null, 2));
            
            // --- ENHANCED DEEP LINKING STRATEGY ---
            // Event/Ticket deep link
            const eventBookingUrl = getTicketmasterEventUrl(event.external_id, event.name, event.venue_city, event.event_date);
            
            // Hotel deep link (use first preferred brand if available)
            const hotelBrand = preferences.preferred_hotel_brands?.[0] || 'Any';
            const checkIn = event.event_date ? new Date(event.event_date) : null;
            const checkOut = checkIn ? new Date(checkIn) : null;
            if (checkOut) checkOut.setDate(checkOut.getDate() + 1);
            const checkInStr = checkIn ? checkIn.toISOString().split('T')[0] : '';
            const checkOutStr = checkOut ? checkOut.toISOString().split('T')[0] : '';
            const hotelDirectUrl = getHotelBrandDirectUrl(hotelBrand, event.venue_city, checkInStr, checkOutStr);
            const hotelBookingUrl = hotelDirectUrl || getBookingComHotelUrl(hotelBrand, event.venue_city, checkInStr, checkOutStr);
            
            // Hotel price fallback with enhanced logic
            let realHotelPrice = null;
            if (Array.isArray(baseSuggestion.hotels) && baseSuggestion.hotels[0]) {
                realHotelPrice = baseSuggestion.hotels[0].price
                    || (Array.isArray(baseSuggestion.hotels[0].offers) && baseSuggestion.hotels[0].offers[0] && baseSuggestion.hotels[0].offers[0].price && baseSuggestion.hotels[0].offers[0].price.total)
                    || null;
            }
            const hotelPrice = realHotelPrice || averageHotelPrices[event.venue_city]?.[hotelBrand] || averageHotelPrices[event.venue_city]?.['Any'] || null;
            const hotelPriceType = realHotelPrice ? 'real' : (hotelPrice ? 'estimated' : null);
            
            // Flight deep link (use first preferred airline if available)
            const airline = preferences.preferred_airlines?.[0] || 'Any';
            const origin = preferences.primary_airport;
            const destination = await this.getEventPrimaryAirport(event.venue_city, event.venue_state);
            const eventDateStr = event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '';
            const flightBookingUrl = getGoogleFlightsUrl(origin, destination, eventDateStr, airline);
            
            // Flight price fallback with enhanced logic
            const realFlightPrice = (Array.isArray(baseSuggestion.flights) && baseSuggestion.flights[0]) ? baseSuggestion.flights[0].price : null;
            const routeKey = `${origin}-${destination}`;
            const flightPrice = realFlightPrice || averageFlightPrices[routeKey] || null;
            const flightPriceType = realFlightPrice ? 'real' : (flightPrice ? 'estimated' : null);
            
            // Car rental deep link
            const carBrand = preferences.rental_car_preference || 'Any';
            const carBookingUrl = getCarRentalUrl(carBrand, event.venue_city, checkInStr, checkOutStr);
            
            // Car rental price fallback (estimated based on city)
            const realCarPrice = (Array.isArray(baseSuggestion.cars) && baseSuggestion.cars[0]) ? baseSuggestion.cars[0].price : null;
            const carPrice = realCarPrice || this.getEstimatedCarPrice(event.venue_city) || null;
            const carPriceType = realCarPrice ? 'real' : (carPrice ? 'estimated' : null);
            
            // --- ENHANCED COMPONENT CREATION WITH DEEP LINKS ---
            const enhancedComponents = [];
            
            // Add ticket component with deep link
            if (event.external_id) {
                enhancedComponents.push({
                    componentType: 'ticket',
                    provider: 'ticketmaster',
                    price: (Array.isArray(baseSuggestion.tickets) && baseSuggestion.tickets[0]) ? baseSuggestion.tickets[0].price : null,
                    priceType: (Array.isArray(baseSuggestion.tickets) && baseSuggestion.tickets[0] && baseSuggestion.tickets[0].price) ? 'real' : 'estimated',
                    bookingUrl: eventBookingUrl,
                    details: (Array.isArray(baseSuggestion.tickets) && baseSuggestion.tickets[0] && baseSuggestion.tickets[0].details) ? baseSuggestion.tickets[0].details : {
                        section: 'General Admission',
                        ticketType: 'Standard',
                        delivery: 'Mobile Entry'
                    }
                });
            }
            
            // Add flight component with deep link
            if (origin && destination) {
                enhancedComponents.push({
                    componentType: 'flight',
                    provider: 'google_flights',
                    price: flightPrice,
                    priceType: flightPriceType,
                    bookingUrl: flightBookingUrl,
                    details: (Array.isArray(baseSuggestion.flights) && baseSuggestion.flights[0] && baseSuggestion.flights[0].details) ? baseSuggestion.flights[0].details : {
                        airline: airline !== 'Any' ? airline : 'Multiple Airlines',
                        departure: origin,
                        arrival: destination,
                        date: eventDateStr
                    }
                });
            }
            
            // Add hotel component with deep link
            if (event.venue_city) {
                let hotelOffers = undefined;
                let hotelDetails = {
                    brand: hotelBrand !== 'Any' ? hotelBrand : 'Various Hotels',
                    city: event.venue_city,
                    checkIn: checkInStr,
                    checkOut: checkOutStr
                };
                if (Array.isArray(baseSuggestion.hotels) && baseSuggestion.hotels[0]) {
                    if (baseSuggestion.hotels[0].offers) hotelOffers = baseSuggestion.hotels[0].offers;
                    if (baseSuggestion.hotels[0].details) hotelDetails = { ...hotelDetails, ...baseSuggestion.hotels[0].details };
                    // Always include offers in details for downstream price extraction
                    if (hotelOffers) hotelDetails.offers = hotelOffers;
                }
                enhancedComponents.push({
                    componentType: 'hotel',
                    provider: hotelDirectUrl ? hotelBrand.toLowerCase() : 'booking.com',
                    price: hotelPrice,
                    priceType: hotelPriceType,
                    bookingUrl: hotelBookingUrl,
                    offers: hotelOffers, // for direct access
                    details: hotelDetails
                });
            }
            
            // Add car rental component with deep link
            if (event.venue_city) {
                enhancedComponents.push({
                    componentType: 'car',
                    provider: carBrand !== 'Any' ? carBrand.toLowerCase() : 'expedia',
                    price: carPrice,
                    priceType: carPriceType,
                    bookingUrl: carBookingUrl,
                    details: (Array.isArray(baseSuggestion.cars) && baseSuggestion.cars[0] && baseSuggestion.cars[0].details) ? baseSuggestion.cars[0].details : {
                        brand: carBrand !== 'Any' ? carBrand : 'Various Rentals',
                        pickupLocation: event.venue_city,
                        pickupDate: checkInStr,
                        returnDate: checkOutStr
                    }
                });
            }
            
            // Add transfer component (Amadeus)
            if (event.venue_city && preferences.primary_airport) {
                try {
                    // Use event date as pickup date, 10:00 AM as pickup time
                    const pickUpDate = event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '';
                    const pickUpTime = '10:00:00';
                    const transfers = await enhancedUnifiedTravelService.searchTransfers(
                        preferences.primary_airport,
                        event.venue_city,
                        pickUpDate,
                        pickUpTime,
                        preferences.passengers || 1,
                        5
                    );
                    if (transfers && transfers.length > 0) {
                        const bestTransfer = transfers[0];
                        enhancedComponents.push({
                            componentType: 'transfer',
                            provider: bestTransfer.provider,
                            price: bestTransfer.price,
                            priceType: bestTransfer.price ? 'real' : 'estimated',
                            bookingUrl: bestTransfer.bookingUrl,
                            details: bestTransfer.details || {},
                        });
                        console.log(`✅ Added transfer component: ${bestTransfer.provider} - $${bestTransfer.price}`);
                    } else {
                        console.log('No transfer options found for this trip.');
                    }
                } catch (err) {
                    console.warn('Transfer search failed:', err.message);
                }
            }
            
            // Calculate total cost (real + estimated)
            const totalCost = enhancedComponents.reduce((sum, comp) => {
                let price = comp.price;
                if (typeof price === 'string') price = parseFloat(price);
                return sum + (price || 0);
            }, 0);
            const serviceFee = Math.max(totalCost * this.serviceFeeRate, this.minServiceFee);
            
            // Create enhanced trip suggestion
            const enhancedSuggestion = {
                ...baseSuggestion,
                components: enhancedComponents,
                totalCost: totalCost,
                serviceFee: serviceFee,
                bookingUrls: {
                    ticket: eventBookingUrl,
                    flight: flightBookingUrl,
                    hotel: hotelBookingUrl,
                    car: carBookingUrl
                },
                priceBreakdown: {
                    real: enhancedComponents.filter(c => c.priceType === 'real').reduce((sum, c) => {
                        let price = c.price;
                        if (typeof price === 'string') price = parseFloat(price);
                        return sum + (price || 0);
                    }, 0),
                    estimated: enhancedComponents.filter(c => c.priceType === 'estimated').reduce((sum, c) => {
                        let price = c.price;
                        if (typeof price === 'string') price = parseFloat(price);
                        return sum + (price || 0);
                    }, 0)
                }
            };
            
            // Save all generated components to the database
            await this.saveAllTripComponents(baseSuggestion.id, enhancedComponents);
            
            return enhancedSuggestion;
            
        } catch (error) {
            console.error('❌ Error creating enhanced trip suggestion:', error);
            throw error;
        }
    }

    // Helper to save all components for a trip suggestion
    async saveAllTripComponents(tripSuggestionId, components) {
        // Delete old components
        await pool.query('DELETE FROM trip_components WHERE trip_suggestion_id = $1', [tripSuggestionId]);
        // Insert new components
        for (const comp of components) {
            let price = comp.price;
            if (price == null) {
                // Check for offers[0].price.total (top-level)
                if (Array.isArray(comp.offers) && comp.offers[0]?.price?.total) {
                    price = comp.offers[0].price.total;
                // Check for price.total (top-level)
                } else if (comp.price && typeof comp.price === 'object' && comp.price.total) {
                    price = comp.price.total;
                // Check for details.price.total
                } else if (comp.details?.price?.total) {
                    price = comp.details.price.total;
                // Check for amount (some APIs)
                } else if (comp.price && typeof comp.price === 'object' && comp.price.amount) {
                    price = comp.price.amount;
                // Check for offers[0].price.total inside details (SerpAPI fallback)
                } else if (Array.isArray(comp.details?.offers) && comp.details.offers[0]?.price?.total) {
                    price = comp.details.offers[0].price.total;
                }
            }
            if (typeof price === 'string') price = parseFloat(price);
            if (price == null) {
                console.warn(`[TripEngine] Could not extract price for component`, JSON.stringify(comp, null, 2));
                if (comp.details && comp.details.offers) {
                    console.warn(`[TripEngine] details.offers for component:`, JSON.stringify(comp.details.offers, null, 2));
                }
            }
            await pool.query(
                `INSERT INTO trip_components (trip_suggestion_id, component_type, provider, price, details, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [
                    tripSuggestionId,
                    comp.componentType || comp.component_type,
                    comp.provider || comp.searchProvider,
                    price,
                    JSON.stringify(comp.details || comp.enrichedDetails || {})
                ]
            );
        }
    }

    // Helper method to get estimated car rental prices
    getEstimatedCarPrice(city) {
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
            'Boston': 75
        };
        return cityEstimates[city] || 50; // Default $50/day
    }

    // Generate metadata insights for events
    async generateMetadataInsights(events, interests) {
        try {
            const insights = {
                totalArtists: events.length,
                genres: new Set(),
                popularityRange: { min: 100, max: 0 },
                verifiedArtists: 0,
                collaborationOpportunities: 0,
                socialPresence: 0
            };

            for (const event of events) {
                if (event.artistMetadata) {
                    // Collect genres
                    if (event.artistMetadata.genres) {
                        event.artistMetadata.genres.forEach(genre => insights.genres.add(genre));
                    }
                    
                    // Track popularity
                    if (event.artistMetadata.popularity_score) {
                        insights.popularityRange.min = Math.min(insights.popularityRange.min, event.artistMetadata.popularity_score);
                        insights.popularityRange.max = Math.max(insights.popularityRange.max, event.artistMetadata.popularity_score);
                    }
                    
                    // Count verified artists
                    if (event.artistMetadata.verified) {
                        insights.verifiedArtists++;
                    }
                    
                    // Count artists with social presence
                    if (event.artistMetadata.social_media && Object.keys(event.artistMetadata.social_media).length > 0) {
                        insights.socialPresence++;
                    }
                    
                    // Count collaboration opportunities
                    if (event.artistMetadata.collaborations && event.artistMetadata.collaborations.length > 0) {
                        insights.collaborationOpportunities++;
                    }
                }
            }

            insights.genres = Array.from(insights.genres);
            return insights;
        } catch (error) {
            console.error('Error generating metadata insights:', error);
            return {};
        }
    }

    // Generate insights for a specific event
    async generateEventMetadataInsights(event, artistMetadata) {
        if (!artistMetadata) return null;
        
        return {
            artistName: event.artist,
            genres: artistMetadata.genres || [],
            popularity: artistMetadata.popularity_score || 0,
            verified: artistMetadata.verified || false,
            followers: artistMetadata.followers_count || 0,
            monthlyListeners: artistMetadata.monthly_listeners || 0,
            socialPlatforms: artistMetadata.social_media ? Object.keys(artistMetadata.social_media).length : 0,
            collaborations: artistMetadata.collaborations ? artistMetadata.collaborations.length : 0,
            recordLabel: artistMetadata.record_label,
            country: artistMetadata.country,
            activeSince: artistMetadata.active_since,
            biography: artistMetadata.biography ? artistMetadata.biography.substring(0, 200) + '...' : null
        };
    }

    // Get related artist recommendations
    async getRelatedArtistRecommendations(artistMetadata) {
        if (!artistMetadata || !artistMetadata.collaborations) return [];
        
        const recommendations = [];
        const seenArtists = new Set();
        
        for (const collab of artistMetadata.collaborations.slice(0, 5)) {
            if (!seenArtists.has(collab.artist)) {
                seenArtists.add(collab.artist);
                recommendations.push({
                    artist: collab.artist,
                    type: 'collaboration',
                    match: collab.match || 0
                });
            }
        }
        
        return recommendations;
    }

    // Generate genre insights
    async generateGenreInsights(event, artistMetadata) {
        if (!artistMetadata || !artistMetadata.genres) return null;
        
        return {
            primaryGenres: artistMetadata.genres.slice(0, 3),
            genreCount: artistMetadata.genres.length,
            genreDiversity: this.calculateGenreDiversity(artistMetadata.genres)
        };
    }

    // Calculate genre diversity score
    calculateGenreDiversity(genres) {
        if (!genres || genres.length === 0) return 0;
        
        // Simple diversity calculation based on number of genres
        return Math.min(genres.length * 10, 100); // Max 50 points for diversity
        
        return diversityScore;
    }

    // Generate social insights
    async generateSocialInsights(artistMetadata) {
        if (!artistMetadata || !artistMetadata.social_media) return null;
        
        const socialPlatforms = Object.keys(artistMetadata.social_media);
        return {
            platforms: socialPlatforms,
            platformCount: socialPlatforms.length,
            hasInstagram: socialPlatforms.includes('instagram'),
            hasTwitter: socialPlatforms.includes('twitter') || socialPlatforms.includes('x'),
            hasYouTube: socialPlatforms.includes('youtube'),
            hasTikTok: socialPlatforms.includes('tiktok')
        };
    }

    // Helper to get the primary airport for a city/state using metro_areas (authoritative)
    async getEventPrimaryAirport(city, state) {
        // Normalize input
        const normCity = (city || '').trim().toLowerCase();
        const normState = (state || '').trim().toLowerCase();
        console.log(`[DEBUG] Looking up metro area for city='${normCity}', state='${normState}'`);
        // 1. Try metro_areas table
        let result = await pool.query(
            'SELECT primary_airport FROM metro_areas WHERE LOWER(city) = $1 AND LOWER(state) = $2 LIMIT 1',
            [normCity, normState]
        );
        console.log('[DEBUG] metro_areas lookup result:', result.rows);
        if (result.rows.length > 0 && result.rows[0].primary_airport) {
            return result.rows[0].primary_airport;
        }
        // 2. Fallback: airports table
        result = await pool.query(
            'SELECT iata_code FROM airports WHERE LOWER(city) = $1 AND LOWER(state) = $2 LIMIT 1',
            [normCity, normState]
        );
        console.log('[DEBUG] airports fallback lookup result:', result.rows);
        if (result.rows.length > 0 && result.rows[0].iata_code) {
            return result.rows[0].iata_code;
        }
        return null;
    }

    // Update all trip component searches to use getEventPrimaryAirport
    async searchFlights(event, preferences = {}) {
        logger.info(`TRIP SUGGESTION: searchFlights called for event ${event.id || event.name}`);
        // Normalize preferences for primary airport
        if (preferences.primary_airport && !preferences.primaryAirport) {
            preferences.primaryAirport = preferences.primary_airport;
        }
        if (preferences.primaryAirport && !preferences.primary_airport) {
            preferences.primary_airport = preferences.primaryAirport;
        }
        try {
            const primaryAirport = preferences.primary_airport || preferences.primaryAirport;
            if (!primaryAirport) {
                throw new Error('Preferred airport is not set. User must set a preferred airport.');
            }
            const destinationAirport = await this.getEventPrimaryAirport(event.venue_city, event.venue_state);
            if (!destinationAirport) {
                console.log(`❌ No airport found for ${event.venue_city}, ${event.venue_state}`);
                return [];
            }
            // Use event date for flight search
            const eventDate = new Date(event.event_date);
            const departureDate = new Date(eventDate);
            departureDate.setDate(eventDate.getDate() - 1);
            const returnDate = new Date(eventDate);
            returnDate.setDate(eventDate.getDate() + 1);
            // Ensure departure and return dates are today or in the future
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Allow searches for events happening today (departure can be today)
            const departureDateOnly = new Date(departureDate);
            departureDateOnly.setHours(0, 0, 0, 0);
            
            // Debug: Log the date comparison
            console.log('🔍 Flight date comparison:', {
                eventDate: eventDate.toISOString(),
                departureDate: departureDate.toISOString(),
                returnDate: returnDate.toISOString(),
                today: today.toISOString(),
                departureInPast: departureDateOnly < today,
                returnInPast: returnDate < today
            });
            
            if (departureDateOnly < today || returnDate < today) {
                console.log('❌ Flight search skipped: departure or return date is in the past.');
                return [];
            }
            // Log the actual search params
            console.log('Enhanced flight search params:', {
                origin: primaryAirport,
                destination: destinationAirport,
                departureDate: departureDate.toISOString().split('T')[0],
                returnDate: returnDate.toISOString().split('T')[0]
            });
            
            // Use enhanced unified travel service for flight search
            const searchResults = await enhancedUnifiedTravelService.searchFlights(
                primaryAirport,
                destinationAirport,
                departureDate.toISOString().split('T')[0],
                returnDate.toISOString().split('T')[0],
                preferences.passengers || 1,
                10 // Request 10 results
            );
            
            // Extract flights from the unified results
            const flights = searchResults.flights || [];
            
            // Only return roundtrip flights (at least two itineraries) for Amadeus results
            const completeFlights = flights.filter(flight => {
                if (flight.searchProvider === 'amadeus') {
                    return Array.isArray(flight.itineraries) && flight.itineraries.length >= 2;
                }
                // For other providers (SerpAPI), accept all results
                return true;
            });
            
            console.log(`✅ Enhanced flight search found ${completeFlights.length} flights from ${searchResults.providers.length} providers`);
            return completeFlights;
        } catch (error) {
            console.error('❌ Enhanced flight search failed:', error);
            return [];
        }
    }

    async searchHotels(event, preferences = {}) {
        logger.info(`TRIP SUGGESTION: searchHotels called for event ${event.id || event.name}`);
        // Always pass venue city name; enhanced service will handle mapping
        const cityOrCode = event.venue_city;
        const checkInDate = new Date(event.event_date);
        checkInDate.setDate(checkInDate.getDate() - 1);
        const checkOutDate = new Date(event.event_date);
        checkOutDate.setDate(checkOutDate.getDate() + 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Allow searches for events happening today (check-in can be today)
        const checkInDateOnly = new Date(checkInDate);
        checkInDateOnly.setHours(0, 0, 0, 0);
        
        // Debug: Log the date comparison
        console.log('🔍 Hotel date comparison:', {
            eventDate: event.event_date,
            checkInDate: checkInDate.toISOString(),
            checkOutDate: checkOutDate.toISOString(),
            today: today.toISOString(),
            checkInInPast: checkInDateOnly < today,
            checkOutInPast: checkOutDate < today
        });
        
        if (checkInDateOnly < today || checkOutDate < today) {
            logger.info('❌ Hotel search skipped: check-in or check-out date is in the past.');
            return [];
        }
        
        // Use enhanced unified travel service for hotel search
        const searchResults = await enhancedUnifiedTravelService.searchHotels(
            cityOrCode,
            checkInDate.toISOString().split('T')[0],
            checkOutDate.toISOString().split('T')[0],
            preferences.passengers || 1,
            10, // radius km
            10  // max results
        );
        
        // Extract hotels from the unified results
        const hotels = searchResults.hotels || [];
        
        console.log(`✅ Enhanced hotel search found ${hotels.length} hotels from ${searchResults.providers.length} providers`);
        return hotels;
    }

    async getNearestAirport(city, state = null) {
        try {
            let result = null;
            if (city && state) {
                result = await pool.query(
                    'SELECT iata_code FROM airports WHERE LOWER(city) = LOWER($1) AND LOWER(state) = LOWER($2) LIMIT 1',
                    [city, state]
                );
            }
            if ((!result || result.rows.length === 0) && city) {
                result = await pool.query(
                    'SELECT iata_code FROM airports WHERE LOWER(city) = LOWER($1) LIMIT 1',
                    [city]
                );
            }
            if ((!result || result.rows.length === 0) && state) {
                result = await pool.query(
                    'SELECT iata_code FROM airports WHERE LOWER(state) = LOWER($1) LIMIT 1',
                    [state]
                );
            }
            if (result && result.rows.length > 0) {
                return result.rows[0].iata_code;
            }
        } catch (err) {
            console.warn('Airport DB lookup failed:', err.message);
        }
        // No hardcoded fallback
        return null;
    }

    calculateTotalCost(travelOptions) {
        let total = 0;
        Object.values(travelOptions).forEach(options => {
            if (options && Array.isArray(options) && options.length > 0 && options[0]) {
                let price = options[0].price;
                if (typeof price === 'string') price = parseFloat(price);
                total += price || 0;
            }
        });
        return total;
    }

    calculateServiceFee(totalCost) {
        return Math.max(totalCost * this.serviceFeeRate, this.minServiceFee);
    }

    // Helper to format component details for UI
    static formatComponentDetails(type, details) {
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch { details = {}; }
      }
      switch (type) {
        case 'flight':
          return {
            airline: details.airline,
            flightNumber: details.flightNumber,
            cabinClass: details.cabinClass,
            price: details.price?.total || details.price,
            currency: details.price?.currency || details.currency,
            segments: (details.itineraries || []).flatMap(itin =>
              (itin.segments || []).map(seg => ({
                departureAirport: seg.departure?.iataCode,
                departureTime: seg.departure?.at,
                arrivalAirport: seg.arrival?.iataCode,
                arrivalTime: seg.arrival?.at,
                class: details.cabinClass || seg.cabin
              }))
            )
          };
        case 'ticket':
          return {
            section: details.section,
            row: details.row,
            seat: details.seat,
            ticketType: details.ticketType,
            price: details.price,
            delivery: details.delivery
          };
        case 'hotel':
          return {
            name: details.name,
            checkIn: details.checkIn || details.check_in,
            checkOut: details.checkOut || details.check_out,
            roomType: details.roomType || details.room_type,
            price: details.price
          };
        case 'car':
          return {
            carType: details.carType || details.model,
            pickupLocation: details.pickupLocation,
            pickupDate: details.pickupDate,
            returnLocation: details.returnLocation,
            returnDate: details.returnDate,
            price: details.price
          };
        default:
          return details;
      }
    }

    async saveTripComponents(tripSuggestionId, travelOptions) {
        try {
            console.log(`💾 Saving trip components for suggestion ${tripSuggestionId}`);
            console.log('Travel options:', Object.keys(travelOptions).map(k => `${k}: ${travelOptions[k]?.length || 0} options`));
            
            // Clear existing components
            await pool.query(`
                DELETE FROM trip_components 
                WHERE trip_suggestion_id = $1
            `, [tripSuggestionId]);
            
            // Insert new components
            for (const [type, options] of Object.entries(travelOptions)) {
                if (options && options.length > 0) {
                    // Save the first (best) option from each type
                    let option = options[0];
                    
                    // Debug: Log the option being saved
                    console.log(`🔎 [DEBUG] ${type} option being saved to DB:`, {
                        provider: option.provider || option.searchProvider,
                        price: option.price,
                        searchProvider: option.searchProvider,
                        priceType: option.priceType,
                        hasBookingUrl: !!option.bookingUrl
                    });
                    
                    // Extract price value - handle both numeric and object formats
                    let priceValue = option.price;
                    if (typeof option.price === 'object' && option.price !== null) {
                        priceValue = option.price.total || option.price.amount || 0;
                    } else if (typeof option.price === 'string') {
                        priceValue = parseFloat(option.price) || 0;
                    }
                    
                    // Prepare enhanced details object with all provider information
                    const enhancedDetails = {
                        ...option,
                        // Ensure these fields are preserved
                        searchProvider: option.searchProvider || option.provider,
                        priceType: option.priceType || 'real',
                        bookingUrl: option.bookingUrl || option.booking_url || option.url,
                        // Add timestamp for data freshness
                        dataFreshness: new Date().toISOString(),
                        // Add provider attribution
                        providerAttribution: {
                            searchProvider: option.searchProvider || option.provider,
                            originalProvider: option.provider,
                            priceType: option.priceType || 'real',
                            dataSource: option.searchProvider || option.provider
                        }
                    };
                    
                    await pool.query(`
                        INSERT INTO trip_components 
                        (trip_suggestion_id, component_type, provider, price, details, booking_reference)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        tripSuggestionId,
                        type,
                        option.provider || option.searchProvider,
                        priceValue,
                        JSON.stringify(enhancedDetails),
                        enhancedDetails.bookingUrl || enhancedDetails.booking_url || enhancedDetails.url
                    ]);
                    
                    console.log(`✅ Saved ${type} component: ${option.provider || option.searchProvider} - $${priceValue}`);
                }
            }
        } catch (error) {
            console.error('❌ Failed to save trip components:', error);
            throw error;
        }
    }

    async getTripSuggestionWithDetails(tripSuggestionId) {
        try {
            // Get trip suggestion with event details
            const suggestionResult = await pool.query(`
                SELECT ts.*, e.name as event_name, e.artist, e.venue_name, e.venue_city, 
                       e.venue_state, e.event_date, e.ticket_url
                FROM trip_suggestions ts
                JOIN events e ON ts.event_id = e.id
                WHERE ts.id = $1
            `, [tripSuggestionId]);

            if (suggestionResult.rows.length === 0) {
                throw new Error('Trip suggestion not found');
            }

            const suggestion = suggestionResult.rows[0];

            // Convert total_cost and service_fee to numbers
            suggestion.total_cost = Number(suggestion.total_cost);
            suggestion.service_fee = Number(suggestion.service_fee);

            // Get trip components
            const componentsResult = await pool.query(`
                SELECT component_type, provider, price, details, booking_reference
                FROM trip_components
                WHERE trip_suggestion_id = $1
                ORDER BY component_type
            `, [tripSuggestionId]);

            suggestion.components = componentsResult.rows.map(comp => {
                // Parse the enhanced details from database
                let enrichedDetails = null;
                try {
                    enrichedDetails = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
                } catch (e) {
                    enrichedDetails = comp.details;
                }
                
                return {
                    ...comp,
                    // Enhanced fields from database
                    searchProvider: enrichedDetails?.searchProvider || enrichedDetails?.providerAttribution?.searchProvider,
                    priceType: enrichedDetails?.priceType || enrichedDetails?.providerAttribution?.priceType,
                    bookingUrl: comp.booking_reference || enrichedDetails?.bookingUrl || enrichedDetails?.booking_url || enrichedDetails?.url,
                    // Attach full enriched details for UI
                    enrichedDetails: enrichedDetails,
                    details: TripSuggestionEngine.formatComponentDetails(comp.component_type || comp.componentType, comp.details)
                };
            });

            // --- ENHANCEMENT: Attach options array to each component ---
            // Build event and preferences objects for searchTravelOptions
            const event = {
                id: suggestion.event_id,
                name: suggestion.event_name,
                artist: suggestion.artist,
                venue_name: suggestion.venue_name,
                venue_city: suggestion.venue_city,
                venue_state: suggestion.venue_state,
                event_date: suggestion.event_date,
                ticket_url: suggestion.ticket_url
            };
            // Fetch preferences from travel_preferences for the user
            const prefResult = await pool.query(
                'SELECT * FROM travel_preferences WHERE user_id = $1 LIMIT 1',
                [suggestion.user_id]
            );
            const preferences = prefResult.rows[0] || {};
            let travelOptions = {};
            try {
                travelOptions = await this.searchTravelOptions(event, preferences);
                console.log('travelOptions.flight:', travelOptions['flight']);
                console.log('suggestion.components before mapping:', suggestion.components);
            } catch (err) {
                travelOptions = {};
            }
            suggestion.components = suggestion.components.map(comp => {
                const componentType = comp.component_type || comp.componentType;
                let options = [];
                if (componentType === 'flight' && Array.isArray(travelOptions['flight'])) {
                    options = travelOptions['flight'];
                } else if (Array.isArray(travelOptions[componentType])) {
                    options = travelOptions[componentType];
                }
                return { ...comp, options };
            });
            console.log('suggestion.components after mapping:', suggestion.components);
            // --- END ENHANCEMENT ---

            // Convert to camelCase
            return this.toCamelCase(suggestion);
        } catch (error) {
            console.error('❌ Failed to get trip suggestion details:', error);
            throw error;
        }
    }

    async getUserTripSuggestions(userId, status = null) {
        try {
            let query = `
                SELECT ts.*, e.name as event_name, e.artist, e.venue_name, e.venue_city, 
                       e.venue_state, e.event_date, e.ticket_url
                FROM trip_suggestions ts
                JOIN events e ON ts.event_id = e.id
                WHERE ts.user_id = $1
            `;
            const params = [userId];

            if (status) {
                query += ` AND ts.status = $2`;
                params.push(status);
            }

            query += ` ORDER BY ts.created_at DESC`;

            const result = await pool.query(query, params);
            
            // Get components and enhance with metadata for each suggestion
            const suggestions = [];
            for (const suggestion of result.rows) {
                // Convert total_cost and service_fee to numbers
                suggestion.total_cost = Number(suggestion.total_cost);
                suggestion.service_fee = Number(suggestion.service_fee);
                
                const componentsResult = await pool.query(`
                    SELECT component_type, provider, price, details, booking_reference
                    FROM trip_components
                    WHERE trip_suggestion_id = $1
                    ORDER BY component_type
                `, [suggestion.id]);
                
                suggestion.components = componentsResult.rows.map(comp => {
                    // Parse the enhanced details from database
                    let enrichedDetails = null;
                    try {
                        enrichedDetails = typeof comp.details === 'string' ? JSON.parse(comp.details) : comp.details;
                    } catch (e) {
                        enrichedDetails = comp.details;
                    }
                    
                    return {
                        ...comp,
                        // Enhanced fields from database
                        searchProvider: enrichedDetails?.searchProvider || enrichedDetails?.providerAttribution?.searchProvider,
                        priceType: enrichedDetails?.priceType || enrichedDetails?.providerAttribution?.priceType,
                        bookingUrl: comp.booking_reference || enrichedDetails?.bookingUrl || enrichedDetails?.booking_url || enrichedDetails?.url,
                        // Attach full enriched details for UI
                        enrichedDetails: enrichedDetails,
                        details: TripSuggestionEngine.formatComponentDetails(comp.component_type || comp.componentType, comp.details)
                    };
                });
                
                // Add metadata insights if artist is available
                if (suggestion.artist) {
                    const metadata = await this.getArtistMetadataForEvent(suggestion.artist);
                    if (metadata) {
                        suggestion.artistMetadata = metadata;
                        suggestion.metadataInsights = await this.generateEventMetadataInsights(suggestion, metadata);
                    }
                }
                
                suggestions.push(suggestion);
            }

            // Convert to camelCase
            return this.toCamelCase(suggestions);
        } catch (error) {
            console.error('❌ Failed to get user trip suggestions:', error);
            throw error;
        }
    }

    // Get enhanced trip suggestions with comprehensive metadata
    async getEnhancedTripSuggestions(userId, limit = 10) {
        try {
            console.log(`🎯 Getting enhanced trip suggestions for user ${userId}`);
            
            let suggestions = await this.getUserTripSuggestions(userId);
            
            // Refresh trip components with fresh travel data for existing trips
            const refreshedSuggestions = await Promise.all(suggestions.slice(0, limit).map(async (suggestion) => {
                try {
                    const refreshed = await this.refreshTripComponents(suggestion);
                    return refreshed || suggestion;
                } catch (error) {
                    console.error(`❌ Failed to refresh components for trip ${suggestion.id}:`, error.message);
                    return suggestion; // Return original if refresh fails
                }
            }));
            
            // Ensure all components are formatted (in case getUserTripSuggestions is bypassed)
            const formattedSuggestions = refreshedSuggestions.map(suggestion => ({
                ...suggestion,
                components: (suggestion.components || []).map(comp => ({
                    ...comp,
                    details: TripSuggestionEngine.formatComponentDetails(comp.component_type || comp.componentType, comp.details)
                }))
            }));
            
            // Enhance with additional metadata insights
            const enhancedSuggestions = await Promise.all(formattedSuggestions.map(async (suggestion) => {
                const enhanced = { ...suggestion };
                
                if (suggestion.artistMetadata) {
                    enhanced.artistRecommendations = await this.getRelatedArtistRecommendations(suggestion.artistMetadata);
                    enhanced.genreInsights = await this.generateGenreInsights(suggestion, suggestion.artistMetadata);
                    enhanced.socialInsights = await this.generateSocialInsights(suggestion.artistMetadata);
                }
                
                return enhanced;
            }));
            
            console.log(`✅ Enhanced ${enhancedSuggestions.length} trip suggestions with metadata`);
            return enhancedSuggestions;
        } catch (error) {
            console.error('❌ Failed to get enhanced trip suggestions:', error);
            throw error;
        }
    }

    // Refresh trip components with fresh travel data
    async refreshTripComponents(suggestion) {
        try {
            // Skip refresh for past events
            const eventDate = new Date(suggestion.eventDate);
            if (eventDate < new Date()) {
                console.log(`⏭️ Skipping refresh for past event: ${suggestion.eventName}`);
                return suggestion;
            }
            
            console.log(`🔄 Refreshing components for trip ${suggestion.id}: ${suggestion.eventName}`);
            
            // Get user preferences for travel search
            const prefResult = await pool.query(
                'SELECT * FROM travel_preferences WHERE user_id = $1 LIMIT 1',
                [suggestion.userId]
            );
            const preferences = prefResult.rows[0] || {
                primary_airport: 'DEN', // Default for Brad
                preferred_airlines: ['United', 'Southwest'],
                preferred_hotel_brands: ['Hilton', 'Marriott'],
                rental_car_preference: 'Hertz'
            };
            
            // Build event object for travel search
            const event = {
                id: suggestion.eventId,
                name: suggestion.eventName,
                artist: suggestion.artist,
                venue_name: suggestion.venueName,
                venue_city: suggestion.venueCity,
                venue_state: suggestion.venueState,
                event_date: suggestion.eventDate,
                ticket_url: suggestion.ticketUrl,
                external_id: suggestion.externalId
            };
            
            // Search for fresh travel options
            const travelOptions = await this.searchTravelOptions(event, preferences);
            
            // Only update if we found new travel options
            if (Object.values(travelOptions).some(options => options && options.length > 0)) {
                // Update trip components in database
                await this.saveTripComponents(suggestion.id, travelOptions);
                
                // Recalculate total cost
                const totalCost = this.calculateTotalCost(travelOptions);
                const serviceFee = this.calculateServiceFee(totalCost);
                
                // Update trip suggestion with new costs
                await pool.query(`
                    UPDATE trip_suggestions 
                    SET total_cost = $2, service_fee = $3, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [suggestion.id, totalCost, serviceFee]);
                
                // Get updated suggestion with fresh components
                const updatedSuggestion = await this.getTripSuggestionWithDetails(suggestion.id);
                console.log(`✅ Refreshed trip ${suggestion.id} with fresh components`);
                return updatedSuggestion;
            } else {
                console.log(`⚠️ No fresh travel options found for trip ${suggestion.id}`);
                return suggestion;
            }
            
        } catch (error) {
            console.error(`❌ Failed to refresh trip components:`, error);
            return suggestion; // Return original if refresh fails
        }
    }

    // Get enhanced artist recommendations based on user interests and metadata
    async getArtistRecommendationsForUser(userId, limit = 10) {
        try {
            console.log(`🎵 Getting enhanced artist recommendations for user ${userId}`);
            
            // Get user interests
            const interestsResult = await pool.query(`
                SELECT interest_type, interest_value, priority
                FROM user_interests 
                WHERE user_id = $1
                ORDER BY priority ASC
            `, [userId]);

            if (interestsResult.rows.length === 0) {
                return [];
            }

            const recommendations = [];
            const seenArtists = new Set();

            // Process each interest to get recommendations
            for (const interest of interestsResult.rows) {
                if (interest.interest_type === 'artist') {
                    // Get metadata for the interest artist
                    const metadata = await unifiedMetadataService.getCachedMetadataOrNull(interest.interest_value);
                    if (!metadata) unifiedMetadataService.refreshMetadataInBackground(interest.interest_value);
                    if (metadata && metadata.collaborations) {
                        // Add collaboration-based recommendations
                        for (const collab of metadata.collaborations.slice(0, 3)) {
                            if (!seenArtists.has(collab.artist) && recommendations.length < limit) {
                                seenArtists.add(collab.artist);
                                
                                const collabMetadata = await unifiedMetadataService.getCachedMetadataOrNull(collab.artist);
                                if (!collabMetadata) unifiedMetadataService.refreshMetadataInBackground(collab.artist);
                                recommendations.push({
                                    artist: collab.artist,
                                    type: 'collaboration',
                                    match: collab.match || 0,
                                    metadata: collabMetadata,
                                    reason: `Collaborated with ${interest.interest_value}`
                                });
                            }
                        }
                    }
                } else if (interest.interest_type === 'genre') {
                    // Get genre-based recommendations from metadata
                    const genreRecommendations = await this.getGenreBasedRecommendations(interest.interest_value, limit - recommendations.length);
                    
                    for (const rec of genreRecommendations) {
                        if (!seenArtists.has(rec.artist) && recommendations.length < limit) {
                            seenArtists.add(rec.artist);
                            recommendations.push({
                                ...rec,
                                reason: `Similar to your ${interest.interest_value} interest`
                            });
                        }
                    }
                }
            }

            // Sort by match score and metadata quality
            recommendations.sort((a, b) => {
                const aScore = (a.match || 0) + (a.metadata ? unifiedMetadataService.calculateMetadataQuality(a.metadata) * 0.1 : 0);
                const bScore = (b.match || 0) + (b.metadata ? unifiedMetadataService.calculateMetadataQuality(b.metadata) * 0.1 : 0);
                return bScore - aScore;
            });

            console.log(`✅ Generated ${recommendations.length} enhanced artist recommendations`);
            return recommendations.slice(0, limit);
        } catch (error) {
            console.error('❌ Failed to get enhanced artist recommendations:', error);
            return [];
        }
    }

    // Get genre-based recommendations
    async getGenreBasedRecommendations(genre, limit = 5) {
        try {
            // This would ideally query a database of artists by genre
            // For now, we'll return some popular artists in the genre
            const genreArtists = {
                'pop': ['Taylor Swift', 'Ed Sheeran', 'Ariana Grande', 'Justin Bieber', 'Dua Lipa'],
                'rock': ['Foo Fighters', 'Red Hot Chili Peppers', 'Green Day', 'Linkin Park', 'The Killers'],
                'hip hop': ['Drake', 'Kendrick Lamar', 'J. Cole', 'Travis Scott', 'Post Malone'],
                'country': ['Luke Combs', 'Morgan Wallen', 'Zach Bryan', 'Kane Brown', 'Chris Stapleton'],
                'r&b': ['The Weeknd', 'Bruno Mars', 'Frank Ocean', 'SZA', 'H.E.R.']
            };

            const artists = genreArtists[genre.toLowerCase()] || [];
            const recommendations = [];

            for (const artist of artists.slice(0, limit)) {
                const metadata = await unifiedMetadataService.getCachedMetadataOrNull(artist);
                if (!metadata) unifiedMetadataService.refreshMetadataInBackground(artist);
                recommendations.push({
                    artist: artist,
                    type: 'genre',
                    match: 0.8,
                    metadata: metadata
                });
            }

            return recommendations;
        } catch (error) {
            console.error(`Error getting genre-based recommendations for ${genre}:`, error);
            return [];
        }
    }

    // Simple distance calculation (you could replace this with a real geocoding service)
    calculateDistance(fromCity, fromState, toCity, toState) {
        // This is a simplified distance calculation
        // In a real implementation, you'd use geocoding APIs to get coordinates
        // and calculate actual distances
        
        if (fromCity === toCity && fromState === toState) {
            return 0; // Same city
        }
        
        if (fromState === toState) {
            return 100; // Same state, different city
        }
        
        // Very rough estimation based on state adjacency
        const stateDistances = {
            'NY': { 'NJ': 50, 'PA': 100, 'CT': 75, 'MA': 150 },
            'CA': { 'NV': 200, 'OR': 300, 'AZ': 400 },
            'TX': { 'OK': 150, 'AR': 200, 'LA': 250, 'NM': 300 },
            // Add more state relationships as needed
        };
        
        const distance = stateDistances[fromState]?.[toState] || 500;
        return distance;
    }

    // Database methods for managing artist aliases
    async createArtistAlias(primaryName, aliasName, confidence = 0.8) {
        try {
            const result = await pool.query(`
                INSERT INTO artist_aliases (primary_name, alias_name, confidence, created_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (primary_name, alias_name) 
                DO UPDATE SET confidence = $3, updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [primaryName.toLowerCase(), aliasName.toLowerCase(), confidence]);
            
            console.log(`✅ Created artist alias: ${primaryName} -> ${aliasName}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Failed to create artist alias:', error);
            throw error;
        }
    }

    async getArtistAliasesFromDB(artistName) {
        try {
            const result = await pool.query(`
                SELECT alias_name, confidence
                FROM artist_aliases 
                WHERE primary_name = $1 AND confidence >= 0.5
                ORDER BY confidence DESC
            `, [artistName.toLowerCase()]);
            
            return result.rows.map(row => row.alias_name);
        } catch (error) {
            console.error('❌ Failed to get artist aliases from DB:', error);
            return [];
        }
    }

    async updateArtistAliasConfidence(primaryName, aliasName, confidence) {
        try {
            const result = await pool.query(`
                UPDATE artist_aliases 
                SET confidence = $3, updated_at = CURRENT_TIMESTAMP
                WHERE primary_name = $1 AND alias_name = $2
                RETURNING *
            `, [primaryName.toLowerCase(), aliasName.toLowerCase(), confidence]);
            
            return result.rows[0];
        } catch (error) {
            console.error('❌ Failed to update artist alias confidence:', error);
            throw error;
        }
    }

    async learnArtistAliasFromEvent(eventArtist, userInterest) {
        try {
            // If the event artist matches a user interest, learn this as a potential alias
            const interest = userInterest.toLowerCase().trim();
            const artist = eventArtist.toLowerCase().trim();
            
            if (interest !== artist && this.calculateArtistMatchScore(interest, artist) > 50) {
                // This is a good potential alias
                await this.createArtistAlias(interest, artist, 0.7);
                console.log(`🎓 Learned new artist alias: ${interest} -> ${artist}`);
            }
        } catch (error) {
            console.error('❌ Failed to learn artist alias:', error);
        }
    }

    // Cache invalidation methods
    async invalidateUserCache(userId) {
        const patterns = [
            this.getUserInterestsKey(userId),
            this.getUserPreferencesKey(userId),
            `trips:${userId}:*`
        ];
        for (const pattern of patterns) {
            await this.invalidateCache(pattern);
            console.log(`[TripEngine] Invalidated cache for pattern: ${pattern}`);
        }
        console.log(`[TripEngine] Invalidated cache for user ${userId}`);
    }

    async invalidateEventCache(interestType, interestValue) {
        const pattern = this.getEventQueryKey(interestType, interestValue);
        await this.invalidateCache(pattern);
        console.log(`Invalidated event cache for ${interestType}:${interestValue}`);
    }

    async invalidateArtistCache(artistName) {
        const pattern = this.getArtistMetadataKey(artistName);
        await this.invalidateCache(pattern);
        console.log(`Invalidated artist cache for ${artistName}`);
    }

    // Method to clear all caches (for maintenance)
    async clearAllCaches() {
        const patterns = [
            'user:*',
            'events:*',
            'trips:*',
            'artist:*'
        ];
        
        for (const pattern of patterns) {
            await this.invalidateCache(pattern);
        }
        
        console.log('Cleared all caches');
    }

    // Advanced helper methods for enhanced scoring

    // Analyze user behavior patterns
    async analyzeUserBehavior(userId) {
        try {
            const cacheKey = `user:${userId}:behavior`;
            let behavior = await this.getCache(cacheKey);
            
            if (!behavior) {
                // Get user's past interactions and preferences
                const result = await pool.query(`
                    SELECT 
                        COUNT(*) as total_interactions,
                        AVG(CASE WHEN action_type = 'view' THEN 1 ELSE 0 END) as view_rate,
                        AVG(CASE WHEN action_type = 'book' THEN 1 ELSE 0 END) as booking_rate,
                        AVG(CASE WHEN action_type = 'like' THEN 1 ELSE 0 END) as like_rate,
                        AVG(price_range) as avg_price_preference,
                        AVG(distance_preference) as avg_distance_preference
                    FROM user_behavior 
                    WHERE user_id = $1
                `, [userId]);
                
                behavior = result.rows[0] || {
                    total_interactions: 0,
                    view_rate: 0.5,
                    booking_rate: 0.1,
                    like_rate: 0.3,
                    avg_price_preference: 100,
                    avg_distance_preference: 200
                };
                
                await this.setCache(cacheKey, behavior, this.cacheConfig.userBehavior.ttl);
            }
            
            return behavior;
        } catch (error) {
            console.warn('Error analyzing user behavior:', error);
            return {
                total_interactions: 0,
                view_rate: 0.5,
                booking_rate: 0.1,
                like_rate: 0.3,
                avg_price_preference: 100,
                avg_distance_preference: 200
            };
        }
    }

    // Collaborative filtering for artist recommendations
    async getCollaborativeRecommendations(userId, userInterests) {
        try {
            const artistInterests = userInterests.filter(i => i.interest_type === 'artist');
            if (artistInterests.length === 0) return [];
            
            const recommendations = [];
            
            for (const interest of artistInterests) {
                // Find users with similar interests
                const similarUsers = await pool.query(`
                    SELECT DISTINCT ui2.user_id, ui2.interest_value, ui2.priority
                    FROM user_interests ui1
                    JOIN user_interests ui2 ON ui1.interest_value = ui2.interest_value
                    WHERE ui1.user_id = $1 
                    AND ui1.interest_type = 'artist'
                    AND ui2.user_id != $1
                    AND ui2.interest_type = 'artist'
                    LIMIT 10
                `, [userId]);
                
                // Get their other interests as recommendations
                for (const similarUser of similarUsers.rows) {
                    const otherInterests = await pool.query(`
                        SELECT interest_value, priority
                        FROM user_interests
                        WHERE user_id = $1 
                        AND interest_type = 'artist'
                        AND interest_value != $2
                        ORDER BY priority DESC
                        LIMIT 5
                    `, [similarUser.user_id, interest.interest_value]);
                    
                    recommendations.push(...otherInterests.rows);
                }
            }
            
            // Aggregate and score recommendations
            const recommendationScores = {};
            recommendations.forEach(rec => {
                if (!recommendationScores[rec.interest_value]) {
                    recommendationScores[rec.interest_value] = 0;
                }
                recommendationScores[rec.interest_value] += rec.priority;
            });
            
            return Object.entries(recommendationScores)
                .map(([artist, score]) => ({ artist, score }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
                
        } catch (error) {
            console.warn('Error getting collaborative recommendations:', error);
            return [];
        }
    }

    // Dynamic pricing analysis
    async analyzePricingValue(event, userBehavior) {
        try {
            const basePrice = event.min_price || event.max_price || 50;
            const avgPricePreference = userBehavior.avg_price_preference || 100;
            
            // Calculate price value score (lower price = higher value)
            const priceRatio = basePrice / avgPricePreference;
            let priceValueScore = 0;
            
            if (priceRatio <= 0.5) {
                priceValueScore = 100; // Excellent value
            } else if (priceRatio <= 0.8) {
                priceValueScore = 80; // Good value
            } else if (priceRatio <= 1.2) {
                priceValueScore = 60; // Fair value
            } else if (priceRatio <= 1.5) {
                priceValueScore = 40; // Expensive
            } else {
                priceValueScore = 20; // Very expensive
            }
            
            // Adjust for event type (some types are naturally more expensive)
            const eventTypeMultiplier = {
                'concert': 1.0,
                'festival': 1.2,
                'comedy': 0.8,
                'theater': 1.1,
                'sports': 1.3
            };
            
            const multiplier = eventTypeMultiplier[event.event_type] || 1.0;
            priceValueScore *= multiplier;
            
            return Math.min(priceValueScore, 100);
        } catch (error) {
            console.warn('Error analyzing pricing value:', error);
            return 50; // Default neutral score
        }
    }

    // Get seasonal adjustment factor
    getSeasonalFactor(eventDate) {
        try {
            const month = new Date(eventDate).getMonth() + 1;
            return this.seasonalFactors[month] || 1.0;
        } catch (error) {
            console.warn('Error calculating seasonal factor:', error);
            return 1.0;
        }
    }

    // Calculate market trend score
    async getMarketTrendScore(artistName) {
        try {
            const cacheKey = `market:trend:${artistName.toLowerCase()}`;
            let trendScore = await this.getCache(cacheKey);
            
            if (trendScore === null) {
                // Analyze recent events and social media mentions
                const metadata = await unifiedMetadataService.getCachedMetadataOrNull(artistName);
                if (!metadata) unifiedMetadataService.refreshMetadataInBackground(artistName);
                
                if (metadata) {
                    // Base trend score on popularity and recent activity
                    trendScore = metadata.popularity_score || 50;
                    
                    // Boost for recent releases or announcements
                    if (metadata.recent_releases && metadata.recent_releases.length > 0) {
                        trendScore += 20;
                    }
                    
                    // Boost for social media activity
                    if (metadata.social_media) {
                        const socialActivity = Object.keys(metadata.social_media).length;
                        trendScore += Math.min(socialActivity * 5, 25);
                    }
                } else {
                    trendScore = 50; // Default neutral score
                }
                
                await this.setCache(cacheKey, trendScore, this.cacheConfig.marketTrends.ttl);
            }
            
            return trendScore;
        } catch (error) {
            console.warn('Error calculating market trend score:', error);
            return 50;
        }
    }

    // Enhanced distance scoring with user behavior
    calculateEnhancedDistanceScore(distance, userBehavior) {
        const avgDistancePreference = userBehavior.avg_distance_preference || 200;
        
        // Calculate distance preference alignment
        const distanceRatio = distance / avgDistancePreference;
        let distanceScore = 0;
        
        if (distanceRatio <= 0.5) {
            distanceScore = 100; // Much closer than preferred
        } else if (distanceRatio <= 0.8) {
            distanceScore = 90; // Closer than preferred
        } else if (distanceRatio <= 1.2) {
            distanceScore = 70; // Within preferred range
        } else if (distanceRatio <= 1.5) {
            distanceScore = 50; // Slightly further than preferred
        } else if (distanceRatio <= 2.0) {
            distanceScore = 30; // Much further than preferred
        } else {
            distanceScore = 10; // Very far from preferred
        }
        
        return distanceScore;
    }

    // Enhanced artist recommendations using collaborative filtering and advanced algorithms
    async getEnhancedArtistRecommendations(userId, limit = 10) {
        try {
            console.log(`🎯 Generating enhanced artist recommendations for user ${userId}`);
            
            // Get user interests
            const interestsResult = await pool.query(`
                SELECT interest_type, interest_value, priority
                FROM user_interests 
                WHERE user_id = $1 AND interest_type = 'artist'
                ORDER BY priority DESC
            `, [userId]);
            
            const userInterests = interestsResult.rows;
            if (userInterests.length === 0) {
                console.log('No artist interests found for user');
                return [];
            }

            // Get collaborative recommendations
            const collaborativeRecs = await this.getCollaborativeRecommendations(userId, userInterests);
            
            // Get user behavior for personalized scoring
            const userBehavior = await this.analyzeUserBehavior(userId);
            
            // Get user preferences for location-based filtering
            const userInfoResult = await pool.query(`
                SELECT city as home_city, state as home_state
                FROM users WHERE id = $1
            `, [userId]);
            
            const userInfo = userInfoResult.rows[0] || {};

            // Enhance recommendations with metadata and scoring
            const enhancedRecommendations = await Promise.all(
                collaborativeRecs.map(async (rec) => {
                    const metadata = await unifiedMetadataService.getCachedMetadataOrNull(rec.artist);
                    if (!metadata) unifiedMetadataService.refreshMetadataInBackground(rec.artist);
                    const marketTrendScore = await this.getMarketTrendScore(rec.artist);
                    
                    // Calculate recommendation score
                    let score = rec.score * 10; // Base collaborative score
                    
                    // Add popularity bonus
                    if (metadata && metadata.popularity_score) {
                        score += metadata.popularity_score * 0.3;
                    }
                    
                    // Add market trend bonus
                    score += marketTrendScore * 0.2;
                    
                    // Add genre diversity bonus
                    if (metadata && metadata.genres) {
                        const genreDiversity = this.calculateGenreDiversity(metadata.genres);
                        score += genreDiversity * 5;
                    }
                    
                    // Add verified artist bonus
                    if (metadata && metadata.verified) {
                        score += 20;
                    }
                    
                    // Add social media presence bonus
                    if (metadata && metadata.social_media) {
                        const socialPlatforms = Object.keys(metadata.social_media).length;
                        score += Math.min(socialPlatforms * 3, 15);
                    }
                    
                    // Add recent activity bonus
                    if (metadata && metadata.recent_releases && metadata.recent_releases.length > 0) {
                        score += metadata.recent_releases.length * 10;
                    }
                    
                    return {
                        artist: rec.artist,
                        score: Math.round(score),
                        metadata: metadata,
                        marketTrendScore: marketTrendScore,
                        collaborativeScore: rec.score
                    };
                })
            );

            // Sort by enhanced score and return top recommendations
            enhancedRecommendations.sort((a, b) => b.score - a.score);
            
            console.log(`Generated ${enhancedRecommendations.length} enhanced artist recommendations`);
            return enhancedRecommendations.slice(0, limit);
            
        } catch (error) {
            console.error('❌ Error generating enhanced artist recommendations:', error);
            return [];
        }
    }

    // Calculate genre diversity score
    calculateGenreDiversity(genres) {
        if (!genres || genres.length === 0) return 0;
        
        // More diverse genres get higher scores
        const uniqueGenres = new Set(genres.map(g => g.toLowerCase()));
        const diversityScore = Math.min(uniqueGenres.size * 10, 50); // Max 50 points for diversity
        
        return diversityScore;
    }

    // Helper: get user feedback for trip suggestions
    async getUserTripFeedback(userId) {
        const result = await pool.query(
            'SELECT trip_suggestion_id, feedback FROM user_trip_feedback WHERE user_id = $1',
            [userId]
        );
        // Map: tripId -> feedback
        const feedbackMap = {};
        for (const row of result.rows) {
            feedbackMap[row.trip_suggestion_id] = row.feedback;
        }
        return feedbackMap;
    }

    // Helper: compute similarity between two trips (0-1)
    computeTripSimilarity(tripA, tripB) {
        let score = 0;
        if (tripA.event_id && tripB.event_id && tripA.event_id === tripB.event_id) score += this.similarityWeights.event;
        if (tripA.artist && tripB.artist && tripA.artist === tripB.artist) score += this.similarityWeights.artist;
        if (tripA.venue_name && tripB.venue_name && tripA.venue_name === tripB.venue_name) score += this.similarityWeights.venue;
        if (tripA.venue_city && tripB.venue_city && tripA.venue_city === tripB.venue_city) score += this.similarityWeights.city;
        if (tripA.genre && tripB.genre && tripA.genre === tripB.genre) score += this.similarityWeights.genre;
        return score;
    }

    // Helper: get all previous feedback for a user
    async getAllUserFeedback(userId) {
        const result = await pool.query(
            'SELECT * FROM user_trip_feedback WHERE user_id = $1',
            [userId]
        );
        return result.rows;
    }

    // New: Get in-progress trip suggestions for polling
    async getInProgressTripSuggestions(userId) {
        const inProgressKey = `trips:inprogress:${userId}`;
        try {
            const items = await redisClient.lRange(inProgressKey, 0, -1);
            return items.map(item => {
                try { return JSON.parse(item); } catch { return null; }
            }).filter(Boolean);
        } catch (err) {
            console.warn('[TripEngine] Failed to get in-progress trip suggestions:', err);
            return [];
        }
    }

    // Helper: Detect tribute bands by name or metadata
    isTributeBand(artistName, artistMetadata) {
        const tributeKeywords = [
            'tribute', 'cover', 'revival', 'experience', 'project', 're-creation',
            'plays the music of', 'a tribute to', 'the music of', 'as ', 'tribute to',
            'homage', 'celebration of', 'revisited', 'replay', 'replay of', 'replay the music of',
            'replay as', 'replay tribute', 'homage to', 'tribute band', 'tribute show', 'tribute act'
        ];
        const name = (artistName || '').toLowerCase();
        if (tributeKeywords.some(keyword => name.includes(keyword))) return true;
        if (artistMetadata && artistMetadata.is_tribute) return true;
        if (artistMetadata && artistMetadata.genres && artistMetadata.genres.some(g => g.toLowerCase().includes('tribute'))) return true;
        return false;
    }

    async createTripSuggestion(userId, eventId, preferences = {}) {
        logger.info(`TRIP SUGGESTION: createTripSuggestion called for user ${userId}, event ${eventId}, preferences: ${JSON.stringify(preferences)}`);
        try {
            console.log(`🎯 Creating trip suggestion for user ${userId}, event ${eventId}`);
            // Get event details
            const eventResult = await pool.query(`
                SELECT id, external_id, name, artist, venue_name, venue_city, venue_state, 
                       event_date, ticket_url, min_price, max_price
                FROM events 
                WHERE id = $1
            `, [eventId]);
            if (eventResult.rows.length === 0) {
                throw new Error('Event not found');
            }
            const event = eventResult.rows[0];
            // Check for valid airports before proceeding
            const userAirport = preferences.primary_airport || preferences.primaryAirport;
            const eventAirport = await this.getEventPrimaryAirport(event.venue_city, event.venue_state);
            if (!userAirport || !eventAirport) {
                console.log(`[DEBUG] preferences object:`, preferences);
                console.log(`[DEBUG] event details:`, event);
                console.log(`❌ Skipping trip generation for event ${eventId}: missing airport (user: ${userAirport}, event: ${eventAirport})`);
                // TODO: Log this failure to a failedTrips array or DB for later user resolution
                return null;
            }
            // Search for travel options
            const travelOptions = await this.searchTravelOptions(event, preferences);
            // Calculate total cost
            console.log('🔍 Travel options for cost calculation:', JSON.stringify(travelOptions, null, 2));
            const totalCost = this.calculateTotalCost(travelOptions);
            console.log('💰 Calculated total cost:', totalCost);
            const serviceFee = this.calculateServiceFee(totalCost);
            console.log('💸 Calculated service fee:', serviceFee);
            // Check if suggestion already exists
            const existingSuggestion = await pool.query(`
                SELECT id FROM trip_suggestions 
                WHERE user_id = $1 AND event_id = $2
            `, [userId, eventId]);
            let tripSuggestion;
            if (existingSuggestion.rows.length > 0) {
                // Update existing suggestion
                const updateResult = await pool.query(`
                    UPDATE trip_suggestions 
                    SET total_cost = $3, service_fee = $4, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $1 AND event_id = $2
                    RETURNING *
                `, [userId, eventId, totalCost, serviceFee]);
                tripSuggestion = updateResult.rows[0];
                // Update trip components
                await this.saveTripComponents(tripSuggestion.id, travelOptions);
            } else {
                // Create new suggestion
                const insertResult = await pool.query(`
                    INSERT INTO trip_suggestions 
                    (user_id, event_id, total_cost, service_fee, status)
                    VALUES ($1, $2, $3, $4, 'pending')
                    RETURNING *
                `, [userId, eventId, totalCost, serviceFee]);
                tripSuggestion = insertResult.rows[0];
                // Save trip components
                await this.saveTripComponents(tripSuggestion.id, travelOptions);
            }
            // Get the complete suggestion with components
            const completeSuggestion = await this.getTripSuggestionWithDetails(tripSuggestion.id);
            console.log(`✅ Trip suggestion created: ${completeSuggestion.id}`);
            return completeSuggestion;
        } catch (error) {
            console.error('❌ Failed to create trip suggestion:', error);
            throw error;
        }
    }

    async searchTravelOptions(event, preferences = {}) {
        logger.info(`TRIP SUGGESTION: searchTravelOptions called for event ${event.id || event.name}`);
        console.log(`🔍 Searching travel options for event: ${event.name}`);
        const options = {
            flight: await this.searchFlights(event, preferences) || [],
            hotel: await this.searchHotels(event, preferences) || [],
            car: await this.searchRentalCars(event, preferences) || [],
            ticket: await this.searchTickets(event) || []
        };
        Object.keys(options).forEach(key => {
            if (!Array.isArray(options[key])) {
                console.warn(`⚠️ ${key} options is not an array:`, options[key]);
                options[key] = [];
            }
        });
        return options;
    }

    async searchRentalCars(event, preferences = {}) {
        logger.info(`TRIP SUGGESTION: searchRentalCars called for event ${event.id || event.name}`);
        // Normalize preferences for primary airport
        if (preferences.primary_airport && !preferences.primaryAirport) {
            preferences.primaryAirport = preferences.primary_airport;
        }
        if (preferences.primaryAirport && !preferences.primary_airport) {
            preferences.primary_airport = preferences.primaryAirport;
        }
        try {
            const primaryAirport = preferences.primary_airport || preferences.primaryAirport;
            if (!primaryAirport) {
                console.error('❌ Preferred airport is not set. Preferences object:', preferences);
                throw new Error('Preferred airport is not set. User must set a preferred airport.');
            }
            const destinationAirport = await this.getEventPrimaryAirport(event.venue_city, event.venue_state);
            if (!destinationAirport) {
                console.log(`❌ No airport found for ${event.venue_city}, ${event.venue_state}`);
                return [];
            }
            // Use event date for car rental search
            const eventDate = new Date(event.event_date);
            const pickupDate = new Date(eventDate);
            pickupDate.setDate(eventDate.getDate() - 1); // Arrival (same as flight arrival)
            const returnDate = new Date(eventDate);
            returnDate.setDate(eventDate.getDate() + 1); // Departure (same as flight departure)

            // Ensure pickup and return dates are today or in the future
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Allow searches for events happening today (pickup can be today)
            const pickupDateOnly = new Date(pickupDate);
            pickupDateOnly.setHours(0, 0, 0, 0);
            
            // Debug: Log the date comparison
            console.log('🔍 Car rental date comparison:', {
                eventDate: eventDate.toISOString(),
                pickupDate: pickupDate.toISOString(),
                returnDate: returnDate.toISOString(),
                today: today.toISOString(),
                pickupInPast: pickupDateOnly < today,
                returnInPast: returnDate < today
            });
            
            if (pickupDateOnly < today || returnDate < today) {
                console.log('❌ Rental car search skipped: pickup or return date is in the past.');
                return [];
            }

            // Format dates for Amadeus (ISO string with time)
            const pickupDateTime = pickupDate.toISOString().split('T')[0] + 'T10:00:00';
            const returnDateTime = returnDate.toISOString().split('T')[0] + 'T18:00:00';

            // Use Amadeus service for car rental search
            const cars = await amadeusService.searchCarRentals(
                destinationAirport, // Pick up at destination
                destinationAirport, // Return at destination (roundtrip)
                pickupDateTime,
                returnDateTime,
                10 // max results
            );
            return cars;
        } catch (error) {
            console.error('❌ Car rental search failed:', error);
            return [];
        }
    }

    async searchTickets(event) {
        logger.info(`TRIP SUGGESTION: searchTickets called for event ${event.id || event.name}`);
        try {
            // Use enhanced unified travel service for ticket search
            const searchResults = await enhancedUnifiedTravelService.searchTickets(
                event.name,
                event.venue_name,
                event.event_date,
                10 // max results
            );
            
            // Extract tickets from the unified results
            let tickets = searchResults.tickets || [];
            
            // If no results from enhanced service, fall back to Ticketmaster
            if (tickets.length === 0) {
                console.log('🔍 No enhanced ticket results, falling back to Ticketmaster search.');
                
                // Always use external_id (Ticketmaster event ID) if available
                if (event.external_id) {
                    const ticketmasterEvent = await eventService.getEventById(event.external_id);
                    if (!ticketmasterEvent) {
                        console.log(`❌ No Ticketmaster event found for id ${event.external_id}`);
                        return [];
                    }
                    const ticketOption = {
                        provider: 'ticketmaster',
                        price: ticketmasterEvent.minPrice || null,
                        maxPrice: ticketmasterEvent.maxPrice || null,
                        currency: ticketmasterEvent.currency || 'USD',
                        url: ticketmasterEvent.ticketUrl || null,
                        section: null,
                        row: null,
                        seat: null,
                        delivery: null,
                        details: ticketmasterEvent.info || ticketmasterEvent.pleaseNote || null
                    };
                    tickets = [ticketOption];
                } else {
                    // Fallback: search Ticketmaster by name, date, and venue
                    console.log('🔍 No external_id for event, searching Ticketmaster by name, date, and venue.');
                    const searchParams = {
                        keyword: event.name,
                        city: event.venue_city,
                        state: event.venue_state,
                        classificationName: 'music',
                        size: 5
                    };
                    if (event.event_date) {
                        // Use event_date as startDateTime and endDateTime for tight match
                        const date = new Date(event.event_date);
                        const isoDate = date.toISOString();
                        searchParams.startDateTime = isoDate;
                        searchParams.endDateTime = isoDate;
                    }
                    const result = await eventService.searchEvents(searchParams);
                    if (result && result.events && result.events.length > 0) {
                        // Try to find the best match by venue name and date
                        const bestMatch = result.events.find(e => {
                            const venueMatch = e.venueName && event.venue_name && e.venueName.toLowerCase() === event.venue_name.toLowerCase();
                            const dateMatch = e.eventDate && event.event_date && new Date(e.eventDate).toISOString().slice(0,10) === new Date(event.event_date).toISOString().slice(0,10);
                            return venueMatch && dateMatch;
                        }) || result.events[0];
                        if (bestMatch && bestMatch.externalId) {
                            const ticketmasterEvent = await eventService.getEventById(bestMatch.externalId);
                            if (ticketmasterEvent) {
                                const ticketOption = {
                                    provider: 'ticketmaster',
                                    price: ticketmasterEvent.minPrice || null,
                                    maxPrice: ticketmasterEvent.maxPrice || null,
                                    currency: ticketmasterEvent.currency || 'USD',
                                    url: ticketmasterEvent.ticketUrl || null,
                                    section: null,
                                    row: null,
                                    seat: null,
                                    delivery: null,
                                    details: ticketmasterEvent.info || ticketmasterEvent.pleaseNote || null
                                };
                                tickets = [ticketOption];
                            }
                        }
                    }
                    console.log('❌ No Ticketmaster event found by fallback search.');
                }
            }
            
            console.log(`✅ Enhanced ticket search found ${tickets.length} tickets from ${searchResults.providers?.length || 0} providers`);
            return tickets;
        } catch (error) {
            console.error('❌ Enhanced ticket search failed:', error);
            return [];
        }
    }
}

module.exports = new TripSuggestionEngine();
