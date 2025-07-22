const axios = require('axios');

class LastfmService {
    constructor() {
        this.baseUrl = 'https://ws.audioscrobbler.com/2.0';
        this.apiKey = process.env.LASTFM_API_KEY;
        this.rateLimitDelay = 500; // 500ms between requests (Last.fm requirement)
        this.lastRequestTime = 0;
    }

    // Rate limiting helper
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const delay = this.rateLimitDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.lastRequestTime = Date.now();
    }

    // Search for artist
    async searchArtist(artistName) {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm search');
                return null;
            }

            await this.rateLimit();
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.search',
                    artist: artistName,
                    api_key: this.apiKey,
                    format: 'json',
                    limit: 1
                }
            });

            if (response.data.results?.artistmatches?.artist?.length > 0) {
                return response.data.results.artistmatches.artist[0];
            }
            
            return null;
        } catch (error) {
            console.error('❌ Failed to search artist on Last.fm:', error.message);
            return null;
        }
    }

    // Get artist info
    async getArtistInfo(artistName) {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm info');
                return null;
            }

            await this.rateLimit();
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.getinfo',
                    artist: artistName,
                    api_key: this.apiKey,
                    format: 'json',
                    autocorrect: 1
                }
            });

            return response.data.artist || null;
        } catch (error) {
            console.error('❌ Failed to get artist info from Last.fm:', error.message);
            return null;
        }
    }

    // Get artist tags
    async getArtistTags(artistName) {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm tags');
                return [];
            }

            await this.rateLimit();
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.gettoptags',
                    artist: artistName,
                    api_key: this.apiKey,
                    format: 'json',
                    autocorrect: 1
                }
            });

            return response.data.toptags?.tag || [];
        } catch (error) {
            console.error('❌ Failed to get artist tags from Last.fm:', error.message);
            return [];
        }
    }

    // Get similar artists
    async getSimilarArtists(artistName, limit = 10) {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm similar artists');
                return [];
            }

            await this.rateLimit();
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.getsimilar',
                    artist: artistName,
                    api_key: this.apiKey,
                    format: 'json',
                    autocorrect: 1,
                    limit: limit
                }
            });

            return response.data.similarartists?.artist || [];
        } catch (error) {
            console.error('❌ Failed to get similar artists from Last.fm:', error.message);
            return [];
        }
    }

    // Get artist top tracks
    async getArtistTopTracks(artistName, limit = 10) {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm top tracks');
                return [];
            }

            await this.rateLimit();
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.gettoptracks',
                    artist: artistName,
                    api_key: this.apiKey,
                    format: 'json',
                    autocorrect: 1,
                    limit: limit
                }
            });

            return response.data.toptracks?.track || [];
        } catch (error) {
            console.error('❌ Failed to get artist top tracks from Last.fm:', error.message);
            return [];
        }
    }

    // Get artist top albums
    async getArtistTopAlbums(artistName, limit = 10) {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm top albums');
                return [];
            }

            await this.rateLimit();
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.gettopalbums',
                    artist: artistName,
                    api_key: this.apiKey,
                    format: 'json',
                    autocorrect: 1,
                    limit: limit
                }
            });

            return response.data.topalbums?.album || [];
        } catch (error) {
            console.error('❌ Failed to get artist top albums from Last.fm:', error.message);
            return [];
        }
    }

    // Get artist listeners count
    async getArtistListeners(artistName) {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm listeners');
                return 0;
            }

            await this.rateLimit();
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.getinfo',
                    artist: artistName,
                    api_key: this.apiKey,
                    format: 'json',
                    autocorrect: 1
                }
            });

            const stats = response.data.artist?.stats;
            if (stats) {
                return parseInt(stats.listeners) || 0;
            }
            
            return 0;
        } catch (error) {
            console.error('❌ Failed to get artist listeners from Last.fm:', error.message);
            return 0;
        }
    }

    // Get artist play count
    async getArtistPlayCount(artistName) {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm play count');
                return 0;
            }

            await this.rateLimit();
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'artist.getinfo',
                    artist: artistName,
                    api_key: this.apiKey,
                    format: 'json',
                    autocorrect: 1
                }
            });

            const stats = response.data.artist?.stats;
            if (stats) {
                return parseInt(stats.playcount) || 0;
            }
            
            return 0;
        } catch (error) {
            console.error('❌ Failed to get artist play count from Last.fm:', error.message);
            return 0;
        }
    }

    // Comprehensive artist metadata fetch from Last.fm
    async getComprehensiveArtistMetadata(artistName) {
        try {
            console.log(`🎵 Fetching Last.fm metadata for: ${artistName}`);
            
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm metadata');
                return null;
            }

            // Get all artist data in parallel
            const [info, tags, similar, topTracks, topAlbums] = await Promise.all([
                this.getArtistInfo(artistName),
                this.getArtistTags(artistName),
                this.getSimilarArtists(artistName, 5),
                this.getArtistTopTracks(artistName, 5),
                this.getArtistTopAlbums(artistName, 3)
            ]);

            if (!info) {
                console.log(`⚠️ Artist not found on Last.fm: ${artistName}`);
                return null;
            }

            // Extract genres from tags
            const genres = tags
                .filter(tag => tag.count > 10) // Only tags with significant count
                .map(tag => tag.name)
                .slice(0, 10); // Limit to top 10

            // Calculate popularity score based on listeners and play count
            const listeners = parseInt(info.stats?.listeners) || 0;
            const playCount = parseInt(info.stats?.playcount) || 0;
            const popularityScore = this.calculatePopularityScore(listeners, playCount);

            // Extract social media from bio
            const socialMedia = this.extractSocialMediaFromBio(info.bio?.content || '');

            // Prepare metadata object
            const metadata = {
                artist_name: info.name,
                lastfm_url: info.url,
                genres: genres,
                country: info.tags?.tag?.find(tag => 
                    tag.name.toLowerCase().includes('country') || 
                    tag.name.toLowerCase().includes('nationality')
                )?.name || null,
                active_since: this.extractActiveSince(info.bio?.content || ''),
                biography: info.bio?.summary || info.bio?.content || null,
                social_media: socialMedia,
                wikipedia_url: Array.isArray(info.bio?.links?.link) ? info.bio.links.link.find(link => 
                    link.href.includes('wikipedia.org')
                )?.href : null,
                official_website: Array.isArray(info.bio?.links?.link) ? info.bio.links.link.find(link => 
                    link.href.includes('official') || link.href.includes('www')
                )?.href : null,
                awards: {}, // Last.fm doesn't provide awards
                collaborations: this.extractCollaborations(similar),
                tour_history: {}, // Last.fm doesn't provide tour history
                latest_release: this.extractLatestRelease(topAlbums),
                image_urls: {
                    lastfm: info.image?.map(img => ({
                        size: img.size,
                        url: img['#text']
                    })) || []
                },
                tags: genres,
                verified: false, // Last.fm doesn't provide verification status
                popularity_score: popularityScore,
                followers_count: listeners, // Use listeners as follower count
                monthly_listeners: Math.round(listeners * 0.1), // Rough estimate
                record_label: this.extractRecordLabel(info.bio?.content || ''),
                language: this.detectLanguage(info.name, genres),
                apple_music_id: null, // Last.fm doesn't provide Apple Music IDs
                youtube_channel_id: null, // Last.fm doesn't provide YouTube IDs
                spotify_id: null // Last.fm doesn't provide Spotify IDs
            };

            console.log(`✅ Fetched Last.fm metadata for: ${artistName}`);
            return metadata;
        } catch (error) {
            console.error('❌ Failed to get comprehensive artist metadata from Last.fm:', error);
            return null;
        }
    }

    // Calculate popularity score based on Last.fm data
    calculatePopularityScore(listeners, playCount) {
        // Normalize listeners (0-100 scale)
        const listenerScore = Math.min(listeners / 1000000 * 100, 100);
        
        // Normalize play count (0-100 scale)
        const playScore = Math.min(playCount / 10000000 * 100, 100);
        
        // Weighted average (listeners more important than play count)
        return Math.round((listenerScore * 0.7) + (playScore * 0.3));
    }

    // Extract social media from bio
    extractSocialMediaFromBio(bio) {
        const socialMedia = {};
        
        // Simple regex patterns for social media
        const patterns = {
            facebook: /facebook\.com\/([^\s]+)/gi,
            twitter: /(?:twitter\.com|x\.com)\/([^\s]+)/gi,
            instagram: /instagram\.com\/([^\s]+)/gi,
            youtube: /youtube\.com\/([^\s]+)/gi,
            tiktok: /tiktok\.com\/([^\s]+)/gi
        };

        Object.entries(patterns).forEach(([platform, pattern]) => {
            const match = bio.match(pattern);
            if (match) {
                socialMedia[platform] = match[0];
            }
        });

        return socialMedia;
    }

    // Extract active since from bio
    extractActiveSince(bio) {
        const yearMatch = bio.match(/(?:formed|started|active since|since)\s+(\d{4})/i);
        if (yearMatch) {
            return parseInt(yearMatch[1]);
        }
        
        // Look for year patterns
        const yearPattern = bio.match(/\b(19|20)\d{2}\b/);
        if (yearPattern) {
            return parseInt(yearPattern[0]);
        }
        
        return null;
    }

    // Extract collaborations from similar artists
    extractCollaborations(similarArtists) {
        if (!Array.isArray(similarArtists)) {
            return [];
        }
        return similarArtists.slice(0, 5).map(artist => ({
            artist: artist.name,
            type: 'similar',
            match: parseFloat(artist.match) || 0
        }));
    }

    // Extract latest release from top albums
    extractLatestRelease(topAlbums) {
        if (!topAlbums || topAlbums.length === 0) return {};
        
        const latestAlbum = topAlbums[0];
        return {
            name: latestAlbum.name,
            type: 'album',
            release_date: null, // Last.fm doesn't provide release dates
            tracks: null // Last.fm doesn't provide track counts
        };
    }

    // Extract record label from bio
    extractRecordLabel(bio) {
        const labelMatch = bio.match(/(?:signed to|label|recorded for)\s+([^,\.]+)/i);
        if (labelMatch) {
            return labelMatch[1].trim();
        }
        return null;
    }

    // Detect language from artist name and genres
    detectLanguage(artistName, genres) {
        const name = artistName.toLowerCase();
        const genreString = Array.isArray(genres) ? genres.join(' ').toLowerCase() : '';
        
        if (name.includes('ñ') || genreString.includes('spanish') || genreString.includes('latin')) {
            return 'Spanish';
        }
        if (name.includes('é') || name.includes('è') || name.includes('à') || genreString.includes('french')) {
            return 'French';
        }
        if (name.includes('ä') || name.includes('ö') || name.includes('ü') || genreString.includes('german')) {
            return 'German';
        }
        
        return 'English'; // Default
    }

    // Get trending artists (based on Last.fm charts)
    async getTrendingArtists(limit = 20) {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm trending');
                return [];
            }

            await this.rateLimit();
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'chart.gettopartists',
                    api_key: this.apiKey,
                    format: 'json',
                    limit: limit
                }
            });

            return response.data.artists?.artist || [];
        } catch (error) {
            console.error('❌ Failed to get trending artists from Last.fm:', error.message);
            return [];
        }
    }

    // Get top tags (genres)
    async getTopTags(limit = 50) {
        try {
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping Last.fm top tags');
                return [];
            }

            await this.rateLimit();
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    method: 'tag.gettopartists',
                    tag: 'rock', // Use a popular tag to get top artists
                    api_key: this.apiKey,
                    format: 'json',
                    limit: limit
                }
            });

            return response.data.topartists?.artist || [];
        } catch (error) {
            console.error('❌ Failed to get top tags from Last.fm:', error.message);
            return [];
        }
    }

    // Batch fetch metadata for multiple artists
    async batchFetchMetadata(artistNames, limit = 10) {
        try {
            console.log(`🔄 Starting batch Last.fm fetch for ${artistNames.length} artists`);
            
            if (!this.apiKey) {
                console.warn('⚠️ Last.fm API key not configured, skipping batch fetch');
                return { results: [], successCount: 0, errorCount: artistNames.length, total: artistNames.length };
            }

            const results = [];
            let successCount = 0;
            let errorCount = 0;

            for (const artistName of artistNames.slice(0, limit)) {
                try {
                    console.log(`🎵 Processing: ${artistName}`);
                    const metadata = await this.getComprehensiveArtistMetadata(artistName);
                    if (metadata) {
                        results.push(metadata);
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`❌ Error processing ${artistName}:`, error);
                    errorCount++;
                }
            }

            console.log(`✅ Batch Last.fm fetch complete: ${successCount} success, ${errorCount} errors`);
            return { results, successCount, errorCount, total: artistNames.length };
        } catch (error) {
            console.error('❌ Failed to batch fetch metadata from Last.fm:', error);
            throw error;
        }
    }
}

module.exports = new LastfmService(); 