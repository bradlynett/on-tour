import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Alert,
  CircularProgress,
  Stack,
  Radio,
  RadioGroup,
  FormControlLabel,
  Switch,
  Checkbox,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  MusicNote,
  LocationOn,
  Flight,
  Hotel,
  Star,
  CheckCircle,
  ArrowForward,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
import AirportAutocomplete from '../AirportAutocomplete';
import { Airport } from '../../types/trip';
import Enable2FA from '../Profile/Enable2FA';

const stepLabels = [
  'Your Information',
  'Interests',
  'Travel Preferences',
  'Communication Preferences',
  'Two-Factor Authentication',
  "Let's Go!"
];

interface OnboardingData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  password: string; // <-- Add password field
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;

  // Interests
  favoriteArtists: string[];
  favoriteGenres: string[];
  musicDiscoveryStyle: 'spotify' | 'manual' | 'both';
  favoriteEventTypes: string[];
  favoriteEventSubtypes: string[];

  // Travel Preferences
  primaryAirport: string;
  preferredAirlines: string[];
  flightClass: 'economy' | 'premium_economy' | 'business' | 'first';
  preferredHotelBrands: string[];
  rentalCarCompanies: string[];
  rewardPrograms: string[];
  preferredDestinations: string[];

  // Communication Preferences
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  commFrequency: string;
  suggestedTrips: number;
  siteTheme: 'light' | 'dark';
}

const backgroundUrl = '/Rio Beach Concert.png';

