// frontend/src/components/Profile/UserProfile.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Container,
    Paper,
    Chip,
    MenuItem
} from '@mui/material';
import axios from 'axios';

interface TravelPreferences {
    primaryAirport: string;
    preferredAirlines: string[];
    flightClass: string;
    preferredHotelBrands: string[];
    rentalCarPreference: string;
    rewardPrograms: string[];
}

const UserProfile: React.FC = () => {
    const [preferences, setPreferences] = useState<TravelPreferences>({
        primaryAirport: '',
        preferredAirlines: [],
        flightClass: 'economy',
        preferredHotelBrands: [],
        rentalCarPreference: '',
        rewardPrograms: []
    });

    const [newAirline, setNewAirline] = useState('');
    const [newHotelBrand, setNewHotelBrand] = useState('');

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPreferences(response.data);
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/users/travel-preferences', preferences, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Preferences saved successfully!');
        } catch (error) {
            console.error('Failed to save preferences:', error);
        }
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Travel Preferences
                </Typography>
                
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                        <Box sx={{ flex: 1 }}>
                            <TextField
                                fullWidth
                                label="Primary Airport"
                                value={preferences.primaryAirport}
                                onChange={(e) => setPreferences({
                                    ...preferences,
                                    primaryAirport: e.target.value
                                })}
                            />
                        </Box>
                        
                        <Box sx={{ flex: 1 }}>
                            <TextField
                                fullWidth
                                label="Flight Class"
                                select
                                value={preferences.flightClass}
                                onChange={(e) => setPreferences({
                                    ...preferences,
                                    flightClass: e.target.value
                                })}
                            >
                                <MenuItem value="economy">Economy</MenuItem>
                                <MenuItem value="premium_economy">Premium Economy</MenuItem>
                                <MenuItem value="business">Business</MenuItem>
                                <MenuItem value="first">First Class</MenuItem>
                            </TextField>
                        </Box>
                    </Box>
                </Paper>

                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    size="large"
                >
                    Save Preferences
                </Button>
            </Box>
        </Container>
    );
};

export default UserProfile;