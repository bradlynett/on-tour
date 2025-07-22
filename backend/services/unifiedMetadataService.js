const ArtistMetadataService = require('./artistMetadataService');
const MusicBrainzService = require('./musicBrainzService');
const LastfmService = require('./lastfmService');
const { redisClient } = require('../redisClient'); // Import shared Redis client

class UnifiedMetadataService {
    constructor() {
        this.spotifyService = ArtistMetadataService;
        this.musicBrainzService = MusicBrainzService;
        this.lastfmService = LastfmService;
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    }

    // Get comprehensive metadata from all sources
    async getComprehensiveMetadata(artistName) {
        try {
            console.log(`🎵 Getting comprehensive metadata for: ${artistName}`);
            
            const cacheKey = `unified_${this.normalizeArtistName(artistName)}`;
            
            // Check Redis cache first
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < this.cacheTimeout) {
                    console.log(`✅ Returning cached metadata for: ${artistName}`);
                    return parsed.data;
                }
                await redisClient.del(cacheKey);
            }

            // Fetch from all sources in parallel
            const [spotifyData, musicBrainzData, lastfmData] = await Promise.allSettled([
                this.spotifyService.enrichArtistMetadataFromSpotify(artistName),
                this.musicBrainzService.getComprehensiveArtistMetadata(artistName),
                this.lastfmService.getComprehensiveArtistMetadata(artistName)
            ]);

            // Merge data from all sources
            const unifiedMetadata = this.mergeMetadataSources(
                artistName,
                spotifyData.status === 'fulfilled' ? spotifyData.value : null,
                musicBrainzData.status === 'fulfilled' ? musicBrainzData.value : null,
                lastfmData.status === 'fulfilled' ? lastfmData.value : null
            );

            // Cache the result in Redis
            await redisClient.set(cacheKey, JSON.stringify({ data: unifiedMetadata, timestamp: Date.now() }), { EX: 600 });

