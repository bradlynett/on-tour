import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardActions, Typography, Button, Chip, Divider, Box, Stack, Tooltip, IconButton } from '@mui/material';
import { 
  Favorite, 
  FavoriteBorder, 
  Save, 
  SaveOutlined, 
  Link as LinkIcon, 
  Hotel, 
  Flight, 
  DirectionsCar, 
  ConfirmationNumber, 
  VisibilityOff,
  ThumbUp,
  ThumbUpOutlined,
  ThumbDown,
  ThumbDownOutlined,
  Close
} from '@mui/icons-material';
import apiClient from '../services/apiClient';

// Types for trip and components (from backend)
export interface TripComponent {
  componentType: string;
  provider?: string;
  price?: number;
  bookingUrl?: string;
  details?: any;
  searchProvider?: string; // Enhanced: tracks which provider found this result
  priceType?: 'real' | 'estimated'; // Enhanced: indicates if price is real or estimated
  enrichedDetails?: any; // Enhanced: full enriched details from backend
  options?: any[]; // Enhanced: multiple options for this component
}

export interface TripSuggestion {
  id: number;
  eventName: string;
  artist: string;
  venueName: string;
  venueCity: string;
  venueState: string;
  eventDate: string;
  ticketUrl?: string;
  totalCost?: number;
  serviceFee?: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  components: TripComponent[];
  metadataInsights?: any;
  artistRecommendations?: any[];
  genreInsights?: any;
  socialInsights?: any;
  priceBreakdown?: { real: number; estimated: number };
  bookingUrls?: { [key: string]: string };
  priorityScore?: number;
  matchScore?: number;
  totalScore?: number;
}

interface TripCardProps {
  trip: TripSuggestion;
  onBookNow?: (trip: TripSuggestion) => void;
  onViewDetails?: (trip: TripSuggestion) => void;
  onRemove?: (tripId: number) => void;
  moreShows?: number;
}

const componentIcons: Record<string, React.ReactNode> = {
  ticket: <ConfirmationNumber sx={{ color: 'white' }} />, 
  hotel: <Hotel sx={{ color: 'white' }} />, 
  flight: <Flight sx={{ color: 'white' }} />, 
  car: <DirectionsCar sx={{ color: 'white' }} />
};

