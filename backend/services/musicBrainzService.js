const axios = require('axios');

class MusicBrainzService {
    constructor() {
        this.baseUrl = 'https://musicbrainz.org/ws/2';
        this.userAgent = 'ConcertTravelApp/1.0.0 (https://github.com/your-repo)';
        this.rateLimitDelay = 1000; // 1 second between requests (MusicBrainz requirement)
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

    // Search for artist by name
    async searchArtist(artistName) {
        try {
            await this.rateLimit();
            
            const response = await axios.get(`${this.baseUrl}/artist`, {
                params: {
                    query: `name:"${artistName}"`,
                    fmt: 'json',
                    limit: 5
                },
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            if (response.data.artists && response.data.artists.length > 0) {
                return response.data.artists[0]; // Return the best match
            }
            
            return null;
        } catch (error) {
            console.error('❌ Failed to search artist on MusicBrainz:', error.message);
            return null;
        }
    }

    // Get detailed artist information
    async getArtistDetails(mbid) {
        try {
            await this.rateLimit();
            
            const response = await axios.get(`${this.baseUrl}/artist/${mbid}`, {
                params: {
                    fmt: 'json',
                    inc: 'releases+tags+ratings+url-rels+artist-rels'
                },
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            return response.data;
        } catch (error) {
            console.error('❌ Failed to get artist details from MusicBrainz:', error.message);
            return null;
        }
    }

    // Get artist releases (albums, singles, etc.)
    async getArtistReleases(mbid, limit = 10) {
        try {
            await this.rateLimit();
            
            const response = await axios.get(`${this.baseUrl}/release`, {
                params: {
                    artist: mbid,
                    fmt: 'json',
                    limit: limit,
                    status: 'official'
                },
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            return response.data.releases || [];
        } catch (error) {
            console.error('❌ Failed to get artist releases from MusicBrainz:', error.message);
            return [];
        }
    }

    // Get artist relationships (collaborations, influences, etc.)
    async getArtistRelationships(mbid) {
        try {
            await this.rateLimit();
            
            const response = await axios.get(`${this.baseUrl}/artist/${mbid}`, {
                params: {
                    fmt: 'json',
                    inc: 'artist-rels'
                },
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            return response.data.relations || [];
        } catch (error) {
            console.error('❌ Failed to get artist relationships from MusicBrainz:', error.message);
            return [];
        }
    }

    // Get artist tags (genres, styles, etc.)
    async getArtistTags(mbid) {
        try {
            await this.rateLimit();
            
            const response = await axios.get(`${this.baseUrl}/artist/${mbid}`, {
                params: {
                    fmt: 'json',
                    inc: 'tags'
                },
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            return response.data.tags || [];
        } catch (error) {
            console.error('❌ Failed to get artist tags from MusicBrainz:', error.message);
            return [];
        }
    }

    // Get artist rating
    async getArtistRating(mbid) {
        try {
            await this.rateLimit();
            
            const response = await axios.get(`${this.baseUrl}/artist/${mbid}`, {
                params: {
                    fmt: 'json',
                    inc: 'ratings'
                },
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            return response.data.rating || null;
        } catch (error) {
            console.error('❌ Failed to get artist rating from MusicBrainz:', error.message);
            return null;
        }
    }

    // Get artist URLs (official website, social media, etc.)
    async getArtistUrls(mbid) {
        try {
            await this.rateLimit();
            
            const response = await axios.get(`${this.baseUrl}/artist/${mbid}`, {
                params: {
                    fmt: 'json',
                    inc: 'url-rels'
                },
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            return response.data.relations || [];
        } catch (error) {
            console.error('❌ Failed to get artist URLs from MusicBrainz:', error.message);
            return [];
        }
    }

    // Comprehensive artist metadata fetch
    async getComprehensiveArtistMetadata(artistName) {
        try {
            console.log(`🎵 Fetching comprehensive metadata for: ${artistName}`);
            
            // Search for artist
            const artist = await this.searchArtist(artistName);
            if (!artist) {
                console.log(`⚠️ Artist not found on MusicBrainz: ${artistName}`);
                return null;
            }

            // Get detailed information
            const [details, releases, relationships, tags, rating, urls] = await Promise.all([
                this.getArtistDetails(artist.id),
                this.getArtistReleases(artist.id, 5),
                this.getArtistRelationships(artist.id),
                this.getArtistTags(artist.id),
                this.getArtistRating(artist.id),
                this.getArtistUrls(artist.id)
            ]);

            // Extract genres from tags
            const genres = tags
                .filter(tag => tag.count > 1) // Only tags with multiple votes
                .map(tag => tag.name)
                .slice(0, 10); // Limit to top 10

            // Extract social media URLs
            const socialMedia = {};
            urls.forEach(relation => {
                if (relation.type === 'social network') {
                    const platform = this.extractPlatformFromUrl(relation.url.resource);
                    if (platform) {
                        socialMedia[platform] = relation.url.resource;
                    }
                }
            });

            // Extract official website
            const officialWebsite = urls.find(relation => 
                relation.type === 'official homepage'
            )?.url.resource;

            // Extract Wikipedia URL
            const wikipediaUrl = urls.find(relation => 
                relation.type === 'wikipedia'
            )?.url.resource;

            // Prepare metadata object
            const metadata = {
                artist_name: artist.name,
                musicbrainz_id: artist.id,
                genres: genres,
                country: artist.country || null,
                active_since: artist['life-span']?.begin ? 
                    parseInt(artist['life-span'].begin.split('-')[0]) : null,
                biography: this.extractBiography(artist),
                social_media: socialMedia,
                wikipedia_url: wikipediaUrl,
                official_website: officialWebsite,
                awards: {}, // MusicBrainz doesn't provide awards
                collaborations: this.extractCollaborations(relationships),
                tour_history: {}, // MusicBrainz doesn't provide tour history
                latest_release: this.extractLatestRelease(releases),
                image_urls: {}, // MusicBrainz doesn't provide images
                tags: genres,
                verified: false, // MusicBrainz doesn't provide verification status
                popularity_score: rating ? Math.round(rating.value * 20) : 0, // Convert 0-5 to 0-100
                followers_count: 0, // MusicBrainz doesn't provide follower counts
                monthly_listeners: 0, // MusicBrainz doesn't provide listener counts
                record_label: this.extractRecordLabel(relationships),
                language: this.detectLanguage(artist.name, genres),
                apple_music_id: null, // MusicBrainz doesn't provide Apple Music IDs
                youtube_channel_id: null, // MusicBrainz doesn't provide YouTube IDs
                spotify_id: null // MusicBrainz doesn't provide Spotify IDs
            };

            console.log(`✅ Fetched comprehensive metadata for: ${artistName}`);
            return metadata;
        } catch (error) {
            console.error('❌ Failed to get comprehensive artist metadata from MusicBrainz:', error);
            return null;
        }
    }

    // Helper method to extract platform from URL
    extractPlatformFromUrl(url) {
        if (url.includes('facebook.com')) return 'facebook';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
        if (url.includes('instagram.com')) return 'instagram';
        if (url.includes('youtube.com')) return 'youtube';
        if (url.includes('tiktok.com')) return 'tiktok';
        return null;
    }

    // Helper method to extract biography
    extractBiography(artist) {
        if (artist.disambiguation) {
            return artist.disambiguation;
        }
        
        let bio = '';
        if (artist['life-span']?.begin) {
            bio += `Active since ${artist['life-span'].begin}. `;
        }
        if (artist.country) {
            bio += `From ${artist.country}. `;
        }
        if (artist.type) {
            bio += `Type: ${artist.type}.`;
        }
        
        return bio.trim() || null;
    }

    // Helper method to extract collaborations
    extractCollaborations(relationships) {
        const collaborations = [];
        
        relationships.forEach(relation => {
            if (relation.type === 'collaboration' || relation.type === 'member of band') {
                collaborations.push({
                    artist: relation.artist?.name || relation['target-credit']?.name,
                    type: relation.type,
                    begin: relation.begin,
                    end: relation.end
                });
            }
        });
        
        return collaborations;
    }

    // Helper method to extract latest release
    extractLatestRelease(releases) {
        if (!releases || releases.length === 0) return {};
        
        const latestRelease = releases[0]; // Already sorted by date
        return {
            name: latestRelease.title,
            type: latestRelease['release-group']?.['primary-type'] || 'album',
            release_date: latestRelease.date,
            tracks: latestRelease['track-count'] || 0
        };
    }

    // Helper method to extract record label
    extractRecordLabel(relationships) {
        const labelRelation = relationships.find(relation => 
            relation.type === 'label' && relation.label
        );
        
        return labelRelation?.label?.name || null;
    }

    // Helper method to detect language
    detectLanguage(artistName, genres) {
        // Simple language detection based on artist name and genres
        const name = artistName.toLowerCase();
        const genreString = genres.join(' ').toLowerCase();
        
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

    // Batch fetch metadata for multiple artists
    async batchFetchMetadata(artistNames, limit = 10) {
        try {
            console.log(`🔄 Starting batch MusicBrainz fetch for ${artistNames.length} artists`);
            
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

            console.log(`✅ Batch MusicBrainz fetch complete: ${successCount} success, ${errorCount} errors`);
            return { results, successCount, errorCount, total: artistNames.length };
        } catch (error) {
            console.error('❌ Failed to batch fetch metadata from MusicBrainz:', error);
            throw error;
        }
    }
}

module.exports = new MusicBrainzService(); 