            console.log(`✅ Generated unified metadata for: ${artistName}`);
            return unifiedMetadata;
        } catch (error) {
            console.error('❌ Failed to get comprehensive metadata:', error);
            return null;
        }
    }

    // Get cached metadata only (do not fetch from external sources)
    async getCachedMetadataOrNull(artistName) {
        try {
            const cacheKey = `unified_${this.normalizeArtistName(artistName)}`;
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < this.cacheTimeout) {
                    return parsed.data;
                }
            }
            return null;
        } catch (error) {
            console.warn('[UnifiedMetadataService] getCachedMetadataOrNull error:', error);
            return null;
        }
    }

    // Trigger background refresh for metadata
    async refreshMetadataInBackground(artistName) {
        setTimeout(async () => {
            try {
                await this.getComprehensiveMetadata(artistName);
                console.log(`[UnifiedMetadataService] [BG] Refreshed metadata for: ${artistName}`);
            } catch (err) {
                console.warn(`[UnifiedMetadataService] [BG] Failed to refresh metadata for: ${artistName}`, err);
            }
        }, 0);
    }

    // Merge metadata from multiple sources with intelligent conflict resolution
    mergeMetadataSources(artistName, spotifyData, musicBrainzData, lastfmData) {
        // Ensure all data sources are objects to prevent errors
        spotifyData = spotifyData || {};
        musicBrainzData = musicBrainzData || {};
        lastfmData = lastfmData || {};
        
        const merged = {
            artist_name: artistName,
            normalized_name: this.normalizeArtistName(artistName),
            genres: [],
            popularity_score: 0,
            followers_count: 0,
            monthly_listeners: 0,
            country: null,
            language: null,
            active_since: null,
            record_label: null,
            social_media: {},
            spotify_id: null,
            apple_music_id: null,
            youtube_channel_id: null,
            musicbrainz_id: null,
            lastfm_url: null,
            wikipedia_url: null,
            official_website: null,
            biography: null,
            awards: {},
            collaborations: [],
            tour_history: {},
            latest_release: {},
            image_urls: {},
            tags: [],
            verified: false,
            metadata_sources: []
        };

        // Track which sources provided data
        if (spotifyData) merged.metadata_sources.push('spotify');
        if (musicBrainzData) merged.metadata_sources.push('musicbrainz');
        if (lastfmData) merged.metadata_sources.push('lastfm');

        // Merge genres (union of all sources, prioritize Spotify)
        const allGenres = new Set();
        if (Array.isArray(spotifyData?.genres)) {
            spotifyData.genres.forEach(genre => allGenres.add(genre.toLowerCase()));
        }
        if (Array.isArray(musicBrainzData?.genres)) {
            musicBrainzData.genres.forEach(genre => allGenres.add(genre.toLowerCase()));
        }
        if (Array.isArray(lastfmData?.genres)) {
            lastfmData.genres.forEach(genre => allGenres.add(genre.toLowerCase()));
        }
        merged.genres = Array.from(allGenres).slice(0, 15); // Limit to 15 genres

        // Merge popularity scores (weighted average)
        const popularityScores = [];
        if (spotifyData?.popularity_score) popularityScores.push({ score: spotifyData.popularity_score, weight: 0.5 });
        if (musicBrainzData?.popularity_score) popularityScores.push({ score: musicBrainzData.popularity_score, weight: 0.3 });
        if (lastfmData?.popularity_score) popularityScores.push({ score: lastfmData.popularity_score, weight: 0.2 });
        
        if (popularityScores.length > 0) {
            const totalWeight = popularityScores.reduce((sum, item) => sum + item.weight, 0);
            merged.popularity_score = Math.round(
                popularityScores.reduce((sum, item) => sum + (item.score * item.weight), 0) / totalWeight
            );
        }

        // Merge follower counts (use highest)
        const followerCounts = [
            spotifyData?.followers_count,
            lastfmData?.followers_count
        ].filter(count => count && count > 0);
        
        if (followerCounts.length > 0) {
            merged.followers_count = Math.max(...followerCounts);
        }

        // Merge monthly listeners (use highest)
        const monthlyListeners = [
            spotifyData?.monthly_listeners,
            lastfmData?.monthly_listeners
        ].filter(count => count && count > 0);
        
        if (monthlyListeners.length > 0) {
            merged.monthly_listeners = Math.max(...monthlyListeners);
        }

        // Merge country (prioritize MusicBrainz, then Spotify)
        merged.country = musicBrainzData?.country || spotifyData?.country || lastfmData?.country || null;

        // Merge language (prioritize MusicBrainz, then Last.fm)
        merged.language = musicBrainzData?.language || lastfmData?.language || spotifyData?.language || 'English';

        // Merge active since (use earliest)
        const activeYears = [
            spotifyData?.active_since,
            musicBrainzData?.active_since,
            lastfmData?.active_since
        ].filter(year => year && year > 1900);
        
        if (activeYears.length > 0) {
            merged.active_since = Math.min(...activeYears);
        }

        // Merge record label (prioritize MusicBrainz, then Last.fm)
        merged.record_label = musicBrainzData?.record_label || lastfmData?.record_label || spotifyData?.record_label || null;

        // Merge social media (combine all sources)
        merged.social_media = {
            ...spotifyData?.social_media,
            ...musicBrainzData?.social_media,
            ...lastfmData?.social_media
        };

        // Merge IDs
        merged.spotify_id = spotifyData?.spotify_id || null;
        merged.apple_music_id = spotifyData?.apple_music_id || musicBrainzData?.apple_music_id || null;
        merged.youtube_channel_id = spotifyData?.youtube_channel_id || musicBrainzData?.youtube_channel_id || null;
        merged.musicbrainz_id = musicBrainzData?.musicbrainz_id || null;
        merged.lastfm_url = lastfmData?.lastfm_url || null;

        // Merge URLs (prioritize MusicBrainz for Wikipedia, then Last.fm)
        merged.wikipedia_url = musicBrainzData?.wikipedia_url || lastfmData?.wikipedia_url || null;
        merged.official_website = musicBrainzData?.official_website || lastfmData?.official_website || spotifyData?.official_website || null;

        // Merge biography (prioritize MusicBrainz, then Last.fm, then Spotify)
        merged.biography = musicBrainzData?.biography || lastfmData?.biography || spotifyData?.biography || null;

        // Merge awards (combine all sources)
        merged.awards = {
            ...spotifyData?.awards,
            ...musicBrainzData?.awards,
            ...lastfmData?.awards
        };

        // Merge collaborations (combine all sources)
        const allCollaborations = [
            ...(Array.isArray(spotifyData?.collaborations) ? spotifyData.collaborations : []),
            ...(Array.isArray(musicBrainzData?.collaborations) ? musicBrainzData.collaborations : []),
            ...(Array.isArray(lastfmData?.collaborations) ? lastfmData.collaborations : [])
        ];
        merged.collaborations = this.deduplicateCollaborations(allCollaborations);

        // Merge tour history (combine all sources)
        merged.tour_history = {
            ...spotifyData?.tour_history,
            ...musicBrainzData?.tour_history,
            ...lastfmData?.tour_history
        };

        // Merge latest release (prioritize Spotify, then MusicBrainz, then Last.fm)
        merged.latest_release = spotifyData?.latest_release || musicBrainzData?.latest_release || lastfmData?.latest_release || {};

        // Merge image URLs (combine all sources)
        merged.image_urls = {
            ...spotifyData?.image_urls,
            ...musicBrainzData?.image_urls,
            ...lastfmData?.image_urls
        };

        // Merge tags (union of all sources)
        const allTags = new Set();
        if (Array.isArray(spotifyData?.tags)) spotifyData.tags.forEach(tag => allTags.add(tag.toLowerCase()));
        if (Array.isArray(musicBrainzData?.tags)) musicBrainzData.tags.forEach(tag => allTags.add(tag.toLowerCase()));
        if (Array.isArray(lastfmData?.tags)) lastfmData.tags.forEach(tag => allTags.add(tag.toLowerCase()));
        merged.tags = Array.from(allTags).slice(0, 20); // Limit to 20 tags

        // Merge verification status (any source can verify)
        merged.verified = spotifyData?.verified || musicBrainzData?.verified || lastfmData?.verified || false;

        return merged;
    }

    // Deduplicate collaborations
    deduplicateCollaborations(collaborations) {
        const seen = new Set();
        return collaborations.filter(collab => {
            const key = `${collab.artist}-${collab.type}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    // Normalize artist name
    normalizeArtistName(artistName) {
        if (!artistName) return '';
        
        return artistName
            .toLowerCase()
            .trim()
            .replace(/[^\w\s\-&]/g, '') // Remove special characters except hyphens and ampersands
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    // Get metadata with fallback strategy
    async getMetadataWithFallback(artistName) {
        try {
            console.log(`🎵 Getting metadata with fallback for: ${artistName}`);
            
            // Try unified metadata first
            const unified = await this.getComprehensiveMetadata(artistName);
            if (unified && unified.metadata_sources.length > 0) {
                return unified;
            }

            // Fallback to individual sources
            const sources = [
                { name: 'Spotify', service: this.spotifyService, method: 'enrichArtistMetadataFromSpotify' },
                { name: 'MusicBrainz', service: this.musicBrainzService, method: 'getComprehensiveArtistMetadata' },
                { name: 'Last.fm', service: this.lastfmService, method: 'getComprehensiveArtistMetadata' }
            ];

            for (const source of sources) {
                try {
                    console.log(`🔄 Trying ${source.name} as fallback...`);
                    const data = await source.service[source.method](artistName);
                    if (data) {
                        console.log(`✅ Found data from ${source.name}`);
                        return data;
                    }
                } catch (error) {
                    console.warn(`⚠️ ${source.name} fallback failed:`, error.message);
                }
            }

            console.log(`⚠️ No metadata found for: ${artistName}`);
            return null;
        } catch (error) {
            console.error('❌ Failed to get metadata with fallback:', error);
            return null;
        }
    }

    // Batch populate metadata for multiple artists
    async batchPopulateMetadata(artistNames, limit = 20) {
        try {
            console.log(`🔄 Starting batch metadata population for ${artistNames.length} artists`);
            
            const results = [];
            let successCount = 0;
            let errorCount = 0;

            for (const artistName of artistNames.slice(0, limit)) {
                try {
                    console.log(`🎵 Processing: ${artistName}`);
                    const metadata = await this.getMetadataWithFallback(artistName);
                    if (metadata) {
                        // Save to database
                        const saved = await this.spotifyService.upsertArtistMetadata(metadata);
                        if (saved) {
                            results.push(saved);
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    } else {
                        errorCount++;
                    }
                    
                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    console.error(`❌ Error processing ${artistName}:`, error);
                    errorCount++;
                }
            }

            console.log(`✅ Batch population complete: ${successCount} success, ${errorCount} errors`);
            return { results, successCount, errorCount, total: artistNames.length };
        } catch (error) {
            console.error('❌ Failed to batch populate metadata:', error);
            throw error;
        }
    }

    // Get metadata quality score
    calculateMetadataQuality(metadata) {
        if (!metadata) return 0;
        
        let score = 0;
        const maxScore = 100;

        // Basic info (20 points)
        if (metadata.artist_name) score += 5;
        if (metadata.genres && metadata.genres.length > 0) score += 5;
        if (metadata.country) score += 2;
        if (metadata.language) score += 2;
        if (metadata.active_since) score += 2;
        if (metadata.record_label) score += 2;
        if (metadata.biography) score += 2;

        // Social presence (20 points)
        if (metadata.spotify_id) score += 5;
        if (metadata.musicbrainz_id) score += 5;
        if (metadata.lastfm_url) score += 5;
        if (metadata.social_media && Object.keys(metadata.social_media).length > 0) score += 5;

        // Popularity metrics (20 points)
        if (metadata.popularity_score > 0) score += 10;
        if (metadata.followers_count > 0) score += 5;
        if (metadata.monthly_listeners > 0) score += 5;

        // Rich content (20 points)
        if (metadata.collaborations && metadata.collaborations.length > 0) score += 5;
        if (metadata.latest_release && Object.keys(metadata.latest_release).length > 0) score += 5;
        if (metadata.image_urls && Object.keys(metadata.image_urls).length > 0) score += 5;
        if (metadata.tags && metadata.tags.length > 0) score += 5;

        // Data sources (20 points)
        const sourceCount = metadata.metadata_sources?.length || 0;
        score += Math.min(sourceCount * 7, 20); // 7 points per source, max 20

        return Math.min(score, maxScore);
    }

    // Get metadata statistics
    async getMetadataStatistics() {
        try {
            const stats = {
                total_artists: 0,
                with_spotify: 0,
                with_musicbrainz: 0,
                with_lastfm: 0,
                with_multiple_sources: 0,
                average_quality: 0,
                quality_distribution: {
                    excellent: 0, // 80-100
                    good: 0,      // 60-79
                    fair: 0,      // 40-59
                    poor: 0       // 0-39
                }
            };

            // Get all metadata from database
            const result = await this.spotifyService.pool.query(`
                SELECT * FROM artist_metadata 
                ORDER BY updated_at DESC
            `);

            stats.total_artists = result.rows.length;

            for (const metadata of result.rows) {
                // Count sources
                if (metadata.spotify_id) stats.with_spotify++;
                if (metadata.musicbrainz_id) stats.with_musicbrainz++;
                if (metadata.lastfm_url) stats.with_lastfm++;

                // Count multiple sources
                let sourceCount = 0;
                if (metadata.spotify_id) sourceCount++;
                if (metadata.musicbrainz_id) sourceCount++;
                if (metadata.lastfm_url) sourceCount++;
                if (sourceCount > 1) stats.with_multiple_sources++;

                // Calculate quality score
                const quality = this.calculateMetadataQuality(metadata);
                stats.average_quality += quality;

                // Quality distribution
                if (quality >= 80) stats.quality_distribution.excellent++;
                else if (quality >= 60) stats.quality_distribution.good++;
                else if (quality >= 40) stats.quality_distribution.fair++;
                else stats.quality_distribution.poor++;
            }

            if (stats.total_artists > 0) {
                stats.average_quality = Math.round(stats.average_quality / stats.total_artists);
            }

            return stats;
        } catch (error) {
            console.error('❌ Failed to get metadata statistics:', error);
            return null;
        }
    }

    // Clear cache for all unified metadata (optional, for admin/maintenance)
    async clearCache() {
        // This will delete all keys matching 'unified_*' (Redis SCAN/DEL pattern)
        const keys = await redisClient.keys('unified_*');
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
        console.log('✅ Unified metadata Redis cache cleared');
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            timeout: this.cacheTimeout
        };
    }
}

module.exports = new UnifiedMetadataService(); 