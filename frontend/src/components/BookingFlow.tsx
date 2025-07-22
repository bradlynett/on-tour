import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Stepper, Step, StepLabel, Button, Box, Typography, CircularProgress, Alert, Card, CardContent } from '@mui/material';
import { useNotifications } from '../hooks/useNotifications';
import { useLoadingState } from '../hooks/useLoadingState';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/apiClient';
import { TripSuggestionCamel, TripComponentCamel } from '../types/trip';
import { alpha } from '@mui/material/styles';

const whiteText = { color: 'white' };
const transparentButtonStyles = {
  backgroundColor: 'transparent',
  color: 'white',
  border: '1px solid',
  borderColor: alpha('#fff', 0.5),
  '&:hover': {
    backgroundColor: alpha('#fff', 0.08),
    borderColor: '#fff',
  },
};

// Step 1: What to Book
const StepWhatToBook: React.FC<{
  selected: Record<string, boolean>;
  onChange: (type: string, value: boolean) => void;
}> = ({ selected, onChange }) => (
  <Box>
    <Typography variant="h6" gutterBottom sx={whiteText}>What do you want to book?</Typography>
    {['ticket', 'flight', 'hotel', 'car'].map(type => (
      <Button
        key={type}
        variant={selected[type] ? 'contained' : 'outlined'}
        onClick={() => onChange(type, !selected[type])}
        sx={{ ...transparentButtonStyles, m: 1, borderColor: selected[type] ? '#fff' : alpha('#fff', 0.5), backgroundColor: selected[type] ? alpha('#fff', 0.12) : 'transparent' }}
      >
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Button>
    ))}
  </Box>
);

const COMPONENT_ORDER = ['ticket', 'flight', 'hotel', 'car'];

// Step 2: Customize Options
const StepCustomizeOptions: React.FC<{
  components?: TripComponentCamel[];
  selected: Record<string, boolean>;
  selections: Record<string, any>;
  onSelect: (type: string, option: any) => void;
}> = ({ components = [], selected, selections, onSelect }) => {
  // Sort components by desired order
  const sortedComponents = [...components].sort((a, b) => {
    return COMPONENT_ORDER.indexOf(a.componentType) - COMPONENT_ORDER.indexOf(b.componentType);
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={whiteText}>Customize your selected options:</Typography>
      {sortedComponents.filter(c => selected[c.componentType]).map(component => (
        <Box key={component.componentType} mb={3}>
          <Typography variant="subtitle1" sx={whiteText}>{component.componentType.charAt(0).toUpperCase() + component.componentType.slice(1)}</Typography>
          <Box display="flex" flexWrap="wrap">
            {(component.options || []).length > 0 ? (
              (component.options || []).map((option: any, idx: number) => {
                // --- FLIGHT CARD ---
                if (component.componentType === 'flight') {
                  // Try to extract airline, flight number, departure/arrival info
                  const seg = option.itineraries?.[0]?.segments?.[0] || option.segments?.[0] || option.details?.segments?.[0] || option;
                  const airline = seg?.carrierCode || option.airline || option.details?.airline || 'Airline';
                  const flightNumber = seg?.flightNumber || option.flightNumber || option.details?.flightNumber || '';
                  const depAirport = seg?.departure?.iataCode || option.departureAirport || option.details?.departureAirport || '';
                  const depTime = seg?.departure?.at || option.departureTime || option.details?.departureTime || '';
                  const arrAirport = seg?.arrival?.iataCode || option.arrivalAirport || option.details?.arrivalAirport || '';
                  const arrTime = seg?.arrival?.at || option.arrivalTime || option.details?.arrivalTime || '';
                  const cabin = seg?.cabin || option.cabinClass || option.details?.cabinClass || '';
                  const price = option.price?.total || option.price || option.details?.price || '';
                  return (
                    <Card
                      key={idx}
                      sx={{ m: 1, minWidth: 320, border: selections[component.componentType]?.id === option.id ? '2px solid #fff' : '1px solid #888', background: selections[component.componentType]?.id === option.id ? 'rgba(255,255,255,0.08)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => onSelect(component.componentType, option)}
                    >
                      <CardContent>
                        <Typography variant="subtitle2" color="primary" sx={whiteText}>
                          {airline} {flightNumber ? `#${flightNumber}` : ''}
                        </Typography>
                        <Typography sx={whiteText}>
                          <strong>Departure:</strong> {depAirport} {depTime && (<span>{new Date(depTime).toLocaleString()}</span>)}
                        </Typography>
                        <Typography sx={whiteText}>
                          <strong>Arrival:</strong> {arrAirport} {arrTime && (<span>{new Date(arrTime).toLocaleString()}</span>)}
                        </Typography>
                        {cabin && <Typography sx={whiteText}><strong>Cabin:</strong> {cabin}</Typography>}
                        {price && <Typography sx={whiteText}><strong>Price:</strong> ${price}</Typography>}
                      </CardContent>
                    </Card>
                  );
                }
                // --- HOTEL CARD ---
                if (component.componentType === 'hotel') {
                  const name = option.name || option.details?.name || 'Hotel';
                  const room = option.roomType || option.details?.roomType || '';
                  const checkIn = option.checkIn || option.details?.checkIn || '';
                  const checkOut = option.checkOut || option.details?.checkOut || '';
                  const price = option.price || option.details?.price || '';
                  return (
                    <Card
                      key={idx}
                      sx={{ m: 1, minWidth: 320, border: selections[component.componentType]?.id === option.id ? '2px solid #fff' : '1px solid #888', background: selections[component.componentType]?.id === option.id ? 'rgba(255,255,255,0.08)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => onSelect(component.componentType, option)}
                    >
                      <CardContent>
                        <Typography variant="subtitle2" sx={whiteText}>{name}</Typography>
                        {room && <Typography sx={whiteText}><strong>Room:</strong> {room}</Typography>}
                        {checkIn && <Typography sx={whiteText}><strong>Check-in:</strong> {new Date(checkIn).toLocaleDateString()}</Typography>}
                        {checkOut && <Typography sx={whiteText}><strong>Check-out:</strong> {new Date(checkOut).toLocaleDateString()}</Typography>}
                        {price && <Typography sx={whiteText}><strong>Price:</strong> ${price}</Typography>}
                      </CardContent>
                    </Card>
                  );
                }
                // --- CAR CARD ---
                if (component.componentType === 'car') {
                  const model = option.model || option.details?.model || 'Car';
                  const pickup = option.pickupLocation || option.details?.pickupLocation || '';
                  const pickupDate = option.pickupDate || option.details?.pickupDate || '';
                  const returnDate = option.returnDate || option.details?.returnDate || '';
                  const price = option.price || option.details?.price || '';
                  return (
                    <Card
                      key={idx}
                      sx={{ m: 1, minWidth: 320, border: selections[component.componentType]?.id === option.id ? '2px solid #fff' : '1px solid #888', background: selections[component.componentType]?.id === option.id ? 'rgba(255,255,255,0.08)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => onSelect(component.componentType, option)}
                    >
                      <CardContent>
                        <Typography variant="subtitle2" sx={whiteText}>{model}</Typography>
                        {pickup && <Typography sx={whiteText}><strong>Pickup:</strong> {pickup}</Typography>}
                        {pickupDate && <Typography sx={whiteText}><strong>Pickup Date:</strong> {new Date(pickupDate).toLocaleDateString()}</Typography>}
                        {returnDate && <Typography sx={whiteText}><strong>Return Date:</strong> {new Date(returnDate).toLocaleDateString()}</Typography>}
                        {price && <Typography sx={whiteText}><strong>Price:</strong> ${price}</Typography>}
                      </CardContent>
                    </Card>
                  );
                }
                // --- TICKET CARD ---
                if (component.componentType === 'ticket') {
                  const section = option.section || option.details?.section || '';
                  const row = option.row || option.details?.row || '';
                  const seat = option.seat || option.details?.seat || '';
                  const type = option.ticketType || option.details?.ticketType || '';
                  const price = option.price || option.details?.price || '';
                  return (
                    <Card
                      key={idx}
                      sx={{ m: 1, minWidth: 320, border: selections[component.componentType]?.id === option.id ? '2px solid #fff' : '1px solid #888', background: selections[component.componentType]?.id === option.id ? 'rgba(255,255,255,0.08)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => onSelect(component.componentType, option)}
                    >
                      <CardContent>
                        <Typography variant="subtitle2" sx={whiteText}>Ticket</Typography>
                        {section && <Typography sx={whiteText}><strong>Section:</strong> {section}</Typography>}
                        {row && <Typography sx={whiteText}><strong>Row:</strong> {row}</Typography>}
                        {seat && <Typography sx={whiteText}><strong>Seat:</strong> {seat}</Typography>}
                        {type && <Typography sx={whiteText}><strong>Type:</strong> {type}</Typography>}
                        {price && <Typography sx={whiteText}><strong>Price:</strong> ${price}</Typography>}
                      </CardContent>
                    </Card>
                  );
                }
                // --- DEFAULT CARD ---
                return (
                  <Card
                    key={idx}
                    sx={{ m: 1, minWidth: 320, border: selections[component.componentType]?.id === option.id ? '2px solid #fff' : '1px solid #888', background: selections[component.componentType]?.id === option.id ? 'rgba(255,255,255,0.08)' : 'transparent', cursor: 'pointer' }}
                    onClick={() => onSelect(component.componentType, option)}
                  >
                    <CardContent>
                      <Typography sx={whiteText}>{JSON.stringify(option)}</Typography>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Typography sx={{ color: '#fff', opacity: 0.7 }}>No options available for this {component.componentType}.</Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// Step 3: Review & Confirm
const StepReviewConfirm: React.FC<{
  selections: Record<string, any>;
  onEdit: () => void;
}> = ({ selections, onEdit }) => (
  <Box>
    <Typography variant="h6" gutterBottom sx={whiteText}>Review & Confirm</Typography>
    {Object.entries(selections).map(([type, option]) => (
      <Box key={type} mb={2}>
        <Typography variant="subtitle2" sx={whiteText}>{type.charAt(0).toUpperCase() + type.slice(1)}: {option.provider || 'Option'} - {option.price?.total || option.price || ''}</Typography>
      </Box>
    ))}
    <Button onClick={onEdit} variant="outlined" sx={transparentButtonStyles}>Edit Selections</Button>
  </Box>
);

// Step 4: Processing
const StepProcessing: React.FC = () => (
  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={120}>
    <CircularProgress sx={{ color: 'white' }} />
    <Typography mt={2} sx={whiteText}>Processing your booking...</Typography>
  </Box>
);

// Step 5: Complete
const StepComplete: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Box textAlign="center">
    <Typography variant="h5" gutterBottom sx={whiteText}>Booking Complete!</Typography>
    <Typography sx={whiteText}>Your trip has been successfully booked.</Typography>
    <Button onClick={onClose} variant="contained" sx={{ ...transparentButtonStyles, mt: 3 }}>Close</Button>
  </Box>
);

// Main BookingFlow Stepper
const BookingFlowStepper: React.FC<{
  tripId: number;
  open: boolean;
  onClose: () => void;
}> = ({ tripId, open, onClose }) => {
  const { user } = useAuth();
  const { success, error } = useNotifications();
  const { startLoading, stopLoading } = useLoadingState();
  const [activeStep, setActiveStep] = useState(0);
  const [trip, setTrip] = useState<TripSuggestionCamel | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<Record<string, boolean>>({ ticket: true, flight: true, hotel: true, car: true });
  const [selections, setSelections] = useState<Record<string, any>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setSelectedComponents({ ticket: true, flight: true, hotel: true, car: true });
      setSelections({});
      setErrorMsg(null);
      setBookingInProgress(false);
      setTrip(null);
      setLoading(true);
      apiClient.getTripById(tripId)
        .then(res => {
          if (res.success && res.data) {
            let tripData = (res.data as any).suggestion || res.data;
            // Robust mapping for components with fallback for options
            const travelOptions = tripData.travelOptions || {};
            tripData.components = (tripData.components || []).map((component: any) => {
              const componentType = component.componentType || component.component_type;
              let options = component.options;
              if (!options || !Array.isArray(options) || options.length === 0) {
                if (travelOptions[componentType] && Array.isArray(travelOptions[componentType]) && travelOptions[componentType].length > 0) {
                  options = travelOptions[componentType];
                } else if (component.details) {
                  options = [typeof component.details === 'string' ? JSON.parse(component.details) : component.details];
                } else {
                  options = [];
                }
              }
              return {
                ...component,
                componentType,
                options,
                details: typeof component.details === 'string' ? JSON.parse(component.details) : component.details
              };
            });
            setTrip(tripData);
          } else {
            setErrorMsg(res.message || res.error || 'Failed to load trip');
          }
        })
        .catch(e => setErrorMsg(e.message || 'Failed to load trip'))
        .finally(() => setLoading(false));
    }
  }, [open, tripId]);

  const handleComponentChange = (type: string, value: boolean) => {
    setSelectedComponents(prev => ({ ...prev, [type]: value }));
  };

  const handleOptionSelect = (type: string, option: any) => {
    setSelections(prev => ({ ...prev, [type]: option }));
  };

  const handleNext = () => {
    setActiveStep(s => s + 1);
  };

  const handleBack = () => {
    setActiveStep(s => s - 1);
  };

  const handleEdit = () => {
    setActiveStep(1);
  };

  const handleBooking = async () => {
    setBookingInProgress(true);
    setActiveStep(3); // Move to the processing step
    // Simulate booking delay
    setTimeout(() => {
      setBookingInProgress(false);
      setActiveStep(4); // Move to the complete step
    }, 2000);
    // TODO: Replace with real booking API call
    // await apiClient.bookTrip(...)
  };

  // Always show 5 steps
  const steps = [
    {
      label: 'What do you want to book?',
      content: <StepWhatToBook selected={selectedComponents} onChange={handleComponentChange} />
    },
    {
      label: 'Customize Options',
      content: trip ? <StepCustomizeOptions components={trip.components} selected={selectedComponents} selections={selections} onSelect={handleOptionSelect} /> : <CircularProgress />
    },
    {
      label: 'Review & Confirm',
      content: <StepReviewConfirm selections={selections} onEdit={handleEdit} />
    },
    {
      label: 'Processing Booking',
      content: <StepProcessing />
    },
    {
      label: 'Booking Complete',
      content: <StepComplete onClose={onClose} />
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { backgroundColor: '#222', color: 'white' } }}>
      <DialogTitle sx={{ color: 'white', backgroundColor: '#111' }}>Book Your Trip</DialogTitle>
      <DialogContent>
        {errorMsg && <Alert severity="error" sx={{ ...whiteText, backgroundColor: alpha('#fff', 0.08), borderColor: alpha('#fff', 0.2) }}>{errorMsg}</Alert>}
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3, color: 'white', '& .MuiStepLabel-label': { color: 'white !important' }, '& .MuiStepIcon-root': { color: 'white !important' }, '& .MuiStepIcon-text': { fill: 'black' } }}>
          {steps.map((step, idx) => (
            <Step key={step.label} completed={activeStep > idx}>
              <StepLabel sx={{ color: 'white', '& .MuiStepLabel-label': { color: 'white !important' } }}>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Box minHeight={300}>
          {/* Processing step: only show spinner if bookingInProgress, otherwise auto-advance */}
          {activeStep === 3 && !bookingInProgress ? null : steps[activeStep].content}
        </Box>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: '#111' }}>
        {activeStep !== steps.length - 1 && (
          <Button onClick={onClose} sx={{ ...transparentButtonStyles, mr: 2 }}>Cancel</Button>
        )}
        {activeStep > 0 && activeStep < 3 && (
          <Button onClick={handleBack} sx={transparentButtonStyles}>Back</Button>
        )}
        {activeStep < 2 && (
          <Button onClick={handleNext} variant="contained" sx={transparentButtonStyles}>Next</Button>
        )}
        {activeStep === 2 && !bookingInProgress && (
          <Button onClick={handleBooking} variant="contained" sx={transparentButtonStyles} disabled={bookingInProgress}>
            {bookingInProgress ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Book'}
          </Button>
        )}
        {/* No actions on processing or complete steps */}
      </DialogActions>
    </Dialog>
  );
};

export default BookingFlowStepper; 