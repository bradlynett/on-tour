import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import InterestsDragAndDrop, { Interest } from '../components/Interests/InterestsDragAndDrop';
import TripCard, { TripSuggestion } from '../components/TripCard';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

interface TripFeedback {
  trip_suggestion_id: number;
  feedback: string;
}

const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(true);
  const [trips, setTrips] = useState<TripSuggestion[]>([]);
  const [feedback, setFeedback] = useState<TripFeedback[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [artistTrips, setArtistTrips] = useState<TripSuggestion[]>([]);
  const [artistMetadata, setArtistMetadata] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const fetchInterests = async () => {
      if (!token) {
        setError('No authentication token found');
        setLoadingInterests(false);
        return;
      }

      setLoadingInterests(true);
      try {
        const res = await apiClient.get('/users/interests');
        console.log('Interests response:', res);
        if (res.success && res.data && Array.isArray(res.data.interests)) {
          const converted = res.data.interests.map((i: any) => ({
            id: i.id,
            interestType: i.interest_type,
            interestValue: i.interest_value,
            priority: i.priority,
            createdAt: i.created_at,
            localOnly: i.local_only,
          }));
          setInterests(converted);
        } else {
          console.log('No interests found or invalid response structure');
          setInterests([]);
        }
      } catch (err: any) {
        console.error('Error fetching interests:', err);
        if (err.status === 401) {
          setError('Authentication failed. Please log in again.');
          logout();
        } else {
          setError('Failed to load interests');
        }
        setInterests([]);
      } finally {
        setLoadingInterests(false);
      }
    };
    fetchInterests();
  }, [token, logout]);

  useEffect(() => {
    const fetchTripsAndFeedback = async () => {
      if (!token) {
        setError('No authentication token found');
        setLoadingTrips(false);
        return;
      }
      setLoadingTrips(true);
      try {
        // Fetch all trips
        const res = await apiClient.get('/trips?limit=1000');
        // Fetch all feedback
        const feedbackRes = await apiClient.get('/trips/feedback');
        if (res.success && res.data && Array.isArray(res.data.suggestions)) {
          setTrips(res.data.suggestions);
        } else {
          setTrips([]);
        }
        if (feedbackRes.success && Array.isArray(feedbackRes.data)) {
          setFeedback(feedbackRes.data);
        } else {
          setFeedback([]);
        }
      } catch (err: any) {
        setError('Failed to load trip suggestions or feedback');
        setTrips([]);
        setFeedback([]);
      } finally {
        setLoadingTrips(false);
      }
    };
    fetchTripsAndFeedback();
  }, [token, logout]);

  // Split interests by type
  const artistGenreInterests = interests.filter(i => i.interestType === 'artist' || i.interestType === 'genre');
  const cityVenueInterests = interests.filter(i => i.interestType === 'city' || i.interestType === 'venue');

  // Filter out trips with feedback 'down' and sort by best available score
  const feedbackDownIds = new Set(feedback.filter(f => f.feedback === 'down').map(f => f.trip_suggestion_id));
  const visibleTrips = trips
    .filter(trip => !feedbackDownIds.has(trip.id))
    .sort((a, b) => {
      // Use priorityScore, matchScore, or totalScore if available, else 0
      const aScore = (a.priorityScore ?? a.matchScore ?? a.totalScore ?? 0);
      const bScore = (b.priorityScore ?? b.matchScore ?? b.totalScore ?? 0);
      return bScore - aScore;
    });

  // Group trips by artist
  const tripsByArtist: { [artist: string]: TripSuggestion[] } = {};
  visibleTrips.forEach(trip => {
    const artist = trip.artist || 'Unknown Artist';
    if (!tripsByArtist[artist]) tripsByArtist[artist] = [];
    tripsByArtist[artist].push(trip);
  });

  // Fetch artist metadata when modal opens
  useEffect(() => {
    if (selectedArtist && modalOpen) {
      setArtistMetadata(null);
      // Fetch artist metadata from backend
      apiClient.get(`/artistMetadata/${encodeURIComponent(selectedArtist)}`)
        .then(res => {
          if (res && res.data) setArtistMetadata(res.data);
        })
        .catch(() => setArtistMetadata(null));
      // Set trips for this artist
      setArtistTrips(tripsByArtist[selectedArtist] || []);
    }
  }, [selectedArtist, modalOpen]);

  if (!user || !token) {
    return (
      <Box sx={{ 
        flexGrow: 1, 
        p: 3, 
        background: 'transparent', 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="h4" sx={{ color: 'white', mb: 2 }}>
          Please log in to access your dashboard
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.href = '/login'}
          sx={{ color: 'white' }}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      flexGrow: 1, 
      p: 3, 
      background: 'transparent', 
      minHeight: '100vh',
      display: 'flex',
      gap: 3
    }}>
      {/* Left column: Artist/Genre Interests */}
      <Box sx={{ flex: '0 0 25%', minWidth: 0 }}>
        <Paper sx={{ 
          background: 'transparent', 
          color: 'white', 
          p: 2,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: 'none'
        }} elevation={0}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>Artist & Genre Interests</Typography>
          {loadingInterests ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: 'white' }} />
            </Box>
          ) : (
            <InterestsDragAndDrop
              initialInterests={artistGenreInterests}
              droppableId="dashboard-artist-genre"
              title=""
              onInterestsUpdated={updated => {
                // Update only artist/genre interests
                const merged = [
                  ...updated,
                  ...cityVenueInterests
                ];
                setInterests(merged);
              }}
            />
          )}
        </Paper>
      </Box>
      
      {/* Center column: Trip Cards */}
      <Box sx={{ flex: '0 0 50%', minWidth: 0 }}>
        <Box sx={{ color: 'white' }}>
          <Typography variant="h4" sx={{ color: 'white', mb: 2 }}>Trip Suggestions</Typography>
          {loadingTrips ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: 'white' }} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', '& .MuiAlert-icon': { color: 'white' } }}>{error}</Alert>
          ) : Object.keys(tripsByArtist).length === 0 ? (
            <Typography sx={{ color: 'white' }}>No trip suggestions found.</Typography>
          ) : (
            <Stack spacing={2}>
              {Object.entries(tripsByArtist).map(([artist, trips]) => {
                if (trips.length === 0) return null;
                const soonestTrip = trips.reduce((min, t) => {
                  const tDate = new Date(t.eventDate);
                  const minDate = new Date(min.eventDate);
                  return tDate < minDate ? t : min;
                }, trips[0]);
                return (
                  <Box key={artist} sx={{ position: 'relative', cursor: 'pointer' }} onClick={() => { setSelectedArtist(artist); setModalOpen(true); }}>
                    <TripCard trip={soonestTrip} onRemove={(tripId: number) => setTrips(prev => prev.filter(t => t.id !== tripId))} {...(trips.length > 1 ? { moreShows: trips.length - 1 } : {})} />
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </Box>
      
      {/* Right column: City/Venue Interests */}
      <Box sx={{ flex: '0 0 25%', minWidth: 0 }}>
        <Paper sx={{ 
          background: 'transparent', 
          color: 'white', 
          p: 2,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: 'none'
        }} elevation={0}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>City & Venue Interests</Typography>
          {loadingInterests ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress sx={{ color: 'white' }} />
            </Box>
          ) : (
            <InterestsDragAndDrop
              initialInterests={cityVenueInterests}
              droppableId="dashboard-city-venue"
              title=""
              onInterestsUpdated={updated => {
                // Update only city/venue interests
                const merged = [
                  ...artistGenreInterests,
                  ...updated
                ];
                setInterests(merged);
              }}
            />
          )}
        </Paper>
      </Box>

      {/* Artist Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar src={artistMetadata?.image_url || undefined} alt={selectedArtist || ''} sx={{ width: 48, height: 48, mr: 2 }}>{selectedArtist?.[0]}</Avatar>
            <Typography variant="h6">{selectedArtist}</Typography>
          </Box>
          <IconButton onClick={() => setModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {artistTrips.length === 0 ? (
            <Typography>No trips found for this artist.</Typography>
          ) : (
            <Stack spacing={2}>
              {artistTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} onRemove={(tripId: number) => setTrips(prev => prev.filter(t => t.id !== tripId))} />
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Dashboard; 