const OnboardingFlow: React.FC = () => {
  const { user, login, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '', // <-- Add password field
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    favoriteArtists: [],
    favoriteGenres: [],
    musicDiscoveryStyle: 'spotify',
    favoriteEventTypes: [],
    favoriteEventSubtypes: [],
    primaryAirport: '',
    preferredAirlines: [],
    flightClass: 'economy',
    preferredHotelBrands: [],
    rentalCarCompanies: [],
    rewardPrograms: [],
    preferredDestinations: [],
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    commFrequency: 'weekly',
    suggestedTrips: 3,
    siteTheme: 'dark',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spotifyDialogOpen, setSpotifyDialogOpen] = useState(false);
  const [primaryAirport, setPrimaryAirport] = useState<Airport | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Load existing user data if available
  useEffect(() => {
    if (user) {
      setOnboardingData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
      setTwoFactorEnabled(user.twoFactorEnabled || false);
    }
  }, [user]);

  const handleNext = async () => {
    if (activeStep < stepLabels.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  // Update handleDataChange type
  const handleDataChange = (
    field: keyof OnboardingData,
    value: any
  ) => {
    setOnboardingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    console.log('Submitting onboarding data:', onboardingData);
    setLoading(true);
    setError(null);

    try {
      // Save user profile
      await api.put('/users/profile', {
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        phone: onboardingData.phone,
        addressLine1: onboardingData.addressLine1,
        addressLine2: onboardingData.addressLine2,
        city: onboardingData.city,
        state: onboardingData.state,
        zipCode: onboardingData.zipCode,
        country: onboardingData.country,
      });

      // Save travel preferences
      await api.put('/users/travel-preferences', {
        primaryAirport: onboardingData.primaryAirport,
        preferredAirlines: onboardingData.preferredAirlines,
        flightClass: onboardingData.flightClass,
        preferredHotelBrands: onboardingData.preferredHotelBrands,
        rentalCarPreference: onboardingData.rentalCarCompanies.join(', '), // Convert array to string
        rewardPrograms: onboardingData.rewardPrograms,
        preferredDestinations: onboardingData.preferredDestinations
      });

      // Save music interests
      for (const artist of onboardingData.favoriteArtists) {
        try {
          await api.post('/users/interests', {
            interestType: 'artist',
            interestValue: artist,
            priority: 1
          });
        } catch (error) {
          console.error('Error saving artist interest:', error);
        }
      }

      for (const genre of onboardingData.favoriteGenres) {
        try {
          await api.post('/users/interests', {
            interestType: 'genre',
            interestValue: genre,
            priority: 1
          });
        } catch (error) {
          console.error('Error saving genre interest:', error);
        }
      }

      // Save event type interests
      for (const eventType of onboardingData.favoriteEventTypes) {
        try {
          await api.post('/users/interests', {
            interestType: 'event_type',
            interestValue: eventType,
            priority: 1
          });
        } catch (error) {
          console.error('Error saving event type interest:', error);
        }
      }

      // Save event subtype interests
      for (const eventSubtype of onboardingData.favoriteEventSubtypes) {
        try {
          await api.post('/users/interests', {
            interestType: 'event_subtype',
            interestValue: eventSubtype,
            priority: 1
          });
        } catch (error) {
          console.error('Error saving event subtype interest:', error);
        }
      }

      // Call trip suggestion engine for this user
      await api.post('/trips/generate', { userId: user?.id });

      // Mark onboarding as complete
      await api.put('/users/onboarding-complete');

      // Clear the needsOnboarding flag
      updateUser({ needsOnboarding: false });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save onboarding data');
    } finally {
      setLoading(false);
    }
  };

  // --- Custom Stepper Header ---
  const StepperHeader = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 4 }}>
      {stepLabels.map((label, idx) => {
        let style = {
          color: 'white',
          fontWeight: 400,
          opacity: 0.7,
          borderBottom: '2px solid transparent',
          transition: 'all 0.2s',
          cursor: 'pointer',
          px: 2,
          py: 1,
          borderRadius: 2,
          bgcolor: 'transparent',
        } as React.CSSProperties;
        if (idx < activeStep) {
          style = {
            ...style,
            color: '#90caf9',
            fontWeight: 600,
            opacity: 1,
            borderBottom: '2px solid #90caf9',
            background: 'rgba(144,202,249,0.08)',
          };
        } else if (idx === activeStep) {
          style = {
            ...style,
            color: '#fff',
            fontWeight: 700,
            opacity: 1,
            borderBottom: '3px solid #fff',
            background: 'rgba(255,255,255,0.12)',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          };
        }
        return (
          <Typography key={label} sx={style as any}>
            {label}
          </Typography>
        );
      })}
    </Box>
  );

  // --- Step Content ---
  const steps = [
    // 0: Your Information
    <Box sx={{ py: 2, color: 'white' }} key="your-info">
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Your Information
      </Typography>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            label="First Name"
            value={onboardingData.firstName}
            onChange={e => handleDataChange('firstName', e.target.value)}
            required
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
          <TextField
            fullWidth
            label="Last Name"
            value={onboardingData.lastName}
            onChange={e => handleDataChange('lastName', e.target.value)}
            required
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
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            label="Phone Number"
            value={onboardingData.phone}
            onChange={e => handleDataChange('phone', e.target.value)}
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
        </Box>
        <TextField
          fullWidth
          label="Street Address"
          value={onboardingData.addressLine1}
          onChange={e => handleDataChange('addressLine1', e.target.value)}
          required
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
        <TextField
          fullWidth
          label="Apartment, suite, etc. (optional)"
          value={onboardingData.addressLine2}
          onChange={e => handleDataChange('addressLine2', e.target.value)}
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
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            label="City"
            value={onboardingData.city}
            onChange={e => handleDataChange('city', e.target.value)}
            required
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
          <TextField
            fullWidth
            label="State"
            value={onboardingData.state}
            onChange={e => handleDataChange('state', e.target.value)}
            required
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
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            label="ZIP Code"
            value={onboardingData.zipCode}
            onChange={e => handleDataChange('zipCode', e.target.value)}
            required
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
          <TextField
            fullWidth
            label="Country"
            value={onboardingData.country}
            onChange={e => handleDataChange('country', e.target.value)}
            required
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
        </Box>
      </Stack>
    </Box>,

    // 1: Interests
    <Box sx={{ py: 2, color: 'white' }} key="interests">
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        How would you like to set your interests?
      </Typography>
      <Stack spacing={3}>
        <FormControl component="fieldset">
          <RadioGroup
            value={onboardingData.musicDiscoveryStyle}
            onChange={e => handleDataChange('musicDiscoveryStyle', e.target.value)}
          >
            <FormControlLabel
              value="spotify"
              control={<Radio sx={{ color: 'white' }} />}
              label={<Typography sx={{ color: 'white' }}>Connect your streaming services? (recommended)</Typography>}
            />
            <FormControlLabel
              value="manual"
              control={<Radio sx={{ color: 'white' }} />}
              label={<Typography sx={{ color: 'white' }}>I'll tell you my favorite artists and genres</Typography>}
            />
            <FormControlLabel
              value="both"
              control={<Radio sx={{ color: 'white' }} />}
              label={<Typography sx={{ color: 'white' }}>Both - connect services and add more manually</Typography>}
            />
          </RadioGroup>
        </FormControl>
        {(onboardingData.musicDiscoveryStyle === 'spotify' || onboardingData.musicDiscoveryStyle === 'both') && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 2 }}>
              Connect your streaming services:
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                size="small"
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderColor: 'white'
                  }
                }}
                onClick={() => setSpotifyDialogOpen(true)}
              >
                Spotify
              </Button>
              <Button
                variant="outlined"
                size="small"
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderColor: 'white'
                  }
                }}
              >
                Apple Music
              </Button>
              <Button
                variant="outlined"
                size="small"
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderColor: 'white'
                  }
                }}
              >
                YouTube Music
              </Button>
            </Stack>
          </Box>
        )}
        {(onboardingData.musicDiscoveryStyle === 'manual' || onboardingData.musicDiscoveryStyle === 'both') && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                  Favorite Artists
                </Typography>
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={onboardingData.favoriteArtists}
                  onChange={(_, newValue) => handleDataChange('favoriteArtists', newValue)}
                  renderInput={params => (
                    <TextField
                      {...params}
                      placeholder="Add your favorite artists..."
                      helperText="Start typing to add artists"
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
                        icon={<MusicNote sx={{ color: 'white' }} />}
                        sx={{
                          color: 'white',
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          '& .MuiChip-icon': { color: 'white' },
                          '& .MuiChip-label': { color: 'white' },
                          borderWidth: 1
                        }}
                      />
                    ))
                  }
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                  Favorite Genres
                </Typography>
                <Autocomplete
                  multiple
                  options={[
                    'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Electronic',
                    'Jazz', 'Classical', 'Folk', 'Indie', 'Alternative',
                    'Metal', 'Punk', 'Blues', 'Reggae', 'Latin', 'K-Pop'
                  ]}
                  value={onboardingData.favoriteGenres}
                  onChange={(_, newValue) => handleDataChange('favoriteGenres', newValue)}
                  renderInput={params => (
                    <TextField
                      {...params}
                      placeholder="Select your favorite genres..."
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
                        icon={<Star sx={{ color: 'white' }} />}
                        sx={{
                          color: 'white',
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          '& .MuiChip-icon': { color: 'white' },
                          '& .MuiChip-label': { color: 'white' },
                          borderWidth: 1
                        }}
                      />
                    ))
                  }
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* Event Type Selection */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ color: 'white', mb: 2 }}>
            What types of events do you enjoy?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                Event Types
              </Typography>
              <Autocomplete
                multiple
                options={[
                  'music', 'sports', 'comedy', 'theater', 'family', 'other'
                ]}
                value={onboardingData.favoriteEventTypes}
                onChange={(_, newValue) => handleDataChange('favoriteEventTypes', newValue)}
                renderInput={params => (
                  <TextField
                    {...params}
                    placeholder="Select event types..."
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
                      label={option.charAt(0).toUpperCase() + option.slice(1)}
                      {...getTagProps({ index })}
                      icon={<Star sx={{ color: 'white' }} />}
                      sx={{
                        color: 'white',
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        '& .MuiChip-icon': { color: 'white' },
                        '& .MuiChip-label': { color: 'white' },
                        borderWidth: 1
                      }}
                    />
                  ))
                }
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                Event Subtypes (Optional)
              </Typography>
              <Autocomplete
                multiple
                freeSolo
                options={[
                  // Music subtypes
                  'rock', 'pop', 'hip hop', 'country', 'jazz', 'classical', 'electronic',
                  // Sports subtypes
                  'baseball', 'basketball', 'football', 'soccer', 'hockey', 'tennis', 'golf',
                  // Comedy subtypes
                  'standup', 'improv', 'sketch', 'satire',
                  // Theater subtypes
                  'broadway', 'musical', 'drama', 'comedy', 'opera', 'ballet',
                  // Family subtypes
                  'children', 'educational', 'interactive', 'magic'
                ]}
                value={onboardingData.favoriteEventSubtypes}
                onChange={(_, newValue) => handleDataChange('favoriteEventSubtypes', newValue)}
                renderInput={params => (
                  <TextField
                    {...params}
                    placeholder="Add specific event subtypes..."
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
                      label={option.charAt(0).toUpperCase() + option.slice(1)}
                      {...getTagProps({ index })}
                      icon={<Star sx={{ color: 'white' }} />}
                      sx={{
                        color: 'white',
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        '& .MuiChip-icon': { color: 'white' },
                        '& .MuiChip-label': { color: 'white' },
                        borderWidth: 1
                      }}
                    />
                  ))
                }
              />
            </Box>
          </Box>
        </Box>
      </Stack>
    </Box>,

    // 2: Travel Preferences
    <Box sx={{ py: 2, color: 'white' }} key="travel-prefs">
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Travel Preferences
      </Typography>
      <Stack spacing={3}>
        <AirportAutocomplete
          value={primaryAirport}
          onChange={airport => {
            setPrimaryAirport(airport);
            // Optionally update onboarding data
            setOnboardingData(prev => ({ ...prev, primaryAirport: airport?.code || '' }));
          }}
          label="Primary Airport (IATA Code)"
          placeholder="Type your city or airport code"
          required
          helperText="Type your city or code to find airports"
        />
        <Autocomplete
          multiple
          freeSolo
          options={[
            'Delta', 'United', 'American Airlines', 'Southwest', 'JetBlue', 'Alaska', 'Spirit', 'Frontier'
          ]}
          value={onboardingData.preferredAirlines}
          onChange={(_, newValue) => handleDataChange('preferredAirlines', newValue)}
          renderInput={params => (
            <TextField
              {...params}
              label="Preferred Airlines"
              placeholder="Add airlines"
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
                icon={<Flight sx={{ color: 'white' }} />}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  '& .MuiChip-icon': { color: 'white' },
                  '& .MuiChip-label': { color: 'white' },
                  borderWidth: 1
                }}
              />
            ))
          }
        />
        <FormControl fullWidth>
          <InputLabel sx={{ color: 'white' }}>Preferred Flight Class</InputLabel>
          <Select
            value={onboardingData.flightClass}
            onChange={e => handleDataChange('flightClass', e.target.value)}
            label="Preferred Flight Class"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'white' },
                '&:hover fieldset': { borderColor: 'white' },
                '&.Mui-focused fieldset': { borderColor: 'white' }
              },
              '& .MuiSelect-icon': { color: 'white' }
            }}
          >
            <MenuItem value="economy">Economy</MenuItem>
            <MenuItem value="premium_economy">Premium Economy</MenuItem>
            <MenuItem value="business">Business</MenuItem>
            <MenuItem value="first">First Class</MenuItem>
          </Select>
        </FormControl>
        <Autocomplete
          multiple
          freeSolo
          options={[
            'Hertz', 'Enterprise', 'Avis', 'Budget', 'National', 'Alamo', 'Sixt', 'Thrifty'
          ]}
          value={onboardingData.rentalCarCompanies}
          onChange={(_, newValue) => handleDataChange('rentalCarCompanies', newValue)}
          renderInput={params => (
            <TextField
              {...params}
              label="Preferred Rental Car Companies"
              placeholder="Add rental car companies"
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
                icon={<Hotel sx={{ color: 'white' }} />}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  '& .MuiChip-icon': { color: 'white' },
                  '& .MuiChip-label': { color: 'white' },
                  borderWidth: 1
                }}
              />
            ))
          }
        />
        <Autocomplete
          multiple
          freeSolo
          options={[
            'Hilton', 'Marriott', 'Hyatt', 'IHG', 'Wyndham', 'Choice Hotels', 'Best Western'
          ]}
          value={onboardingData.preferredHotelBrands}
          onChange={(_, newValue) => handleDataChange('preferredHotelBrands', newValue)}
          renderInput={params => (
            <TextField
              {...params}
              label="Preferred Hotel Brands"
              placeholder="Add hotel brands"
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
                icon={<Hotel sx={{ color: 'white' }} />}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  '& .MuiChip-icon': { color: 'white' },
                  '& .MuiChip-label': { color: 'white' },
                  borderWidth: 1
                }}
              />
            ))
          }
        />
        <Autocomplete
          multiple
          freeSolo
          options={[
            'Delta SkyMiles', 'United MileagePlus', 'AAdvantage', 'Marriott Bonvoy', 'Hilton Honors', 'World of Hyatt'
          ]}
          value={onboardingData.rewardPrograms}
          onChange={(_, newValue) => handleDataChange('rewardPrograms', newValue)}
          renderInput={params => (
            <TextField
              {...params}
              label="Reward Programs"
              placeholder="Add reward programs"
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
                icon={<Flight sx={{ color: 'white' }} />}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  '& .MuiChip-icon': { color: 'white' },
                  '& .MuiChip-label': { color: 'white' },
                  borderWidth: 1
                }}
              />
            ))
          }
        />
        <Autocomplete
          multiple
          freeSolo
          options={[
            'New York', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas',
            'Nashville', 'Austin', 'New Orleans', 'San Francisco', 'Seattle',
            'Denver', 'Boston', 'Philadelphia', 'Atlanta', 'Dallas'
          ]}
          value={onboardingData.preferredDestinations}
          onChange={(_, newValue) => handleDataChange('preferredDestinations', newValue)}
          renderInput={params => (
            <TextField
              {...params}
              placeholder="Add your preferred destinations..."
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
                icon={<LocationOn sx={{ color: 'white' }} />}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  '& .MuiChip-icon': { color: 'white' },
                  '& .MuiChip-label': { color: 'white' },
                  borderWidth: 1
                }}
              />
            ))
          }
        />
      </Stack>
    </Box>,

    // 3: Communication Preferences
    <Box sx={{ py: 2, color: 'white' }} key="comm-prefs">
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Communication Preferences
      </Typography>
      <Stack spacing={3}>
        <Box>
          <Typography sx={{ color: 'white', mb: 1 }}>How would you like to receive notifications?</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={onboardingData.emailNotifications}
                onChange={e => handleDataChange('emailNotifications', e.target.checked)}
                sx={{ color: 'white' }}
              />
            }
            label={<Typography sx={{ color: 'white' }}>Email</Typography>}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={onboardingData.smsNotifications}
                onChange={e => handleDataChange('smsNotifications', e.target.checked)}
                sx={{ color: 'white' }}
              />
            }
            label={<Typography sx={{ color: 'white' }}>SMS</Typography>}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={onboardingData.pushNotifications}
                onChange={e => handleDataChange('pushNotifications', e.target.checked)}
                sx={{ color: 'white' }}
              />
            }
            label={<Typography sx={{ color: 'white' }}>Push</Typography>}
          />
        </Box>
        <Box>
          <Typography sx={{ color: 'white', mb: 1 }}>How often do you want to receive communications?</Typography>
          <RadioGroup
            value={onboardingData.commFrequency}
            onChange={e => handleDataChange('commFrequency', e.target.value)}
            row
          >
            <FormControlLabel value="daily" control={<Radio sx={{ color: 'white' }} />} label="Daily" />
            <FormControlLabel value="weekly" control={<Radio sx={{ color: 'white' }} />} label="Weekly" />
            <FormControlLabel value="monthly" control={<Radio sx={{ color: 'white' }} />} label="Monthly" />
            <FormControlLabel value="never" control={<Radio sx={{ color: 'white' }} />} label="Never" />
          </RadioGroup>
        </Box>
        <Box>
          <Typography sx={{ color: 'white', mb: 1 }}>How many suggested trips would you like to see?</Typography>
          <Slider
            value={onboardingData.suggestedTrips}
            min={1}
            max={10}
            step={1}
            marks
            valueLabelDisplay="auto"
            onChange={(_, value) => handleDataChange('suggestedTrips', value as number)}
            sx={{ color: 'white', width: 300 }}
          />
        </Box>
        <Box>
          <Typography sx={{ color: 'white', mb: 1 }}>Site Preferences</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={onboardingData.siteTheme === 'dark'}
                onChange={e => handleDataChange('siteTheme', e.target.checked ? 'dark' : 'light')}
                sx={{ color: 'white' }}
              />
            }
            label={<Typography sx={{ color: 'white' }}>Dark Mode</Typography>}
          />
        </Box>
        {/* Add any other recommended settings here */}
      </Stack>
    </Box>,

    // 4: Two-Factor Authentication
    <Box sx={{ py: 2, color: 'white' }} key="2fa">
      <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
        Two-Factor Authentication
      </Typography>
      <Typography variant="body1" sx={{ mb: 3, color: 'white', opacity: 0.9 }}>
        Enhance your account security by setting up two-factor authentication. This adds an extra layer of protection to your account.
      </Typography>
      <Enable2FA 
        onSetupComplete={() => setTwoFactorEnabled(true)}
        isOnboarding={true}
      />
    </Box>,

    // 5: Let's Go!
    <Box sx={{ textAlign: 'center', py: 4, color: 'white' }} key="lets-go">
      <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
      <Typography variant="h4" gutterBottom>
        You're All Set!
      </Typography>
      <Typography variant="h6" sx={{ mb: 4, color: 'white', opacity: 0.9 }}>
        We'll start generating personalized trip suggestions based on your preferences.
      </Typography>
      <Typography variant="body1" sx={{ mb: 3, color: 'white' }}>
        You can always update your preferences in your profile settings.
      </Typography>
      <Stack spacing={2} sx={{ mb: 4 }}>
        <Typography variant="body2" sx={{ color: 'white' }}>
          Personal information saved
        </Typography>
        <Typography variant="body2" sx={{ color: 'white' }}>
          Interests configured
        </Typography>
        <Typography variant="body2" sx={{ color: 'white' }}>
          Travel preferences set
        </Typography>
        <Typography variant="body2" sx={{ color: 'white' }}>
          Communication preferences added
        </Typography>
        <Typography variant="body2" sx={{ color: 'white' }}>
          {twoFactorEnabled ? 'Two-factor authentication enabled' : 'Two-factor authentication optional'}
        </Typography>
      </Stack>
    </Box>
  ];

  // --- Validation ---
  const isStepValid = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0:
        return !!(
          onboardingData.firstName &&
          onboardingData.lastName &&
          onboardingData.phone &&
          onboardingData.addressLine1 &&
          onboardingData.city &&
          onboardingData.state &&
          onboardingData.zipCode
        );
      case 1:
        return (
          onboardingData.musicDiscoveryStyle === 'spotify' ||
          onboardingData.musicDiscoveryStyle === 'manual' ||
          onboardingData.musicDiscoveryStyle === 'both'
        );
      case 4: // 2FA step - always valid (optional)
        return true;
      default:
        return true;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        background: `url('${backgroundUrl}') center center / cover no-repeat`,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Container maxWidth="md" sx={{ py: 4, zIndex: 2 }}>
        <Paper sx={{ p: 4, bgcolor: 'rgba(20,20,20,0.55)', color: 'white' }}>
          <StepperHeader />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ minHeight: 400 }}>{steps[activeStep]}</Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowBack />}
              sx={{ color: 'white', borderColor: 'white' }}
              variant="outlined"
            >
              Back
            </Button>

            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                >
                  {loading ? 'Saving...' : "Let's Go!"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!isStepValid(activeStep)}
                  endIcon={<ArrowForward />}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Spotify Connection Dialog */}
      <Dialog open={spotifyDialogOpen} onClose={() => setSpotifyDialogOpen(false)}>
        <DialogTitle>Connect Spotify Account</DialogTitle>
        <DialogContent>
          <Typography>
            Connecting your Spotify account will help us discover your music preferences and suggest relevant concerts.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSpotifyDialogOpen(false)}>
            Skip for now
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setSpotifyDialogOpen(false);
              window.location.href = '/spotify';
            }}
          >
            Connect Spotify
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnboardingFlow;