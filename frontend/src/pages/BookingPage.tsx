import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Snackbar,
  Alert,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Flight as FlightIcon,
  Hotel as HotelIcon,
  ConfirmationNumber as TicketIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';

import TripCustomization from '../components/TripCustomization';
import BookingManagement from '../components/BookingManagement';
import PaymentFlow from '../components/PaymentFlow';
import EventSearch from '../components/Events/EventSearch';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`booking-tabpanel-${index}`}
      aria-labelledby={`booking-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const BookingPage: React.FC = () => {
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'|'info'}>({open: false, message: '', severity: 'success'});

  // Handle selectedEvent from navigation state
  useEffect(() => {
    if (location.state?.selectedEvent) {
      setSelectedEvent(location.state.selectedEvent);
      setShowCustomization(true);
      // Clear the state to prevent it from persisting
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEventSelect = (event: any) => {
    setSelectedEvent(event);
    setShowCustomization(true);
  };

  const handleBookingComplete = (bookingId: number) => {
    setCurrentBooking({ id: bookingId });
    setShowCustomization(false);
    setShowPayment(true);
    setSnackbar({open: true, message: 'Booking created! Proceeding to payment...', severity: 'success'});
  };

  const handlePaymentComplete = (paymentId: string) => {
    setShowPayment(false);
    setCurrentBooking(null);
    setSelectedEvent(null);
    setSnackbar({open: true, message: 'Payment completed successfully!', severity: 'success'});
    // Refresh bookings list
    setTabValue(1);
  };

  const handlePaymentFailed = (error: string) => {
    setShowPayment(false);
    setSnackbar({open: true, message: `Payment failed: ${error}`, severity: 'error'});
  };

  const handleViewBooking = (bookingId: number) => {
    // Navigate to booking details or open a detailed view
    setSnackbar({open: true, message: `Viewing booking #${bookingId}`, severity: 'info'});
  };

  const handleEditBooking = (bookingId: number) => {
    // Navigate to booking edit or open edit dialog
    setSnackbar({open: true, message: `Editing booking #${bookingId}`, severity: 'info'});
  };

  const tabs = [
    { label: 'Find Events', icon: <TicketIcon /> },
    { label: 'My Bookings', icon: <FlightIcon /> },
    { label: 'Trip Planning', icon: <HotelIcon /> }
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Concert Travel Booking
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Find events, plan trips, and manage your bookings
        </Typography>

        {/* Main Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="fullWidth"
            aria-label="booking tabs"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                id={`booking-tab-${index}`}
                aria-controls={`booking-tabpanel-${index}`}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          <EventSearch onEventSelect={handleEventSelect} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <BookingManagement
            onViewBooking={handleViewBooking}
            onEditBooking={handleEditBooking}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Trip Planning
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Start planning your next concert trip by finding events and customizing your travel package.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setTabValue(0)}
              >
                Find Events
              </Button>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Floating Action Button for Quick Booking */}
        <Fab
          color="primary"
          aria-label="add booking"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setTabValue(0)}
        >
          <AddIcon />
        </Fab>

        {/* Trip Customization Dialog */}
        {selectedEvent && (
          <TripCustomization
            eventId={selectedEvent.id}
            eventName={selectedEvent.name}
            artist={selectedEvent.artist}
            venueCity={selectedEvent.venue_city}
            eventDate={selectedEvent.event_date}
            onBookingComplete={handleBookingComplete}
            onClose={() => {
              setShowCustomization(false);
              setSelectedEvent(null);
            }}
          />
        )}

        {/* Payment Flow Dialog */}
        {currentBooking && showPayment && (
          <PaymentFlow
            bookingId={currentBooking.id}
            amount={currentBooking.amount || 0}
            currency="usd"
            onPaymentComplete={handlePaymentComplete}
            onPaymentFailed={handlePaymentFailed}
            onClose={() => {
              setShowPayment(false);
              setCurrentBooking(null);
            }}
          />
        )}

        {/* Global Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({...snackbar, open: false})}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({...snackbar, open: false})}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default BookingPage; 