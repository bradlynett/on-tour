import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Flight as FlightIcon,
  Hotel as HotelIcon,
  ConfirmationNumber as TicketIcon,
  DirectionsCar as CarIcon,
  LocalTaxi as TransportIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  AttachMoney as MoneyIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

import api from '../config/api';

interface TripComponent {
  id: string;
  componentType: string;
  provider: string;
  price: number;
  details: any;
  bookingReference?: string;
}

interface TripCustomizationProps {
  eventId: number;
  eventName: string;
  artist: string;
  venueCity: string;
  eventDate: string;
  onBookingComplete: (bookingId: number) => void;
  onClose: () => void;
}

const TripCustomization: React.FC<TripCustomizationProps> = ({
  eventId,
  eventName,
  artist,
  venueCity,
  eventDate,
  onBookingComplete,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<{ [key: string]: TripComponent[] }>({});
  const [selected, setSelected] = useState<{ [key: string]: string }>({});
  const [customizing, setCustomizing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchCustomizationOptions();
  }, [eventId]);

  const fetchCustomizationOptions = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/booking/customize/${eventId}`, {
        dateFlexibility: 2,
        preferences: { budget: 'flexible', travelStyle: 'comfort' }
      });
      if (response.data.success) {
        setOptions(response.data.data);
      } else {
        setError('Failed to load customization options');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load customization options');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (type: string, id: string) => {
    setSelected(prev => ({ ...prev, [type]: id }));
  };

  const handleBooking = async () => {
    try {
      // Build selectedComponents from selected ids
      const selectedComponents: { [key: string]: TripComponent } = {};
      Object.keys(options).forEach(type => {
        const comp = options[type].find(opt => opt.id === selected[type]);
        if (comp) selectedComponents[type] = comp;
      });
      if (Object.keys(selectedComponents).length === 0) throw new Error('No options selected');
      const response = await api.post('/booking/create', {
        eventId,
        selectedComponents,
        preferences: { customizationNotes: 'User selected customization' }
      });
      if (response.data.success) {
        const bookingId = response.data.data.bookingId;
        setSnackbar({ open: true, message: 'Booking created successfully!', severity: 'success' });
        onBookingComplete(bookingId);
        onClose();
      } else {
        throw new Error(response.data.message || 'Booking failed');
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Booking failed', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Dialog open={true} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={true} maxWidth="md" fullWidth>
        <DialogContent>
          <Alert severity="error">{error}</Alert>
          <Box mt={2}>
            <Button onClick={onClose} variant="contained">
              Close
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="div">
          Customize Your Trip
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {artist} at {eventName} • {eventDate} • {venueCity}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {Object.keys(options).map(type => (
          <Box key={type} mb={4}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              {type.charAt(0).toUpperCase() + type.slice(1)} Options
            </Typography>
            <RadioGroup
              value={selected[type] || ''}
              onChange={e => handleSelect(type, e.target.value)}
            >
              {options[type].map(opt => (
                <FormControlLabel
                  key={opt.id}
                  value={opt.id}
                  control={<Radio sx={{ color: 'white', '&.Mui-checked': { color: '#1976d2' } }} />}
                  label={
                    <Box>
                      <Typography sx={{ color: 'white', fontWeight: 'bold' }}>{opt.provider} - ${opt.price}</Typography>
                      <Typography sx={{ color: 'white' }}>{JSON.stringify(opt.details)}</Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </Box>
        ))}
        <Box mt={4} display="flex" justifyContent="flex-end">
          <Button variant="contained" color="primary" onClick={handleBooking} disabled={Object.keys(selected).length === 0}>
            Book Selected Options
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TripCustomization; 