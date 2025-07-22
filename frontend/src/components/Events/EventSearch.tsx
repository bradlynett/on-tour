import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Card,
    CardContent,
    CardActions,
    Typography,
    Grid,
    Chip,
    CircularProgress,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Pagination,
    IconButton,
    Tooltip,
    Divider
} from '@mui/material';
import {
    Search as SearchIcon,
    LocationOn as LocationIcon,
    Event as EventIcon,
    AttachMoney as PriceIcon,
    Favorite as FavoriteIcon,
    FavoriteBorder as FavoriteBorderIcon,
    Share as ShareIcon,
    CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

interface Event {
    id?: number;
    externalId: string;
    name: string;
    artist: string;
    eventType?: string;
    eventSubtype?: string;
    venueName: string;
    venueCity: string;
    venueState: string;
    eventDate: string;
    ticketUrl: string;
    minPrice?: number;
    maxPrice?: number;
    currency: string;
    status: string;
    images?: Array<{
        url: string;
        width: number;
        height: number;
    }>;
}

interface EventSearchProps {
    onEventSelect?: (event: Event) => void;
}

interface SearchParams {
    keyword: string;
    city: string;
    state: string;
    eventType?: string;
    eventSubtype?: string;
    startDateTime: string;
    endDateTime: string;
    size: number;
    page: number;
}

const EventSearch: React.FC<EventSearchProps> = ({ onEventSelect }) => {
    const { user } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useState<SearchParams>({
        keyword: '',
        city: '',
        state: '',
        eventType: '',
        eventSubtype: '',
        startDateTime: '',
        endDateTime: '',
        size: 20,
        page: 0
    });
    const [pagination, setPagination] = useState({
        totalElements: 0,
        totalPages: 0,
        currentPage: 0
    });
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    // US States for dropdown
    const usStates = [
        { code: '', name: 'All States' },
        { code: 'AL', name: 'Alabama' },
        { code: 'AK', name: 'Alaska' },
        { code: 'AZ', name: 'Arizona' },
        { code: 'AR', name: 'Arkansas' },
        { code: 'CA', name: 'California' },
        { code: 'CO', name: 'Colorado' },
        { code: 'CT', name: 'Connecticut' },
        { code: 'DE', name: 'Delaware' },
        { code: 'FL', name: 'Florida' },
        { code: 'GA', name: 'Georgia' },
        { code: 'HI', name: 'Hawaii' },
        { code: 'ID', name: 'Idaho' },
        { code: 'IL', name: 'Illinois' },
        { code: 'IN', name: 'Indiana' },
        { code: 'IA', name: 'Iowa' },
        { code: 'KS', name: 'Kansas' },
        { code: 'KY', name: 'Kentucky' },
        { code: 'LA', name: 'Louisiana' },
        { code: 'ME', name: 'Maine' },
        { code: 'MD', name: 'Maryland' },
        { code: 'MA', name: 'Massachusetts' },
        { code: 'MI', name: 'Michigan' },
        { code: 'MN', name: 'Minnesota' },
        { code: 'MS', name: 'Mississippi' },
        { code: 'MO', name: 'Missouri' },
        { code: 'MT', name: 'Montana' },
        { code: 'NE', name: 'Nebraska' },
        { code: 'NV', name: 'Nevada' },
        { code: 'NH', name: 'New Hampshire' },
        { code: 'NJ', name: 'New Jersey' },
        { code: 'NM', name: 'New Mexico' },
        { code: 'NY', name: 'New York' },
        { code: 'NC', name: 'North Carolina' },
        { code: 'ND', name: 'North Dakota' },
        { code: 'OH', name: 'Ohio' },
        { code: 'OK', name: 'Oklahoma' },
        { code: 'OR', name: 'Oregon' },
        { code: 'PA', name: 'Pennsylvania' },
        { code: 'RI', name: 'Rhode Island' },
        { code: 'SC', name: 'South Carolina' },
        { code: 'SD', name: 'South Dakota' },
        { code: 'TN', name: 'Tennessee' },
        { code: 'TX', name: 'Texas' },
        { code: 'UT', name: 'Utah' },
        { code: 'VT', name: 'Vermont' },
        { code: 'VA', name: 'Virginia' },
        { code: 'WA', name: 'Washington' },
        { code: 'WV', name: 'West Virginia' },
        { code: 'WI', name: 'Wisconsin' },
        { code: 'WY', name: 'Wyoming' }
    ];

    const searchEvents = async (params: SearchParams = searchParams) => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value) queryParams.append(key, value.toString());
            });

            const response = await api.get(`/events/search?${queryParams}`);
            
            if (response.data.success) {
                setEvents(response.data.data);
                setPagination({
                    totalElements: response.data.pagination.totalElements,
                    totalPages: response.data.pagination.totalPages,
                    currentPage: response.data.pagination.page.number
                });
            } else {
                setError('Failed to search events');
            }
        } catch (err: any) {
            console.error('Error searching events:', err);
            setError(err.response?.data?.message || 'Failed to search events');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setSearchParams(prev => ({ ...prev, page: 0 }));
        searchEvents({ ...searchParams, page: 0 });
    };

    const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
        const newParams = { ...searchParams, page: page - 1 };
        setSearchParams(newParams);
        searchEvents(newParams);
    };

    const handleQuickSearch = (type: 'upcoming' | 'popular') => {
        const today = new Date();
        const threeMonthsFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
        
        const newParams: SearchParams = {
            keyword: type === 'popular' ? 'concert' : '',
            city: '',
            state: '',
            startDateTime: today.toISOString(),
            endDateTime: threeMonthsFromNow.toISOString(),
            size: 20,
            page: 0
        };

        setSearchParams(newParams);
        searchEvents(newParams);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatPrice = (minPrice?: number, maxPrice?: number, currency: string = 'USD') => {
        if (!minPrice && !maxPrice) return 'Price TBA';
        if (minPrice === maxPrice) return `${currency} ${minPrice}`;
        return `${currency} ${minPrice || 'N/A'} - ${maxPrice || 'N/A'}`;
    };

    const toggleFavorite = (eventId: string) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(eventId)) {
                newFavorites.delete(eventId);
            } else {
                newFavorites.add(eventId);
            }
            return newFavorites;
        });
    };

    const shareEvent = (event: Event) => {
        const text = `Check out ${event.name} at ${event.venueName} on ${formatDate(event.eventDate)}!`;
        if (navigator.share) {
            navigator.share({
                title: event.name,
                text: text,
                url: event.ticketUrl
            });
        } else {
            navigator.clipboard.writeText(`${text}\n${event.ticketUrl}`);
            alert('Event details copied to clipboard!');
        }
    };

    useEffect(() => {
        // Load initial upcoming events
        handleQuickSearch('upcoming');
    }, []);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                🎵 Event Search
            </Typography>
            
            {/* Quick Search Buttons */}
            <Box sx={{ mb: 3 }}>
                <Button
                    variant="outlined"
                    onClick={() => handleQuickSearch('upcoming')}
                    startIcon={<CalendarIcon />}
                    sx={{ mr: 2 }}
                >
                    Upcoming Events
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => handleQuickSearch('popular')}
                    startIcon={<EventIcon />}
                >
                    Popular Concerts
                </Button>
            </Box>

            {/* Search Form */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                            <TextField
                                fullWidth
                                label="Search Events"
                                placeholder="Artist, venue, or event name"
                                value={searchParams.keyword}
                                onChange={(e) => setSearchParams(prev => ({ ...prev, keyword: e.target.value }))}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                            <TextField
                                fullWidth
                                label="City"
                                placeholder="Enter city name"
                                value={searchParams.city}
                                onChange={(e) => setSearchParams(prev => ({ ...prev, city: e.target.value }))}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                            <FormControl fullWidth>
                                <InputLabel>State</InputLabel>
                                <Select
                                    value={searchParams.state}
                                    label="State"
                                    onChange={(e) => setSearchParams(prev => ({ ...prev, state: e.target.value }))}
                                >
                                    {usStates.map((state) => (
                                        <MenuItem key={state.code} value={state.code}>
                                            {state.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                            <FormControl fullWidth>
                                <InputLabel>Event Type</InputLabel>
                                <Select
                                    value={searchParams.eventType || ''}
                                    label="Event Type"
                                    onChange={(e) => setSearchParams(prev => ({ ...prev, eventType: e.target.value }))}
                                >
                                    <MenuItem value="">All Types</MenuItem>
                                    <MenuItem value="music">Music</MenuItem>
                                    <MenuItem value="sports">Sports</MenuItem>
                                    <MenuItem value="comedy">Comedy</MenuItem>
                                    <MenuItem value="theater">Theater</MenuItem>
                                    <MenuItem value="family">Family</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                            <TextField
                                fullWidth
                                type="date"
                                label="From Date"
                                value={searchParams.startDateTime.split('T')[0]}
                                onChange={(e) => setSearchParams(prev => ({ 
                                    ...prev, 
                                    startDateTime: e.target.value ? new Date(e.target.value).toISOString() : '' 
                                }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                        <Box sx={{ flex: '1 1 150px', minWidth: '150px' }}>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleSearch}
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                            >
                                Search
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Results */}
            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Results Summary */}
                    {events.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="h6">
                                Found {pagination.totalElements} events
                            </Typography>
                        </Box>
                    )}

                    {/* Events Grid */}
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {events.map((event) => (
                            <Box sx={{ flex: '1 1 300px', minWidth: '280px' }} key={event.externalId}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    {/* Event Image */}
                                    {event.images && event.images.length > 0 && (
                                        <Box
                                            sx={{
                                                height: 200,
                                                backgroundImage: `url(${event.images[0].url})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                position: 'relative'
                                            }}
                                        />
                                    )}

                                    <CardContent sx={{ flexGrow: 1 }}>
                                        {/* Event Name */}
                                        <Typography variant="h6" gutterBottom>
                                            {event.name}
                                        </Typography>

                                        {/* Artist */}
                                        {event.artist && (
                                            <Typography variant="subtitle1" color="primary" gutterBottom>
                                                {event.artist}
                                            </Typography>
                                        )}

                                        {/* Event Type */}
                                        {(event.eventType || event.eventSubtype) && (
                                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                                {event.eventType && (
                                                    <Chip 
                                                        label={event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)} 
                                                        size="small" 
                                                        color="primary" 
                                                        variant="outlined"
                                                    />
                                                )}
                                                {event.eventSubtype && (
                                                    <Chip 
                                                        label={event.eventSubtype.charAt(0).toUpperCase() + event.eventSubtype.slice(1)} 
                                                        size="small" 
                                                        color="secondary" 
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>
                                        )}

                                        {/* Venue and Location */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <LocationIcon sx={{ mr: 1, fontSize: 'small' }} />
                                            <Typography variant="body2">
                                                {event.venueName}
                                                {event.venueCity && `, ${event.venueCity}`}
                                                {event.venueState && `, ${event.venueState}`}
                                            </Typography>
                                        </Box>

                                        {/* Date */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <CalendarIcon sx={{ mr: 1, fontSize: 'small' }} />
                                            <Typography variant="body2">
                                                {formatDate(event.eventDate)}
                                            </Typography>
                                        </Box>

                                        {/* Price */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <PriceIcon sx={{ mr: 1, fontSize: 'small' }} />
                                            <Typography variant="body2">
                                                {formatPrice(event.minPrice, event.maxPrice, event.currency)}
                                            </Typography>
                                        </Box>

                                        {/* Status */}
                                        {event.status && (
                                            <Chip
                                                label={event.status.toUpperCase()}
                                                size="small"
                                                color={event.status === 'onsale' ? 'success' : 'default'}
                                                sx={{ mb: 2 }}
                                            />
                                        )}
                                    </CardContent>

                                    <CardActions>
                                        {onEventSelect && (
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="primary"
                                                onClick={() => onEventSelect(event)}
                                                sx={{ mr: 1 }}
                                            >
                                                Book Trip
                                            </Button>
                                        )}
                                        <Button
                                            size="small"
                                            href={event.ticketUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Get Tickets
                                        </Button>
                                        <Tooltip title="Add to favorites">
                                            <IconButton
                                                size="small"
                                                onClick={() => toggleFavorite(event.externalId)}
                                                color={favorites.has(event.externalId) ? 'primary' : 'default'}
                                            >
                                                {favorites.has(event.externalId) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Share event">
                                            <IconButton
                                                size="small"
                                                onClick={() => shareEvent(event)}
                                            >
                                                <ShareIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </CardActions>
                                </Card>
                            </Box>
                        ))}
                    </Box>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <Box display="flex" justifyContent="center" mt={4}>
                            <Pagination
                                count={pagination.totalPages}
                                page={pagination.currentPage + 1}
                                onChange={handlePageChange}
                                color="primary"
                            />
                        </Box>
                    )}

                    {/* No Results */}
                    {events.length === 0 && !loading && (
                        <Box textAlign="center" py={4}>
                            <Typography variant="h6" color="textSecondary">
                                No events found
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Try adjusting your search criteria
                            </Typography>
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
};

export default EventSearch; 