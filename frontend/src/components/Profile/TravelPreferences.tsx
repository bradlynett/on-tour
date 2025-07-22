import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Paper,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    OutlinedInput,
    Autocomplete,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction
} from '@mui/material';
import { Save, Add, Delete, Edit, Close } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
import AirportAutocomplete from '../AirportAutocomplete';
import { Airport } from '../../types/trip';

interface TravelPreferencesData {
    primaryAirport: string;
    preferredAirlines: string[];
    flightClass: string;
    preferredHotelBrands: string[];
    rentalCarPreference: string;
    rewardPrograms: string[];
    rewardProgramMemberships: Array<{
        program: string;
        membershipNumber: string;
    }>;
}

// Autocomplete data
const AIRPORT_SUGGESTIONS = [
    'JFK', 'LAX', 'ORD', 'DFW', 'ATL', 'DEN', 'SFO', 'LAS', 'MCO', 'CLT',
    'PHX', 'IAH', 'MIA', 'BOS', 'DTW', 'FLL', 'MSP', 'EWR', 'SEA', 'BWI',
    'IAD', 'MCI', 'CLE', 'PIT', 'BNA', 'AUS', 'RDU', 'SLC', 'PDX', 'HOU'
];

const AIRLINE_SUGGESTIONS = [
    'American Airlines', 'Delta Air Lines', 'United Airlines', 'Southwest Airlines',
    'JetBlue Airways', 'Alaska Airlines', 'Spirit Airlines', 'Frontier Airlines',
    'Allegiant Air', 'Hawaiian Airlines', 'British Airways', 'Lufthansa',
    'Air France', 'KLM', 'Emirates', 'Qatar Airways', 'Singapore Airlines',
    'Cathay Pacific', 'Japan Airlines', 'Korean Air'
];

const HOTEL_BRAND_SUGGESTIONS = [
    'Marriott', 'Hilton', 'Hyatt', 'IHG', 'Wyndham', 'Choice Hotels',
    'Best Western', 'Accor', 'Radisson', 'Four Seasons', 'Ritz-Carlton',
    'W Hotels', 'Sheraton', 'Westin', 'Renaissance', 'Courtyard',
    'Residence Inn', 'Hampton Inn', 'Holiday Inn', 'Comfort Inn',
    'Quality Inn', 'Days Inn', 'Super 8', 'Motel 6', 'La Quinta'
];

const CAR_RENTAL_SUGGESTIONS = [
    'Hertz', 'Enterprise', 'Avis', 'Budget', 'National', 'Alamo',
    'Dollar', 'Thrifty', 'Sixt', 'Europcar', 'Zipcar', 'Turo'
];

const REWARD_PROGRAM_SUGGESTIONS = [
    'American Airlines AAdvantage', 'Delta SkyMiles', 'United MileagePlus',
    'Southwest Rapid Rewards', 'JetBlue TrueBlue', 'Alaska Mileage Plan',
    'Marriott Bonvoy', 'Hilton Honors', 'IHG Rewards Club', 'World of Hyatt',
    'Wyndham Rewards', 'Choice Privileges', 'Best Western Rewards',
    'Hertz Gold Plus Rewards', 'Enterprise Plus', 'Avis Preferred',
    'National Emerald Club', 'Alamo Insiders'
];

const TravelPreferences: React.FC = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState<TravelPreferencesData>({
        primaryAirport: '',
        preferredAirlines: [],
        flightClass: 'economy',
        preferredHotelBrands: [],
        rentalCarPreference: '',
        rewardPrograms: [],
        rewardProgramMemberships: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
    const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState('');
    const [membershipNumber, setMembershipNumber] = useState('');

    // Load current travel preferences
    useEffect(() => {
        const loadTravelPreferences = async () => {
            try {
                const response = await api.get('/users/profile');
                const travelPrefs = response.data.data.user.travelPreferences;
                
                if (travelPrefs) {
                    setFormData({
                        primaryAirport: travelPrefs.primaryAirport || '',
                        preferredAirlines: travelPrefs.preferredAirlines || [],
                        flightClass: travelPrefs.flightClass || 'economy',
                        preferredHotelBrands: travelPrefs.preferredHotelBrands || [],
                        rentalCarPreference: travelPrefs.rentalCarPreference || '',
                        rewardPrograms: travelPrefs.rewardPrograms || [],
                        rewardProgramMemberships: travelPrefs.rewardProgramMemberships || []
                    });
                    // If primaryAirport is set, fetch the airport object and set selectedAirport
                    if (travelPrefs.primaryAirport) {
                        try {
                            const airportRes = await api.get(`/airports/${travelPrefs.primaryAirport}`);
                            if (airportRes.data && airportRes.data.data) {
                                setSelectedAirport(airportRes.data.data);
                            } else {
                                setSelectedAirport(null);
                            }
                        } catch {
                            setSelectedAirport(null);
                        }
                    } else {
                        setSelectedAirport(null);
                    }
                }
            } catch (error) {
                console.error('Failed to load travel preferences:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTravelPreferences();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleArrayChange = (field: keyof TravelPreferencesData, value: string[]) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const addItem = (field: keyof TravelPreferencesData, value: string) => {
        if (Array.isArray(formData[field])) {
            const currentArray = formData[field] as string[];
            if (value.trim() && !currentArray.includes(value.trim())) {
                handleArrayChange(field, [...currentArray, value.trim()]);
            }
        }
    };

    const removeItem = (field: keyof TravelPreferencesData, index: number) => {
        if (Array.isArray(formData[field])) {
            const currentArray = formData[field] as string[];
            const newArray = [...currentArray];
            newArray.splice(index, 1);
            handleArrayChange(field, newArray);
        }
    };

    const openMembershipDialog = (program: string) => {
        setSelectedProgram(program);
        setMembershipNumber('');
        setMembershipDialogOpen(true);
    };

    const handleAddMembership = () => {
        if (selectedProgram && membershipNumber.trim()) {
            const newMembership = {
                program: selectedProgram,
                membershipNumber: membershipNumber.trim()
            };
            
            setFormData(prev => ({
                ...prev,
                rewardProgramMemberships: [...prev.rewardProgramMemberships, newMembership]
            }));
            
            setMembershipDialogOpen(false);
            setSelectedProgram('');
            setMembershipNumber('');
        }
    };

    const removeMembership = (index: number) => {
        setFormData(prev => ({
            ...prev,
            rewardProgramMemberships: prev.rewardProgramMemberships.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Ensure all array fields are arrays
        const safeFormData = {
            ...formData,
            preferredAirlines: Array.isArray(formData.preferredAirlines) ? formData.preferredAirlines : [],
            preferredHotelBrands: Array.isArray(formData.preferredHotelBrands) ? formData.preferredHotelBrands : [],
            rewardPrograms: Array.isArray(formData.rewardPrograms) ? formData.rewardPrograms : [],
            rewardProgramMemberships: Array.isArray(formData.rewardProgramMemberships) ? formData.rewardProgramMemberships : [],
        };

        // Add validation for primaryAirport: must be a 3-letter IATA code
        if (!safeFormData.primaryAirport || !/^[A-Z]{3}$/.test(safeFormData.primaryAirport)) {
            setMessage({ type: 'error', text: 'Please select a valid primary airport (IATA code).' });
            return;
        }
        setIsSubmitting(true);
        setMessage(null);

        try {
            await api.put('/users/travel-preferences', safeFormData);
            setMessage({
                type: 'success',
                text: 'Travel preferences updated successfully!'
            });
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update travel preferences'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'white' }}>
                Travel Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, color: 'white' }}>
                Customize your travel preferences to get better recommendations and faster booking.
            </Typography>

            {message && (
                <Alert severity={message.type} sx={{ mb: 3 }}>
                    {message.text}
                </Alert>
            )}

            <Paper sx={{ p: 3, backgroundColor: 'rgba(24, 24, 24, 0.85)', color: 'white', boxShadow: 6, borderRadius: 3, backdropFilter: 'blur(6px)' }}>
                <Box component="form" onSubmit={handleSubmit}>
                    {/* Airport Preferences */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 2, color: 'white' }}>
                        Airport & Airlines
                    </Typography>
                    
                    <AirportAutocomplete
                        value={selectedAirport}
                        onChange={(airportOrString: Airport | string | null) => {
                            if (typeof airportOrString === 'string') {
                                const code = airportOrString.trim().toUpperCase();
                                if (/^[A-Z]{3}$/.test(code)) {
                                    setFormData(prev => ({ ...prev, primaryAirport: code }));
                                } else {
                                    setFormData(prev => ({ ...prev, primaryAirport: '' }));
                                }
                                setSelectedAirport(null);
                            } else if (airportOrString && airportOrString.code) {
                                setFormData(prev => ({ ...prev, primaryAirport: airportOrString.code.toUpperCase() }));
                                setSelectedAirport(airportOrString);
                            } else {
                                setFormData(prev => ({ ...prev, primaryAirport: '' }));
                                setSelectedAirport(null);
                            }
                        }}
                        label="Primary Airport (IATA Code)"
                        placeholder="Type your city or airport code"
                        required
                        helperText="Type your city or code to find airports"
                    />

                    <Autocomplete
                        multiple
                        freeSolo
                        options={AIRLINE_SUGGESTIONS}
                        value={formData.preferredAirlines}
                        onChange={(_, newValue) => {
                            setFormData(prev => ({
                                ...prev,
                                preferredAirlines: newValue
                            }));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Preferred Airlines"
                                placeholder="Add preferred airlines"
                                helperText="Select or type your preferred airlines"
                                disabled={isSubmitting}
                                sx={{
                                    '& .MuiInputLabel-root': { color: 'white' },
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'white' },
                                        '&:hover fieldset': { borderColor: 'white' },
                                        '&.Mui-focused fieldset': { borderColor: 'white' }
                                    },
                                    '& .MuiInputBase-input': { color: 'white' }
                                }}
                            />
                        )}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip
                                    label={option}
                                    {...getTagProps({ index })}
                                    onDelete={() => removeItem('preferredAirlines', index)}
                                    sx={{ color: 'white', borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.08)' }}
                                />
                            ))
                        }
                        sx={{ mb: 3 }}
                    />

                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel sx={{ color: 'white' }}>Flight Class Preference</InputLabel>
                        <Select
                            name="flightClass"
                            value={formData.flightClass}
                            onChange={handleSelectChange}
                            label="Flight Class Preference"
                            disabled={isSubmitting}
                            sx={{
                                color: 'white',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }
                            }}
                        >
                            <MenuItem value="economy">Economy</MenuItem>
                            <MenuItem value="premium_economy">Premium Economy</MenuItem>
                            <MenuItem value="business">Business</MenuItem>
                            <MenuItem value="first">First Class</MenuItem>
                        </Select>
                    </FormControl>

                    <Divider sx={{ my: 3 }} />

                    {/* Hotel Preferences */}
                    <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                        Hotel Preferences
                    </Typography>
                    
                    <Autocomplete
                        multiple
                        freeSolo
                        options={HOTEL_BRAND_SUGGESTIONS}
                        value={formData.preferredHotelBrands}
                        onChange={(_, newValue) => {
                            setFormData(prev => ({
                                ...prev,
                                preferredHotelBrands: newValue
                            }));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Preferred Hotel Brands"
                                placeholder="Add preferred hotel brands"
                                helperText="Select or type your preferred hotel chains"
                                disabled={isSubmitting}
                                sx={{
                                    '& .MuiInputLabel-root': { color: 'white' },
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'white' },
                                        '&:hover fieldset': { borderColor: 'white' },
                                        '&.Mui-focused fieldset': { borderColor: 'white' }
                                    },
                                    '& .MuiInputBase-input': { color: 'white' }
                                }}
                            />
                        )}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip
                                    label={option}
                                    {...getTagProps({ index })}
                                    onDelete={() => removeItem('preferredHotelBrands', index)}
                                    sx={{ color: 'white', borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.08)' }}
                                />
                            ))
                        }
                        sx={{ mb: 3 }}
                    />

                    <Divider sx={{ my: 3 }} />

                    {/* Car Rental Preferences */}
                    <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                        Car Rental Preferences
                    </Typography>
                    
                    <Autocomplete
                        freeSolo
                        options={CAR_RENTAL_SUGGESTIONS}
                        value={formData.rentalCarPreference}
                        onChange={(_, newValue) => {
                            setFormData(prev => ({
                                ...prev,
                                rentalCarPreference: newValue || ''
                            }));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                name="rentalCarPreference"
                                label="Preferred Car Rental Company"
                                placeholder="e.g., Hertz, Enterprise, Avis"
                                helperText="Select or type your preferred car rental company"
                                disabled={isSubmitting}
                                sx={{
                                    '& .MuiInputLabel-root': { color: 'white' },
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'white' },
                                        '&:hover fieldset': { borderColor: 'white' },
                                        '&.Mui-focused fieldset': { borderColor: 'white' }
                                    },
                                    '& .MuiInputBase-input': { color: 'white' }
                                }}
                            />
                        )}
                        sx={{ mb: 3 }}
                    />

                    <Divider sx={{ my: 3 }} />

                    {/* Reward Programs */}
                    <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                        Reward Programs
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, color: 'white' }}>
                        Add your loyalty program memberships to earn points on bookings.
                    </Typography>

                    <Autocomplete
                        multiple
                        freeSolo
                        options={REWARD_PROGRAM_SUGGESTIONS}
                        value={formData.rewardPrograms}
                        onChange={(_, newValue) => {
                            setFormData(prev => ({
                                ...prev,
                                rewardPrograms: newValue
                            }));
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Reward Programs"
                                placeholder="Add your loyalty programs"
                                helperText="Select or type your airline, hotel, and car rental loyalty programs"
                                disabled={isSubmitting}
                                sx={{
                                    '& .MuiInputLabel-root': { color: 'white' },
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'white' },
                                        '&:hover fieldset': { borderColor: 'white' },
                                        '&.Mui-focused fieldset': { borderColor: 'white' }
                                    },
                                    '& .MuiInputBase-input': { color: 'white' }
                                }}
                            />
                        )}
                        renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                                <Chip
                                    label={option}
                                    {...getTagProps({ index })}
                                    onDelete={() => removeItem('rewardPrograms', index)}
                                    sx={{ color: 'white', borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.08)' }}
                                />
                            ))
                        }
                        sx={{ mb: 3 }}
                    />

                    {/* Membership Numbers Display */}
                    {formData.rewardProgramMemberships.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ color: 'white' }}>
                                Membership Numbers:
                            </Typography>
                            <List dense>
                                {formData.rewardProgramMemberships.map((membership, index) => (
                                    <ListItem key={index} sx={{ pl: 0 }}>
                                        <ListItemText
                                            primary={membership.program}
                                            secondary={`Membership: ${membership.membershipNumber}`}
                                        />
                                        <ListItemSecondaryAction>
                                            <IconButton
                                                edge="end"
                                                onClick={() => removeMembership(index)}
                                                disabled={isSubmitting}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={isSubmitting ? <CircularProgress size={20} /> : <Save />}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Preferences'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Membership Number Dialog */}
            <Dialog open={membershipDialogOpen} onClose={() => setMembershipDialogOpen(false)}>
                <DialogTitle>
                    Add Membership Number
                    <IconButton
                        aria-label="close"
                        onClick={() => setMembershipDialogOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: 'white' }}>
                        Program: <strong>{selectedProgram}</strong>
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Membership Number"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={membershipNumber}
                        onChange={(e) => setMembershipNumber(e.target.value)}
                        placeholder="Enter your membership number"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMembershipDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddMembership} variant="contained" disabled={!membershipNumber.trim()}>
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TravelPreferences; 