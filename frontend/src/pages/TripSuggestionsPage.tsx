import React, { useEffect, useState } from 'react';
import apiClient from '../services/apiClient';
import TripCard, { TripSuggestion } from '../components/TripCard';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';

const TripSuggestionsPage: React.FC = () => {
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/trips');
      console.log('🔍 Raw API response:', res);
      
      if (res.success && res.data && Array.isArray(res.data.suggestions)) {
        // Map backend data to TripSuggestion type with enhanced field mapping
        const mapped: TripSuggestion[] = res.data.suggestions.map((s: any) => {
          console.log('🔍 Mapping trip suggestion:', s);
          
          // Ensure components are properly mapped with all enhanced fields
          const mappedComponents = Array.isArray(s.components) ? s.components.map((c: any) => {
            console.log('🔍 Mapping component:', c);
            
            // Parse details if it's a string
            let parsedDetails = c.details;
            if (typeof c.details === 'string') {
              try {
                parsedDetails = JSON.parse(c.details);
              } catch (e) {
                console.warn('Failed to parse component details:', e);
                parsedDetails = c.details;
              }
            }
            
            return {
              componentType: c.component_type || c.componentType,
              provider: c.provider,
              price: typeof c.price === 'string' ? parseFloat(c.price) : c.price,
              bookingUrl: c.bookingUrl || c.booking_url || c.url,
              details: parsedDetails,
              searchProvider: c.searchProvider || c.provider, // Enhanced: track which provider found this
              priceType: c.priceType || 'real', // Enhanced: real vs estimated pricing
              enrichedDetails: c.enrichedDetails || parsedDetails, // Enhanced: full enriched details
              options: c.options || [] // Enhanced: multiple options for this component
            };
          }) : [];
          
          return {
            id: s.id,
            eventName: s.event_name || s.eventName || '',
            artist: s.artist || '',
            venueName: s.venue_name || s.venueName || '',
            venueCity: s.venue_city || s.venueCity || '',
            venueState: s.venue_state || s.venueState || '',
            eventDate: s.event_date || s.eventDate || '',
            ticketUrl: s.ticket_url || s.ticketUrl,
            totalCost: typeof s.total_cost === 'string' ? parseFloat(s.total_cost) : s.total_cost,
            serviceFee: typeof s.service_fee === 'string' ? parseFloat(s.service_fee) : s.service_fee,
            status: s.status,
            createdAt: s.created_at || s.createdAt,
            updatedAt: s.updated_at || s.updatedAt,
            components: mappedComponents,
            metadataInsights: s.metadataInsights,
            artistRecommendations: s.artistRecommendations,
            genreInsights: s.genreInsights,
            socialInsights: s.socialInsights,
            priceBreakdown: s.priceBreakdown,
            bookingUrls: s.bookingUrls,
            priorityScore: s.priorityScore ?? s.priority_score,
            matchScore: s.matchScore ?? s.match_score,
            totalScore: s.totalScore ?? s.total_score,
          };
        });
        
        console.log('✅ Mapped trip suggestions:', mapped);
        setSuggestions(mapped);
      } else {
        console.error('❌ Invalid API response structure:', res);
        setError(res.message || 'Failed to load trip suggestions');
      }
    } catch (err: any) {
      console.error('❌ Error fetching trip suggestions:', err);
      setError(err.response?.data?.message || 'Failed to load trip suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTrip = (tripId: number) => {
    setSuggestions(prev => prev.filter(trip => trip.id !== tripId));
  };

  const handleBookNow = (trip: TripSuggestion) => {
    console.log('🎯 Booking trip:', trip);
    // Implement booking logic here
    window.open(trip.ticketUrl, '_blank');
  };

  const handleGenerateNewSuggestions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/trips/generate', { limit: 5 });
      if (res.success) {
        console.log('✅ Generated new trip suggestions:', res.data);
        await fetchSuggestions(); // Refresh the list
      } else {
        setError(res.message || 'Failed to generate new suggestions');
      }
    } catch (err: any) {
      console.error('❌ Error generating suggestions:', err);
      setError(err.response?.data?.message || 'Failed to generate new suggestions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <CircularProgress />
    </Box>
  );
  
  if (error) return (
    <Box sx={{ p: 2 }}>
      <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      <Button variant="contained" onClick={fetchSuggestions}>
        Retry
      </Button>
    </Box>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>Trip Suggestions</Typography>
        <Button 
          variant="contained" 
          onClick={handleGenerateNewSuggestions}
          disabled={loading}
        >
          Generate New Suggestions
        </Button>
      </Box>
      
      {suggestions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
            No trip suggestions found.
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mb: 3 }}>
            Generate new trip suggestions based on your interests and preferences.
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleGenerateNewSuggestions}
            disabled={loading}
          >
            Generate Suggestions
          </Button>
        </Box>
      ) : (
        <Box>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2 }}>
            Found {suggestions.length} trip suggestion{suggestions.length !== 1 ? 's' : ''}
          </Typography>
          {suggestions.map(trip => (
            <TripCard 
              key={trip.id} 
              trip={trip} 
              onBookNow={handleBookNow}
              onRemove={handleRemoveTrip}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TripSuggestionsPage; 