const TripCard: React.FC<TripCardProps> = ({ trip, onBookNow, onViewDetails, onRemove, moreShows }) => {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<'double_up' | 'up' | 'down' | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load user feedback on component mount
  useEffect(() => {
    loadUserFeedback();
    checkIfSaved();
  }, [trip.id]);

  const loadUserFeedback = async () => {
    try {
      const response = await apiClient.get(`/trips/${trip.id}/feedback`);
      if (response.success && response.data) {
        setFeedback(response.data.feedback);
        setIsLiked(response.data.feedback === 'up' || response.data.feedback === 'double_up');
      }
    } catch (error) {
      console.error('Failed to load feedback:', error);
    }
  };

  const checkIfSaved = async () => {
    try {
      // This would need a backend endpoint to check if trip is saved
      // For now, we'll use localStorage as a fallback
      const savedTrips = JSON.parse(localStorage.getItem('savedTrips') || '[]');
      setIsSaved(savedTrips.includes(trip.id));
    } catch (error) {
      console.error('Failed to check saved status:', error);
    }
  };

  const handleFeedback = async (newFeedback: 'double_up' | 'up' | 'down' | null) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await apiClient.post(`/trips/${trip.id}/feedback`, {
        feedback: newFeedback
      });
      
      if (response.success) {
        setFeedback(newFeedback);
        setIsLiked(newFeedback === 'up' || newFeedback === 'double_up');
        if (newFeedback === 'down') {
          await handleRemove();
        }
      }
    } catch (error) {
      console.error('Failed to save feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      if (!isSaved) {
        const response = await apiClient.post(`/trips/${trip.id}/save`);
        if (response.success) {
          setIsSaved(true);
          // Update localStorage
          const savedTrips = JSON.parse(localStorage.getItem('savedTrips') || '[]');
          savedTrips.push(trip.id);
          localStorage.setItem('savedTrips', JSON.stringify(savedTrips));
        }
      } else {
        // Remove from saved
        const savedTrips = JSON.parse(localStorage.getItem('savedTrips') || '[]');
        const updatedTrips = savedTrips.filter((id: number) => id !== trip.id);
        localStorage.setItem('savedTrips', JSON.stringify(updatedTrips));
        setIsSaved(false);
      }
    } catch (error) {
      console.error('Failed to save/unsave trip:', error);
    } finally {
      setLoading(false);
    }
  };

  // Replace handleRemove with version that also sets feedback to 'down'
  const handleRemove = async () => {
    if (onRemove) {
      try {
        // Set feedback to 'down' before hiding
        await apiClient.post(`/trips/${trip.id}/feedback`, { feedback: 'down' });
      } catch (e) {
        // Ignore feedback error, still proceed to hide
      }
      onRemove(trip.id); // Optimistically remove
      try {
        await apiClient.patch(`/trips/${trip.id}/status`, { status: 'rejected' });
      } catch (error) {
        alert('Failed to hide trip. Please try again.');
        // Optionally: restore the card by calling a restore handler
      }
    }
  };

  const formatPrice = (price: number | null | undefined, priceType?: string) => {
    if (price === null || price === undefined) return 'N/A';
    const formatted = `$${price.toLocaleString()}`;
    if (priceType === 'estimated') {
      return `${formatted} (est.)`;
    }
    return formatted;
  };

  const handleComponentBooking = (component: any) => {
    // Enhanced booking URL detection - check multiple possible fields
    const bookingUrl = component.bookingUrl || 
                      component.booking_url || 
                      component.url ||
                      (component.enrichedDetails && (
                        component.enrichedDetails.bookingUrl || 
                        component.enrichedDetails.booking_url || 
                        component.enrichedDetails.url
                      ));
    
    if (bookingUrl) {
      console.log(`🔗 Opening booking URL: ${bookingUrl}`);
      window.open(bookingUrl, '_blank');
    } else {
      console.warn('❌ No booking URL found for component:', component);
    }
  };

  const renderComponent = (component: any) => {
    const price = formatPrice(component.price, component.priceType);
    // Enhanced booking URL detection - check multiple possible fields
    const hasBookingUrl = component.bookingUrl || 
                         component.booking_url || 
                         component.url ||
                         (component.enrichedDetails && (
                           component.enrichedDetails.bookingUrl || 
                           component.enrichedDetails.booking_url || 
                           component.enrichedDetails.url
                         ));
    const searchProvider = component.searchProvider || component.provider;
    const priceType = component.priceType || 'real';
    
    // Enhanced details from enriched data
    const enrichedDetails = component.enrichedDetails || component.details;
    
    return (
      <Box key={component.componentType} sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 1,
        mb: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 1,
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
              {component.componentType.charAt(0).toUpperCase() + component.componentType.slice(1)}
            </Typography>
            {/* Provider badge with enhanced styling */}
            <Chip
              label={searchProvider}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '0.7rem',
                height: '20px',
                '& .MuiChip-label': { px: 1 }
              }}
            />
            {/* Price type indicator */}
            {priceType === 'estimated' && (
              <Chip
                label="EST"
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 193, 7, 0.2)',
                  color: '#ffc107',
                  fontSize: '0.6rem',
                  height: '18px',
                  '& .MuiChip-label': { px: 0.5 }
                }}
              />
            )}
          </Box>
          
          {/* Enhanced details display */}
          {enrichedDetails && (
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block' }}>
              {component.componentType === 'flight' && (
                enrichedDetails.airline ? 
                  `${enrichedDetails.airline} • ${enrichedDetails.departure || enrichedDetails.departureAirport} → ${enrichedDetails.arrival || enrichedDetails.arrivalAirport}` :
                  enrichedDetails.departure && enrichedDetails.arrival ?
                    `${enrichedDetails.departure} → ${enrichedDetails.arrival}` :
                    'Flight details available'
              )}
              {component.componentType === 'hotel' && (
                enrichedDetails.name ? 
                  `${enrichedDetails.name} • ${enrichedDetails.city || enrichedDetails.location}` :
                  enrichedDetails.brand ? 
                    `${enrichedDetails.brand} • ${enrichedDetails.city || enrichedDetails.location}` :
                    'Hotel details available'
              )}
              {component.componentType === 'car' && (
                enrichedDetails.model || enrichedDetails.carType ? 
                  `${enrichedDetails.model || enrichedDetails.carType} • ${enrichedDetails.pickupLocation || enrichedDetails.location}` :
                  enrichedDetails.brand ? 
                    `${enrichedDetails.brand} • ${enrichedDetails.pickupLocation || enrichedDetails.location}` :
                    'Car rental details available'
              )}
              {component.componentType === 'ticket' && (
                enrichedDetails.section ? 
                  `${enrichedDetails.section} • ${enrichedDetails.ticketType || 'Standard'}` :
                  enrichedDetails.ticketType ? 
                    `${enrichedDetails.ticketType} tickets` :
                    'Ticket details available'
              )}
            </Typography>
          )}
          
          {/* Show if multiple options are available */}
          {component.options && component.options.length > 1 && (
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mt: 0.5 }}>
              +{component.options.length - 1} more options available
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
            {price}
          </Typography>
          {hasBookingUrl && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleComponentBooking(component)}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Book
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Card sx={{
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 2,
      mb: 2,
      backdropFilter: 'blur(10px)',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.2)'
      }
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
              {trip.eventName}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 0.5 }}>
              {trip.artist}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 0.5, display: 'flex', alignItems: 'center' }}>
              {trip.venueName}, {trip.venueCity}, {trip.venueState}
              {moreShows && moreShows > 0 && (
                <span style={{ marginLeft: 8, color: '#ffd700', fontWeight: 500, fontSize: '0.95em' }}>+{moreShows} more shows</span>
              )}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {new Date(trip.eventDate).toLocaleDateString()}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right', position: 'relative' }}>
            <IconButton
              aria-label="Hide trip"
              size="small"
              onClick={handleRemove}
              sx={{ position: 'absolute', top: 0, right: 0, color: 'white', zIndex: 2000, background: '#222' }}
            >
              <Close fontSize="small" />
            </IconButton>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', mt: 4 }}>
              {formatPrice(trip.totalCost)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              + ${trip.serviceFee} service fee
            </Typography>
          </Box>
        </Box>

        {/* Trip Components */}
        {trip.components && trip.components.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 'bold' }}>
                Trip Components
              </Typography>
              {/* Provider summary */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {Array.from(new Set(trip.components.map(c => c.searchProvider || c.provider).filter(Boolean))).map(provider => (
                  <Chip
                    key={provider}
                    label={provider}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '0.6rem',
                      height: '18px',
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                  />
                ))}
              </Box>
            </Box>
            {trip.components.map(renderComponent)}
          </Box>
        )}

        {/* Price Breakdown */}
        {trip.priceBreakdown && (
          <Box sx={{ mb: 2, p: 1, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Price Breakdown: ${trip.priceBreakdown.real || 0} real + ${trip.priceBreakdown.estimated || 0} estimated
            </Typography>
          </Box>
        )}

        {/* User Feedback Actions */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Heart/Like */}
            <Tooltip title="Love this trip">
              <IconButton
                onClick={(e) => { e.stopPropagation(); handleFeedback(feedback === 'double_up' ? null : 'double_up'); }}
                disabled={loading}
                sx={{ 
                  color: feedback === 'double_up' ? '#ff4081' : 'rgba(255, 255, 255, 0.6)',
                  '&:hover': { color: '#ff4081' }
                }}
              >
                {feedback === 'double_up' ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
            </Tooltip>

            {/* Thumbs Up */}
            <Tooltip title="Like this trip">
              <IconButton
                onClick={(e) => { e.stopPropagation(); handleFeedback(feedback === 'up' ? null : 'up'); }}
                disabled={loading}
                sx={{ 
                  color: feedback === 'up' ? '#4caf50' : 'rgba(255, 255, 255, 0.6)',
                  '&:hover': { color: '#4caf50' }
                }}
              >
                {feedback === 'up' ? <ThumbUp /> : <ThumbUpOutlined />}
              </IconButton>
            </Tooltip>

            {/* Thumbs Down */}
            <Tooltip title="Dislike this trip">
              <IconButton
                onClick={(e) => { e.stopPropagation(); handleFeedback(feedback === 'down' ? null : 'down'); }}
                disabled={loading}
                sx={{ 
                  color: feedback === 'down' ? '#f44336' : 'rgba(255, 255, 255, 0.6)',
                  '&:hover': { color: '#f44336' }
                }}
              >
                {feedback === 'down' ? <ThumbDown /> : <ThumbDownOutlined />}
              </IconButton>
            </Tooltip>

            {/* Save */}
            <Tooltip title={isSaved ? "Remove from saved" : "Save for later"}>
              <IconButton
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                disabled={loading}
                sx={{ 
                  color: isSaved ? '#ffc107' : 'rgba(255, 255, 255, 0.6)',
                  '&:hover': { color: '#ffc107' }
                }}
              >
                {isSaved ? <Save /> : <SaveOutlined />}
              </IconButton>
            </Tooltip>

            {/* Remove */}
            {onRemove && (
              <Tooltip title="Remove this trip">
                <IconButton
                  onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                  disabled={loading}
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)',
                    '&:hover': { color: '#f44336' }
                  }}
                >
                  <Close />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onBookNow && (
              <Button
                size="small"
                variant="contained"
                onClick={(e) => { e.stopPropagation(); onBookNow(trip); }}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)'
                  }
                }}
              >
                Book Trip
              </Button>
            )}
          </Box>
        </Box>

        {/* Expanded Details */}
        {expanded && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
              <strong>Status:</strong> {trip.status}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
              <strong>Created:</strong> {new Date(trip.createdAt).toLocaleDateString()}
            </Typography>
            
            {/* Enhanced Data Quality Info */}
            {trip.components && trip.components.length > 0 && (
              <Box sx={{ mb: 2, p: 1, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', mb: 0.5 }}>
                  <strong>Data Sources:</strong>
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {Array.from(new Set(trip.components.map(c => c.searchProvider || c.provider).filter(Boolean))).map(provider => (
                    <Chip
                      key={provider}
                      label={provider}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '0.6rem',
                        height: '16px',
                        '& .MuiChip-label': { px: 0.5 }
                      }}
                    />
                  ))}
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', mt: 0.5 }}>
                  Real-time data from multiple providers for competitive pricing
                </Typography>
              </Box>
            )}
            {trip.bookingUrls && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                  Quick Booking Links:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(trip.bookingUrls).map(([type, url]) => (
                    <Button
                      key={type}
                      size="small"
                      variant="outlined"
                      onClick={(e) => { e.stopPropagation(); window.open(url as string, '_blank'); }}
                      sx={{
                        color: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        fontSize: '0.75rem',
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TripCard; 