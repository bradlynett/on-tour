import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../config/api';
import { 
    Box, 
    Typography, 
    Button, 
    CircularProgress, 
    Alert, 
    Paper, 
    List, 
    ListItem, 
    ListItemText, 
    Divider,
    Checkbox,
    FormControlLabel,
    Chip,
    Stack
} from '@mui/material';

interface SpotifyInterest {
    id: string;
    name: string;
    type: 'artist' | 'genre' | 'playlist';
    genres?: string[];
    description?: string;
    selected: boolean;
}

const SpotifyCallback: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(false);
    const [spotifyData, setSpotifyData] = useState<any>(null);
    const [interests, setInterests] = useState<SpotifyInterest[]>([]);
    const callbackProcessedRef = useRef(false);

    useEffect(() => {
        console.log('🎵 SpotifyCallback: URL params:', location.search);
        const params = new URLSearchParams(location.search);
        
        // Check for error from Spotify or backend
        if (params.get('error')) {
            console.log('❌ SpotifyCallback: Error parameter found:', params.get('error'));
            setError(true);
            setLoading(false);
            return;
        }

        // Check for success parameter (after backend callback)
        if (params.get('success')) {
            console.log('✅ SpotifyCallback: Success parameter found');
            const userId = params.get('userId');
            
            // Fetch data from backend using userId
            api.get(`/spotify/data/${userId}`)
                .then(res => {
                    console.log('📊 SpotifyCallback: Data fetched from backend');
                    const musicData = res.data.data;
                    setSpotifyData(musicData);
                    setSuccess(true);
                    
                    // Convert Spotify data to interests format
                    const interestsList: SpotifyInterest[] = [];
                    
                    // Add top artists
                    if (musicData.topArtists) {
                        musicData.topArtists.forEach((artist: any) => {
                            interestsList.push({
                                id: artist.id,
                                name: artist.name,
                                type: 'artist',
                                genres: artist.genres,
                                selected: true
                            });
                        });
                    }
                    
                    // Add top genres
                    if (musicData.genres) {
                        musicData.genres.forEach((genre: string) => {
                            interestsList.push({
                                id: `genre-${genre}`,
                                name: genre,
                                type: 'genre',
                                selected: true
                            });
                        });
                    }
                    
                    // Add playlists
                    if (musicData.playlists) {
                        musicData.playlists.forEach((playlist: any) => {
                            interestsList.push({
                                id: playlist.id,
                                name: playlist.name,
                                type: 'playlist',
                                description: playlist.description,
                                selected: false
                            });
                        });
                    }
                    
                    setInterests(interestsList);
                })
                .catch((error) => {
                    console.error('❌ SpotifyCallback: Failed to fetch data:', error);
                    setError(true);
                })
                .finally(() => setLoading(false));
            return;
        }

        // Handle OAuth callback with code and state
        const code = params.get('code');
        const state = params.get('state');
        
        if (code && state && !callbackProcessedRef.current) {
            console.log('🎵 SpotifyCallback: Processing OAuth callback...');
            callbackProcessedRef.current = true; // Prevent duplicate calls
            
            // Call the backend callback endpoint
            api.get(`/spotify/callback?code=${code}&state=${state}`)
                .then((response) => {
                    console.log('✅ SpotifyCallback: Backend callback successful');
                    
                    // Get the user ID from the response
                    const userId = response.data.userId || state;
                    
                    // Fetch the Spotify data using the user ID
                    return api.get(`/spotify/data/${userId}`);
                })
                .then(res => {
                    console.log('📊 SpotifyCallback: Data fetched from backend');
                    const musicData = res.data.data;
                    setSpotifyData(musicData);
                    setSuccess(true);
                    
                    // Convert Spotify data to interests format
                    const interestsList: SpotifyInterest[] = [];
                    
                    // Add top artists
                    if (musicData.topArtists) {
                        musicData.topArtists.forEach((artist: any) => {
                            interestsList.push({
                                id: artist.id,
                                name: artist.name,
                                type: 'artist',
                                genres: artist.genres,
                                selected: true
                            });
                        });
                    }
                    
                    // Add top genres
                    if (musicData.genres) {
                        musicData.genres.forEach((genre: string) => {
                            interestsList.push({
                                id: `genre-${genre}`,
                                name: genre,
                                type: 'genre',
                                selected: true
                            });
                        });
                    }
                    
                    // Add playlists
                    if (musicData.playlists) {
                        musicData.playlists.forEach((playlist: any) => {
                            interestsList.push({
                                id: playlist.id,
                                name: playlist.name,
                                type: 'playlist',
                                description: playlist.description,
                                selected: false
                            });
                        });
                    }
                    
                    setInterests(interestsList);
                })
                .catch((error) => {
                    console.error('❌ SpotifyCallback: Failed to process callback:', error);
                    setError(true);
                })
                .finally(() => setLoading(false));
        } else if (!code && !state && !params.get('success') && !params.get('error')) {
            console.log('❌ SpotifyCallback: No valid parameters found');
            setError(true);
            setLoading(false);
        }
    }, [location.search]);

    const handleInterestToggle = (interestId: string) => {
        setInterests(prev => 
            prev.map(interest => 
                interest.id === interestId 
                    ? { ...interest, selected: !interest.selected }
                    : interest
            )
        );
    };

    const handleSelectAll = () => {
        setInterests(prev => prev.map(interest => ({ ...interest, selected: true })));
    };

    const handleDeselectAll = () => {
        setInterests(prev => prev.map(interest => ({ ...interest, selected: false })));
    };

    const handleSaveInterests = async () => {
        setSaving(true);
        try {
            const selectedInterests = interests.filter(interest => interest.selected);
            console.log('🎵 Saving interests:', selectedInterests);
            
            let savedCount = 0;
            let skippedCount = 0;
            
            // Save each selected interest
            for (const interest of selectedInterests) {
                console.log('🎵 Saving interest:', interest);
                try {
                    const response = await api.post('/users/interests', {
                        interestType: interest.type,
                        interestValue: interest.name,
                        priority: 1
                    });
                    console.log('✅ Interest saved:', response.data);
                    savedCount++;
                } catch (error: any) {
                    if (error.response?.status === 409) {
                        // Interest already exists, skip it
                        console.log('⏭️ Interest already exists:', interest.name);
                        skippedCount++;
                    } else {
                        // Re-throw other errors
                        throw error;
                    }
                }
            }
            
            console.log(`🎉 Save complete: ${savedCount} saved, ${skippedCount} already existed`);
            setSuccess(true);
            setTimeout(() => {
                navigate('/profile');
            }, 2000);
        } catch (error: any) {
            console.error('❌ Error saving interests:', error);
            
            // Check if it's an authentication error
            if (error.response?.status === 401) {
                // The global AuthErrorHandler will show the dialog
                // We don't need to set error state here
                console.log('Authentication error handled by global handler');
            } else {
                // For other errors, show a more specific message
                setError(true);
                const errorMessage = error.response?.data?.message || error.message || 'Failed to save interests';
                console.error('Error saving interests:', errorMessage);
            }
        } finally {
            setSaving(false);
        }
    };

    const selectedCount = interests.filter(interest => interest.selected).length;

    return (
        <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>Import Your Spotify Interests</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Select your favorite artists, genres, and playlists from your Spotify account to personalize your concert recommendations.
            </Typography>
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            )}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Failed to save interests. Please check your connection and try again.
                </Alert>
            )}
            {success && spotifyData && interests.length > 0 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Spotify connected! Select the interests you'd like to save to your profile.
                    </Alert>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Selected: {selectedCount} of {interests.length}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <Button size="small" onClick={handleSelectAll}>
                                Select All
                            </Button>
                            <Button size="small" onClick={handleDeselectAll}>
                                Deselect All
                            </Button>
                        </Stack>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>Top Artists from Spotify</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        These are your most listened-to artists on Spotify.
                    </Typography>
                    <List dense>
                        {interests.filter(i => i.type === 'artist').map((interest) => (
                            <ListItem key={interest.id}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={interest.selected}
                                            onChange={() => handleInterestToggle(interest.id)}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>{interest.name}</Typography>
                                            {interest.genres && interest.genres.length > 0 && (
                                                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                                                    {interest.genres.slice(0, 3).map((genre, idx) => (
                                                        <Chip key={idx} label={genre} size="small" variant="outlined" />
                                                    ))}
                                                </Stack>
                                            )}
                                        </Box>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>Top Genres from Spotify</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        These are the genres you listen to most.
                    </Typography>
                    <List dense>
                        {interests.filter(i => i.type === 'genre').map((interest) => (
                            <ListItem key={interest.id}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={interest.selected}
                                            onChange={() => handleInterestToggle(interest.id)}
                                        />
                                    }
                                    label={<Typography variant="body2" fontWeight={600}>{interest.name}</Typography>}
                                />
                            </ListItem>
                        ))}
                    </List>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>Spotify Playlists</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        These are your playlists on Spotify. Select any you want to use for recommendations.
                    </Typography>
                    <List dense>
                        {interests.filter(i => i.type === 'playlist').map((interest) => (
                            <ListItem key={interest.id}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={interest.selected}
                                            onChange={() => handleInterestToggle(interest.id)}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>{interest.name}</Typography>
                                            {interest.description && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {interest.description}
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', gap: 2, mt: 3, alignItems: 'center' }}>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleSaveInterests}
                            disabled={saving || selectedCount === 0}
                        >
                            {saving ? <CircularProgress size={20} /> : `Save Selected Interests`}
                        </Button>
                        <Button 
                            variant="outlined" 
                            onClick={() => navigate('/profile')}
                        >
                            Skip
                        </Button>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                            You can update your interests anytime from your profile.
                        </Typography>
                    </Box>
                </Paper>
            )}
        </Box>
    );
};

export default SpotifyCallback; 