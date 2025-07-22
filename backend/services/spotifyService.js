const SpotifyWebApi = require('spotify-web-api-node');
const { pool } = require('../config/database');

class SpotifyService {
    constructor() {
        this.spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/spotify'
        });
    }

    // Generate authorization URL
    getAuthorizationUrl(state) {
        // Check if credentials are configured
        if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
            throw new Error('Spotify credentials not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.');
        }

        const scopes = [
            'user-top-read',
            'user-read-recently-played',
            'user-read-private',
            'playlist-read-private',
            'user-follow-read'
        ];

        console.log('🔍 Debug: Requesting Spotify scopes:', scopes);
        
        // Only show dialog if user hasn't authorized before
        const url = this.spotifyApi.createAuthorizeURL(scopes, state, {
            show_dialog: false
        });
        
        console.log('🔍 Debug: Full authorization URL:', url);
        return url;
    }

    // Exchange authorization code for access token
    async getAccessToken(code) {
        try {
            const data = await this.spotifyApi.authorizationCodeGrant(code);
            console.log('🔍 Debug: Access token response scopes:', data.body.scope);
            console.log('🔍 Debug: Token type:', data.body.token_type);
            console.log('🔍 Debug: Expires in:', data.body.expires_in);
            return {
                accessToken: data.body.access_token,
                refreshToken: data.body.refresh_token,
                expiresIn: data.body.expires_in
            };
        } catch (error) {
            console.error('Error getting access token:', error);
            throw new Error('Failed to get access token');
        }
    }

    // Refresh access token
    async refreshAccessToken(refreshToken) {
        try {
            this.spotifyApi.setRefreshToken(refreshToken);
            const data = await this.spotifyApi.refreshAccessToken();
            return {
                accessToken: data.body.access_token,
                expiresIn: data.body.expires_in
            };
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw new Error('Failed to refresh access token');
        }
    }

    // Get user's top artists
    async getTopArtists(accessToken, timeRange = 'medium_term', limit = 20) {
        try {
            this.spotifyApi.setAccessToken(accessToken);
            const data = await this.spotifyApi.getMyTopArtists({
                time_range: timeRange,
                limit: limit
            });
            return data.body.items;
        } catch (error) {
            console.error('Error getting top artists:', error);
            console.error('Error details:', {
                message: error.message,
                statusCode: error.statusCode,
                body: error.body,
                headers: error.headers
            });
            throw new Error('Failed to get top artists');
        }
    }

    // Get user's top tracks
    async getTopTracks(accessToken, timeRange = 'medium_term', limit = 20) {
        try {
            this.spotifyApi.setAccessToken(accessToken);
            const data = await this.spotifyApi.getMyTopTracks({
                time_range: timeRange,
                limit: limit
            });
            return data.body.items;
        } catch (error) {
            console.error('Error getting top tracks:', error);
            console.error('Error details:', {
                message: error.message,
                statusCode: error.statusCode,
                body: error.body,
                headers: error.headers
            });
            throw new Error('Failed to get top tracks');
        }
    }

    // Get user's recently played tracks
    async getRecentlyPlayed(accessToken, limit = 20) {
        try {
            this.spotifyApi.setAccessToken(accessToken);
            const data = await this.spotifyApi.getMyRecentlyPlayedTracks({
                limit: limit
            });
            return data.body.items;
        } catch (error) {
            console.error('Error getting recently played:', error);
            throw new Error('Failed to get recently played tracks');
        }
    }

    // Get user's playlists
    async getUserPlaylists(accessToken, limit = 20) {
        try {
            this.spotifyApi.setAccessToken(accessToken);
            const data = await this.spotifyApi.getUserPlaylists({
                limit: limit
            });
            return data.body.items;
        } catch (error) {
            console.error('Error getting user playlists:', error);
            throw new Error('Failed to get user playlists');
        }
    }

    // Get user's followed artists
    async getFollowedArtists(accessToken, limit = 20) {
        try {
            this.spotifyApi.setAccessToken(accessToken);
            const data = await this.spotifyApi.getFollowedArtists({
                limit: limit
            });
            return data.body.artists.items;
        } catch (error) {
            console.error('Error getting followed artists:', error);
            throw new Error('Failed to get followed artists');
        }
    }

    // Get user profile
    async getUserProfile(accessToken) {
        try {
            this.spotifyApi.setAccessToken(accessToken);
            const data = await this.spotifyApi.getMe();
            return data.body;
        } catch (error) {
            console.error('Error getting user profile:', error);
            console.error('Error details:', {
                message: error.message,
                statusCode: error.statusCode,
                body: error.body,
                headers: error.headers
            });
            throw new Error('Failed to get user profile');
        }
    }

    // Extract genres from artists
    extractGenresFromArtists(artists) {
        const genreCount = {};
        if (!artists || !Array.isArray(artists)) {
            return [];
        }
        
        artists.forEach(artist => {
            if (artist && artist.genres && Array.isArray(artist.genres)) {
                artist.genres.forEach(genre => {
                    genreCount[genre] = (genreCount[genre] || 0) + 1;
                });
            }
        });
        
        // Sort genres by frequency and return top ones
        return Object.entries(genreCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([genre]) => genre);
    }

    // Get comprehensive user music data
    async getUserMusicData(accessToken) {
        try {
            console.log('🔍 Debug: Starting getUserMusicData with token length:', accessToken ? accessToken.length : 0);
            console.log('🔍 Debug: Token starts with:', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
            
            // Test the token with a simple API call first
            try {
                this.spotifyApi.setAccessToken(accessToken);
                const testProfile = await this.spotifyApi.getMe();
                console.log('✅ Debug: Token test successful, user ID:', testProfile.body.id);
            } catch (testError) {
                console.error('❌ Debug: Token test failed:', testError.message);
                console.error('❌ Debug: Error details:', testError);
                throw new Error(`Access token validation failed: ${testError.message}`);
            }

            // Test each API call individually to isolate the issue
            console.log('🔍 Debug: Testing individual API calls...');
            
            let topArtists, topTracks, recentlyPlayed, playlists, followedArtists, userProfile;
            
            try {
                console.log('🔍 Debug: Testing getTopArtists...');
                topArtists = await this.getTopArtists(accessToken);
                console.log('✅ Debug: getTopArtists successful, count:', topArtists.length);
            } catch (error) {
                console.error('❌ Debug: getTopArtists failed:', error.message);
                topArtists = [];
            }
            
            try {
                console.log('🔍 Debug: Testing getTopTracks...');
                topTracks = await this.getTopTracks(accessToken);
                console.log('✅ Debug: getTopTracks successful, count:', topTracks.length);
            } catch (error) {
                console.error('❌ Debug: getTopTracks failed:', error.message);
                topTracks = [];
            }
            
            try {
                console.log('🔍 Debug: Testing getRecentlyPlayed...');
                recentlyPlayed = await this.getRecentlyPlayed(accessToken);
                console.log('✅ Debug: getRecentlyPlayed successful, count:', recentlyPlayed.length);
            } catch (error) {
                console.error('❌ Debug: getRecentlyPlayed failed:', error.message);
                recentlyPlayed = [];
            }
            
            try {
                console.log('🔍 Debug: Testing getUserPlaylists...');
                playlists = await this.getUserPlaylists(accessToken);
                console.log('✅ Debug: getUserPlaylists successful, count:', playlists.length);
            } catch (error) {
                console.error('❌ Debug: getUserPlaylists failed:', error.message);
                playlists = [];
            }
            
            try {
                console.log('🔍 Debug: Testing getFollowedArtists...');
                followedArtists = await this.getFollowedArtists(accessToken);
                console.log('✅ Debug: getFollowedArtists successful, count:', followedArtists.length);
            } catch (error) {
                console.error('❌ Debug: getFollowedArtists failed:', error.message);
                followedArtists = [];
            }
            
            try {
                console.log('🔍 Debug: Testing getUserProfile...');
                userProfile = await this.getUserProfile(accessToken);
                console.log('✅ Debug: getUserProfile successful, user ID:', userProfile.id);
            } catch (error) {
                console.error('❌ Debug: getUserProfile failed:', error.message);
                userProfile = null;
            }

            // Extract genres from all artists
            const allArtists = [
                ...topArtists,
                ...followedArtists,
                ...recentlyPlayed.map(item => item.track.artists).flat(),
                ...topTracks.map(track => track.artists).flat()
            ];

            const genres = this.extractGenresFromArtists(allArtists);

            return {
                userProfile,
                topArtists: topArtists.map(artist => ({
                    id: artist.id,
                    name: artist.name,
                    genres: artist.genres,
                    popularity: artist.popularity,
                    images: artist.images
                })),
                topTracks: topTracks.map(track => ({
                    id: track.id,
                    name: track.name,
                    artists: track.artists.map(artist => ({
                        id: artist.id,
                        name: artist.name
                    })),
                    album: track.album.name
                })),
                recentlyPlayed: recentlyPlayed.map(item => ({
                    id: item.track.id,
                    name: item.track.name,
                    artists: item.track.artists.map(artist => ({
                        id: artist.id,
                        name: artist.name
                    })),
                    playedAt: item.played_at
                })),
                playlists: playlists.map(playlist => ({
                    id: playlist.id,
                    name: playlist.name,
                    description: playlist.description,
                    images: playlist.images
                })),
                followedArtists: followedArtists.map(artist => ({
                    id: artist.id,
                    name: artist.name,
                    genres: artist.genres,
                    popularity: artist.popularity
                })),
                genres
            };
        } catch (error) {
            console.error('Error getting user music data:', error);
            throw new Error('Failed to get user music data');
        }
    }

    // Save Spotify tokens to database
    async saveSpotifyTokens(userId, accessToken, refreshToken, expiresIn) {
        try {
            const expiresAt = new Date(Date.now() + expiresIn * 1000);
            
            await pool.query(`
                INSERT INTO spotify_tokens (user_id, access_token, refresh_token, expires_at)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    access_token = EXCLUDED.access_token,
                    refresh_token = EXCLUDED.refresh_token,
                    expires_at = EXCLUDED.expires_at,
                    updated_at = CURRENT_TIMESTAMP
            `, [userId, accessToken, refreshToken, expiresAt]);

            return true;
        } catch (error) {
            console.error('Error saving Spotify tokens:', error);
            throw new Error('Failed to save Spotify tokens');
        }
    }

    // Get Spotify tokens from database
    async getSpotifyTokens(userId) {
        try {
            const result = await pool.query(`
                SELECT access_token, refresh_token, expires_at
                FROM spotify_tokens
                WHERE user_id = $1
            `, [userId]);

            if (result.rows.length === 0) {
                return null;
            }

            const tokens = result.rows[0];
            
            // Check if token is expired
            if (new Date() > new Date(tokens.expires_at)) {
                // Token is expired, try to refresh
                try {
                    const newTokens = await this.refreshAccessToken(tokens.refresh_token);
                    await this.saveSpotifyTokens(userId, newTokens.accessToken, tokens.refresh_token, newTokens.expiresIn);
                    return {
                        accessToken: newTokens.accessToken,
                        refreshToken: tokens.refresh_token
                    };
                } catch (refreshError) {
                    // Refresh failed, delete expired tokens
                    await this.deleteSpotifyTokens(userId);
                    return null;
                }
            }

            return {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token
            };
        } catch (error) {
            console.error('Error getting Spotify tokens:', error);
            throw new Error('Failed to get Spotify tokens');
        }
    }

    // Delete Spotify tokens from database
    async deleteSpotifyTokens(userId) {
        try {
            await pool.query(`
                DELETE FROM spotify_tokens
                WHERE user_id = $1
            `, [userId]);
            return true;
        } catch (error) {
            console.error('Error deleting Spotify tokens:', error);
            throw new Error('Failed to delete Spotify tokens');
        }
    }

    // Save Spotify music data to database
    async saveSpotifyData(userId, musicData) {
        try {
            console.log('💾 Saving Spotify data for user:', userId);
            console.log('📊 Music data type:', typeof musicData);
            console.log('📊 Music data keys:', Object.keys(musicData || {}));
            console.log('📊 Data preview:', JSON.stringify(musicData).substring(0, 200) + '...');
            await pool.query(`
                INSERT INTO spotify_data (user_id, music_data, created_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    music_data = EXCLUDED.music_data,
                    updated_at = CURRENT_TIMESTAMP
            `, [userId, musicData]);
            console.log('✅ Spotify data saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving Spotify data:', error);
            throw new Error('Failed to save Spotify data');
        }
    }

    // Get Spotify music data from database
    async getSpotifyData(userId) {
        try {
            console.log('📊 Getting Spotify data for user:', userId);
            const result = await pool.query(`
                SELECT music_data
                FROM spotify_data
                WHERE user_id = $1
                ORDER BY updated_at DESC, created_at DESC
                LIMIT 1
            `, [userId]);
            if (result.rows.length === 0) {
                console.log('📊 No Spotify data found for user:', userId);
                return null;
            }
            const rawData = result.rows[0].music_data;
            console.log('📊 Raw data type:', typeof rawData);
            console.log('📊 Raw data preview:', JSON.stringify(rawData).substring(0, 200) + '...');
            console.log('📊 Data retrieved successfully');
            return rawData;
        } catch (error) {
            console.error('Error getting Spotify data:', error);
            throw new Error('Failed to get Spotify data');
        }
    }
}

module.exports = new SpotifyService(); 