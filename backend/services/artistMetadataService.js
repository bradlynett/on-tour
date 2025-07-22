const { pool } = require('../config/database');
const SpotifyWebApi = require('spotify-web-api-node');
const { redisClient } = require('../redisClient'); // Import shared Redis client

class ArtistMetadataService {
    constructor() {
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Initialize Spotify API for metadata fetching
        this.spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET
        });
    }

    // Get artist metadata by name
    async getArtistMetadata(artistName) {
        try {
            const normalizedName = this.normalizeArtistName(artistName);
            const cacheKey = `metadata_${normalizedName}`;
            // Check Redis cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
                    return parsed.data;
                }
                await redisClient.del(cacheKey);
            }
            const result = await pool.query(`
                SELECT * FROM artist_metadata 
                WHERE normalized_name = $1
            `, [normalizedName]);
            if (result.rows.length === 0) {
                return null;
            }
            const metadata = result.rows[0];
            // Cache the result in Redis
            await redisClient.set(cacheKey, JSON.stringify({ data: metadata, timestamp: Date.now() }), { EX: 300 });
            return metadata;
        } catch (error) {
            console.error('❌ Failed to get artist metadata:', error);
            return null;
        }
    }

    // Search artists by genre
    async searchArtistsByGenre(genre, limit = 20) {
        try {
            const result = await pool.query(`
                SELECT * FROM search_artists_by_genre($1)
                LIMIT $2
            `, [genre, limit]);

            return result.rows;
        } catch (error) {
            console.error('❌ Failed to search artists by genre:', error);
            return [];
        }
    }

    // Get artists by genre (alias for searchArtistsByGenre)
    async getArtistsByGenre(genre, limit = 20) {
        return this.searchArtistsByGenre(genre, limit);
    }

    // Get similar artists based on genres and popularity
    async getSimilarArtists(artistName, limit = 10) {
        try {
            const metadata = await this.getArtistMetadata(artistName);
            if (!metadata || !metadata.genres) {
                return [];
            }

            const result = await pool.query(`
                SELECT 
                    am.*,
                    COUNT(*) OVER() as total_count,
                    (
                        CASE 
                            WHEN $1 = ANY(am.genres) THEN 100
                            WHEN array_length(array_intersection($1, am.genres), 1) > 0 THEN 80
                            ELSE 0
                        END
                    ) + (am.popularity_score * 0.1) as similarity_score
                FROM artist_metadata am
                WHERE am.normalized_name != $2
                AND am.genres && $1
                ORDER BY similarity_score DESC
                LIMIT $3
            `, [metadata.genres, metadata.normalized_name, limit]);

            return result.rows;
        } catch (error) {
            console.error('❌ Failed to get similar artists:', error);
            return [];
        }
    }

    // Get popular artists by genre
    async getPopularArtistsByGenre(genre, limit = 20) {
        try {
            const result = await pool.query(`
                SELECT * FROM artist_metadata 
                WHERE $1 = ANY(genres)
                ORDER BY popularity_score DESC, followers_count DESC
                LIMIT $2
            `, [genre, limit]);

            return result.rows;
        } catch (error) {
            console.error('❌ Failed to get popular artists by genre:', error);
            return [];
        }
    }

    // Create or update artist metadata
    async upsertArtistMetadata(metadata) {
        try {
            const {
                artist_name,
                genres = [],
                popularity_score = 0,
                followers_count = 0,
                country = null,
                language = null,
                active_since = null,
                record_label = null,
                social_media = {},
                spotify_id = null,
                apple_music_id = null,
                youtube_channel_id = null,
                wikipedia_url = null,
                official_website = null,
                biography = null,
                awards = {},
                collaborations = {},
                tour_history = {},
                latest_release = {},
                image_urls = {},
                tags = [],
                verified = false
            } = metadata;

            const normalizedName = this.normalizeArtistName(artist_name);

            const result = await pool.query(`
                INSERT INTO artist_metadata (
                    artist_name, normalized_name, genres, popularity_score, followers_count,
                    country, language, active_since, record_label, social_media,
                    spotify_id, apple_music_id, youtube_channel_id, wikipedia_url,
                    official_website, biography, awards, collaborations, tour_history,
                    latest_release, image_urls, tags, verified
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                ON CONFLICT (normalized_name) 
                DO UPDATE SET
                    artist_name = EXCLUDED.artist_name,
                    genres = EXCLUDED.genres,
                    popularity_score = EXCLUDED.popularity_score,
                    followers_count = EXCLUDED.followers_count,
                    country = EXCLUDED.country,
                    language = EXCLUDED.language,
                    active_since = EXCLUDED.active_since,
                    record_label = EXCLUDED.record_label,
                    social_media = EXCLUDED.social_media,
                    spotify_id = EXCLUDED.spotify_id,
                    apple_music_id = EXCLUDED.apple_music_id,
                    youtube_channel_id = EXCLUDED.youtube_channel_id,
                    wikipedia_url = EXCLUDED.wikipedia_url,
                    official_website = EXCLUDED.official_website,
                    biography = EXCLUDED.biography,
                    awards = EXCLUDED.awards,
                    collaborations = EXCLUDED.collaborations,
                    tour_history = EXCLUDED.tour_history,
                    latest_release = EXCLUDED.latest_release,
                    image_urls = EXCLUDED.image_urls,
                    tags = EXCLUDED.tags,
                    verified = EXCLUDED.verified,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [
                artist_name, normalizedName, genres, popularity_score, followers_count,
                country, language, active_since, record_label, social_media,
                spotify_id, apple_music_id, youtube_channel_id, wikipedia_url,
                official_website, biography, awards, collaborations, tour_history,
                latest_release, image_urls, tags, verified
            ]);

            // Clear Redis cache for this artist
            await redisClient.del(`metadata_${normalizedName}`);

            console.log(`✅ Upserted artist metadata for: ${artist_name}`);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Failed to upsert artist metadata:', error);
            throw error;
        }
    }

    // NEW: Search for artist on Spotify
    async searchArtistOnSpotify(artistName) {
        try {
            if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
                console.warn('⚠️ Spotify credentials not configured, skipping Spotify search');
                return null;
            }

            // Get client credentials token
            await this.refreshSpotifyToken();

            const searchResult = await this.spotifyApi.searchArtists(artistName, { limit: 1 });
            
            if (searchResult.body.artists.items.length > 0) {
                return searchResult.body.artists.items[0];
            }
            
            return null;
        } catch (error) {
            console.error('❌ Failed to search artist on Spotify:', error);
            return null;
        }
    }

    // NEW: Get detailed artist info from Spotify
    async getSpotifyArtistDetails(spotifyId) {
        try {
            if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
                console.warn('⚠️ Spotify credentials not configured, skipping Spotify details');
                return null;
            }

            // Get client credentials token
            await this.refreshSpotifyToken();

            const artist = await this.spotifyApi.getArtist(spotifyId);
            const topTracks = await this.spotifyApi.getArtistTopTracks(spotifyId, 'US');
            const albums = await this.spotifyApi.getArtistAlbums(spotifyId, { limit: 5 });

            return {
                ...artist.body,
                top_tracks: topTracks.body.tracks,
                albums: albums.body.items
            };
        } catch (error) {
            console.error('❌ Failed to get Spotify artist details:', error);
            return null;
        }
    }

    // NEW: Enrich artist metadata from Spotify
    async enrichArtistMetadataFromSpotify(artistName) {
        try {
            console.log(`🎵 Enriching metadata for: ${artistName}`);
            
            // Search for artist on Spotify
            const spotifyArtist = await this.searchArtistOnSpotify(artistName);
            if (!spotifyArtist) {
                console.log(`⚠️ Artist not found on Spotify: ${artistName}`);
                return null;
            }

            // Get detailed info
            const detailedInfo = await this.getSpotifyArtistDetails(spotifyArtist.id);
            
            // Prepare metadata object
            const enrichedMetadata = {
                artist_name: spotifyArtist.name,
                genres: spotifyArtist.genres || [],
                popularity_score: spotifyArtist.popularity || 0,
                followers_count: spotifyArtist.followers?.total || 0,
                spotify_id: spotifyArtist.id,
                image_urls: {
                    spotify: spotifyArtist.images || []
                },
                social_media: {
                    spotify: `https://open.spotify.com/artist/${spotifyArtist.id}`
                },
                verified: false, // Spotify doesn't provide verification status
                tags: spotifyArtist.genres || [] // Use genres as tags
            };

            // Add detailed info if available
            if (detailedInfo) {
                enrichedMetadata.latest_release = {
                    top_tracks: detailedInfo.top_tracks?.slice(0, 5).map(track => ({
                        name: track.name,
                        spotify_id: track.id,
                        popularity: track.popularity
                    })) || [],
                    recent_albums: detailedInfo.albums?.slice(0, 3).map(album => ({
                        name: album.name,
                        spotify_id: album.id,
                        release_date: album.release_date,
                        album_type: album.album_type
                    })) || []
                };
            }

            // Upsert to database
            const result = await this.upsertArtistMetadata(enrichedMetadata);
            
            console.log(`✅ Enriched metadata for: ${artistName}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to enrich artist metadata from Spotify:', error);
            return null;
        }
    }

    // NEW: Refresh Spotify access token (client credentials)
    async refreshSpotifyToken() {
        try {
            const data = await this.spotifyApi.clientCredentialsGrant();
            this.spotifyApi.setAccessToken(data.body.access_token);
            console.log('✅ Refreshed Spotify client credentials token');
        } catch (error) {
            console.error('❌ Failed to refresh Spotify token:', error);
            throw error;
        }
    }

    // NEW: Ensure artist has metadata (fetch if missing)
    async ensureArtistMetadata(artistName) {
        try {
            // Check if metadata exists
            const existingMetadata = await this.getArtistMetadata(artistName);
            
            if (existingMetadata && existingMetadata.spotify_id) {
                console.log(`✅ Metadata already exists for: ${artistName}`);
                return existingMetadata;
            }

            // If no metadata or no Spotify ID, enrich from Spotify
            if (!existingMetadata || !existingMetadata.spotify_id) {
                console.log(`🔄 Fetching metadata for: ${artistName}`);
                return await this.enrichArtistMetadataFromSpotify(artistName);
            }

            return existingMetadata;
        } catch (error) {
            console.error('❌ Failed to ensure artist metadata:', error);
            return null;
        }
    }

    // NEW: Batch populate missing metadata
    async populateMissingMetadata(limit = 50) {
        try {
            console.log(`🔄 Starting batch metadata population (limit: ${limit})`);
            
            // Get artists from events table that don't have metadata
            const result = await pool.query(`
                SELECT DISTINCT e.artist 
                FROM events e
                LEFT JOIN artist_metadata am ON LOWER(e.artist) = am.normalized_name
                WHERE e.artist IS NOT NULL 
                AND e.artist != ''
                AND am.id IS NULL
                LIMIT $1
            `, [limit]);

            const artists = result.rows.map(row => row.artist);
            console.log(`📊 Found ${artists.length} artists without metadata`);

            let successCount = 0;
            let errorCount = 0;

            for (const artist of artists) {
                try {
                    console.log(`🎵 Processing: ${artist}`);
                    const enriched = await this.enrichArtistMetadataFromSpotify(artist);
                    if (enriched) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                    
                    // Rate limiting - wait 1 second between requests
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`❌ Error processing ${artist}:`, error);
                    errorCount++;
                }
            }

            console.log(`✅ Batch population complete: ${successCount} success, ${errorCount} errors`);
            return { successCount, errorCount, total: artists.length };
        } catch (error) {
            console.error('❌ Failed to populate missing metadata:', error);
            throw error;
        }
    }

    // Update popularity score for an artist
    async updatePopularityScore(artistName, popularityScore) {
        try {
            const normalizedName = this.normalizeArtistName(artistName);
            
            const result = await pool.query(`
                UPDATE artist_metadata 
                SET popularity_score = $2, updated_at = CURRENT_TIMESTAMP
                WHERE normalized_name = $1
                RETURNING *
            `, [normalizedName, popularityScore]);

            // Clear Redis cache
            await redisClient.del(`metadata_${normalizedName}`);

            if (result.rows.length > 0) {
                console.log(`✅ Updated popularity score for ${artistName}: ${popularityScore}`);
                return result.rows[0];
            } else {
                console.warn(`⚠️ Artist not found: ${artistName}`);
                return null;
            }
        } catch (error) {
            console.error('❌ Failed to update popularity score:', error);
            throw error;
        }
    }

    // Add tags to an artist
    async addArtistTags(artistName, tags) {
        try {
            const normalizedName = this.normalizeArtistName(artistName);
            
            const result = await pool.query(`
                UPDATE artist_metadata 
                SET tags = array_append(tags, $2), updated_at = CURRENT_TIMESTAMP
                WHERE normalized_name = $1
                RETURNING *
            `, [normalizedName, tags]);

            // Clear Redis cache
            await redisClient.del(`metadata_${normalizedName}`);

            if (result.rows.length > 0) {
                console.log(`✅ Added tags to ${artistName}: ${tags}`);
                return result.rows[0];
            } else {
                console.warn(`⚠️ Artist not found: ${artistName}`);
                return null;
            }
        } catch (error) {
            console.error('❌ Failed to add artist tags:', error);
            throw error;
        }
    }

    // Get trending artists
    async getTrendingArtists(limit = 20) {
        try {
            const result = await pool.query(`
                SELECT * FROM artist_metadata 
                WHERE verified = true OR popularity_score >= 70
                ORDER BY popularity_score DESC, followers_count DESC
                LIMIT $1
            `, [limit]);

            return result.rows;
        } catch (error) {
            console.error('❌ Failed to get trending artists:', error);
            return [];
        }
    }

    // Get artists by country
    async getArtistsByCountry(country, limit = 20) {
        try {
            const result = await pool.query(`
                SELECT * FROM artist_metadata 
                WHERE LOWER(country) = LOWER($1)
                ORDER BY popularity_score DESC
                LIMIT $2
            `, [country, limit]);

            return result.rows;
        } catch (error) {
            console.error('❌ Failed to get artists by country:', error);
            return [];
        }
    }

    // Search artists by name
    async searchArtists(searchTerm, limit = 20) {
        try {
            const result = await pool.query(`
                SELECT * FROM artist_metadata 
                WHERE LOWER(artist_name) LIKE LOWER($1)
                OR LOWER(normalized_name) LIKE LOWER($1)
                ORDER BY popularity_score DESC
                LIMIT $2
            `, [`%${searchTerm}%`, limit]);

            return result.rows;
        } catch (error) {
            console.error('❌ Failed to search artists:', error);
            return [];
        }
    }

    // Advanced search with multiple criteria
    async searchArtistsAdvanced(criteria) {
        try {
            const {
                query = '',
                genres = [],
                minPopularity = 0,
                maxPopularity = 100,
                country = '',
                language = '',
                limit = 20
            } = criteria;

            let sql = `
                SELECT * FROM artist_metadata 
                WHERE 1=1
            `;
            const params = [];
            let paramIndex = 1;

            // Add search query
            if (query) {
                sql += ` AND (LOWER(artist_name) LIKE LOWER($${paramIndex}) OR LOWER(normalized_name) LIKE LOWER($${paramIndex}))`;
                params.push(`%${query}%`);
                paramIndex++;
            }

            // Add genre filter
            if (genres.length > 0) {
                sql += ` AND genres && $${paramIndex}`;
                params.push(genres);
                paramIndex++;
            }

            // Add popularity range
            sql += ` AND popularity_score BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(minPopularity, maxPopularity);
            paramIndex += 2;

            // Add country filter
            if (country) {
                sql += ` AND LOWER(country) = LOWER($${paramIndex})`;
                params.push(country);
                paramIndex++;
            }

            // Add language filter
            if (language) {
                sql += ` AND LOWER(language) = LOWER($${paramIndex})`;
                params.push(language);
                paramIndex++;
            }

            sql += ` ORDER BY popularity_score DESC LIMIT $${paramIndex}`;
            params.push(limit);

            const result = await pool.query(sql, params);
            return result.rows;
        } catch (error) {
            console.error('❌ Failed to search artists advanced:', error);
            return [];
        }
    }

    // Get genre statistics
    async getGenreStatistics() {
        try {
            const result = await pool.query(`
                SELECT 
                    unnest(genres) as genre,
                    COUNT(*) as artist_count,
                    AVG(popularity_score) as avg_popularity
                FROM artist_metadata 
                WHERE genres IS NOT NULL AND array_length(genres, 1) > 0
                GROUP BY unnest(genres)
                ORDER BY artist_count DESC
            `);

            return result.rows;
        } catch (error) {
            console.error('❌ Failed to get genre statistics:', error);
            return [];
        }
    }

    // Get artist recommendations based on user interests
    async getArtistRecommendations(userInterests, limit = 10) {
        try {
            if (!userInterests || userInterests.length === 0) {
                return [];
            }

            // Extract artist and genre interests
            const artistInterests = userInterests
                .filter(interest => interest.interest_type === 'artist')
                .map(interest => interest.interest_value);
            
            const genreInterests = userInterests
                .filter(interest => interest.interest_type === 'genre')
                .map(interest => interest.interest_value);

            let recommendations = [];

            // Get recommendations based on artist interests
            for (const artistInterest of artistInterests) {
                const similar = await this.getSimilarArtists(artistInterest, Math.ceil(limit / artistInterests.length));
                recommendations.push(...similar);
            }

            // Get recommendations based on genre interests
            for (const genreInterest of genreInterests) {
                const genreArtists = await this.getPopularArtistsByGenre(genreInterest, Math.ceil(limit / genreInterests.length));
                recommendations.push(...genreArtists);
            }

            // Remove duplicates and sort by popularity
            const uniqueRecommendations = recommendations
                .filter((rec, index, self) => 
                    index === self.findIndex(r => r.id === rec.id)
                )
                .sort((a, b) => b.popularity_score - a.popularity_score)
                .slice(0, limit);

            return uniqueRecommendations;
        } catch (error) {
            console.error('❌ Failed to get artist recommendations:', error);
            return [];
        }
    }

    // Normalize artist name for consistent matching
    normalizeArtistName(artistName) {
        if (!artistName) return '';
        
        return artistName
            .toLowerCase()
            .trim()
            .replace(/[^\w\s\-&]/g, '') // Remove special characters except hyphens and ampersands
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    // Clear cache for all artists (optional, for admin/maintenance)
    async clearCache() {
        // This will delete all keys matching 'metadata_*' (Redis SCAN/DEL pattern)
        const keys = await redisClient.keys('metadata_*');
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        console.log('✅ Artist metadata Redis cache cleared');
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            timeout: this.cacheTimeout
        };
    }
}

module.exports = new ArtistMetadataService(); 