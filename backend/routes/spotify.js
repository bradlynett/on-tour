const express = require('express');
const router = express.Router();
const spotifyService = require('../services/spotifyService');
const { authenticateToken } = require('../middleware/auth');

// 1. Start Spotify OAuth flow
router.get('/login', authenticateToken, (req, res) => {
    console.log('🎵 Spotify login request received for user:', req.user.id);
    try {
        // Use user id as state to link the callback
        const state = req.user.id.toString();
        console.log('🔄 Generating authorization URL with state:', state);
        const url = spotifyService.getAuthorizationUrl(state);
        console.log('✅ Authorization URL generated:', url.substring(0, 100) + '...');
        res.json({ url });
    } catch (error) {
        console.error('❌ Spotify login error:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            details: 'Please check that Spotify credentials are properly configured in the backend.'
        });
    }
});

// 2. Handle Spotify OAuth callback
router.get('/callback', async (req, res) => {
    console.log('🎵 Spotify callback received:', { code: req.query.code ? 'present' : 'missing', state: req.query.state });
    
    const { code, state } = req.query;
    if (!code || !state) {
        console.log('❌ Missing code or state in callback');
        return res.status(400).json({ success: false, message: 'Missing code or state' });
    }
    
    // Validate that state is a valid user ID
    const userId = parseInt(state);
    if (isNaN(userId)) {
        console.log('❌ Invalid user ID in state:', state);
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    
    try {
        console.log('🔄 Getting access token...');
        const { accessToken, refreshToken, expiresIn } = await spotifyService.getAccessToken(code);
        console.log('✅ Access token received');
        
        // Verify the Spotify user matches the expected user
        try {
            const spotifyUser = await spotifyService.getUserProfile(accessToken);
            console.log('🔍 Spotify user ID:', spotifyUser.id);
            
            // Get the app user to verify they exist
            const { pool } = require('../config/database');
            const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
            
            if (userResult.rows.length === 0) {
                console.log('❌ User not found in database:', userId);
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            
            console.log('✅ User validation successful for user:', userResult.rows[0].email);
        } catch (validationError) {
            console.error('❌ User validation failed:', validationError);
            return res.status(500).json({ success: false, message: 'Failed to validate user' });
        }
        
        console.log('💾 Saving tokens to database...');
        await spotifyService.saveSpotifyTokens(userId, accessToken, refreshToken, expiresIn);
        console.log('✅ Tokens saved');
        
        // Import Spotify data immediately
        try {
            console.log('📊 Importing Spotify data...');
            const musicData = await spotifyService.getUserMusicData(accessToken);
            console.log('✅ Spotify data imported:', {
                artists: musicData.topArtists?.length || 0,
                genres: musicData.genres?.length || 0,
                playlists: musicData.playlists?.length || 0
            });
            
            // Save data to database
            console.log('💾 Saving Spotify data to database...');
            await spotifyService.saveSpotifyData(userId, musicData);
            console.log('✅ Spotify data saved to database');
            
            // Return success response - frontend will handle the callback
            console.log('✅ Spotify callback completed successfully');
            res.json({ success: true, message: 'Spotify data imported successfully', userId: userId });
        } catch (importError) {
            console.error('❌ Error importing Spotify data:', importError);
            // Return error response
            res.status(500).json({ success: false, message: 'Failed to import Spotify data' });
        }
    } catch (error) {
        console.error('❌ Spotify callback error:', error);
        // Return error response
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Import Spotify interests for the logged-in user
router.get('/import', authenticateToken, async (req, res) => {
    try {
        console.log('🔄 Importing Spotify data for user:', req.user.id);
        
        // Get tokens for user
        const tokens = await spotifyService.getSpotifyTokens(req.user.id);
        if (!tokens) {
            return res.status(400).json({ success: false, message: 'Spotify not connected' });
        }
        
        // Fetch user music data
        console.log('📊 Fetching music data from Spotify...');
        const musicData = await spotifyService.getUserMusicData(tokens.accessToken);
        console.log('✅ Music data fetched:', {
            artists: musicData.topArtists?.length || 0,
            genres: musicData.genres?.length || 0,
            playlists: musicData.playlists?.length || 0
        });
        
        // Save data to database
        console.log('💾 Saving music data to database...');
        await spotifyService.saveSpotifyData(req.user.id, musicData);
        console.log('✅ Music data saved to database');
        
        res.json({ success: true, data: musicData, message: 'Spotify data imported and saved successfully' });
    } catch (error) {
        console.error('❌ Import error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Get stored Spotify data for the logged-in user
router.get('/data', authenticateToken, async (req, res) => {
    try {
        const musicData = await spotifyService.getSpotifyData(req.user.id);
        if (!musicData) {
            return res.status(404).json({ success: false, message: 'No Spotify data found' });
        }
        res.json({ success: true, data: musicData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Get stored Spotify data by user ID (for callback flow)
router.get('/data/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        
        // For the callback flow, we need to allow access without authentication
        // but we should validate the user exists
        const { pool } = require('../config/database');
        const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const musicData = await spotifyService.getSpotifyData(userId);
        if (!musicData) {
            return res.status(404).json({ success: false, message: 'No Spotify data found' });
        }
        res.json({ success: true, data: musicData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Save Spotify data manually (for frontend use)
router.post('/save', authenticateToken, async (req, res) => {
    try {
        console.log('💾 Manual save request for user:', req.user.id);
        const { musicData } = req.body;
        
        if (!musicData) {
            return res.status(400).json({ success: false, message: 'No music data provided' });
        }
        
        await spotifyService.saveSpotifyData(req.user.id, musicData);
        console.log('✅ Manual save completed');
        
        res.json({ success: true, message: 'Spotify data saved successfully' });
    } catch (error) {
        console.error('❌ Manual save error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router; 