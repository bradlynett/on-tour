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
  Grid,
  Tabs,
  Tab,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';

import api from '../config/api';

interface BookingComponent {
  component_type: string;
  provider: string;
  price: number;
  details: any;
  booking_reference: string;
  status: string;
}

interface Booking {
  id: number;
  event_name: string;
  artist: string;
  venue_city: string;
  event_date: string;
  status: string;
  total_cost: number;
  service_fee: number;
  grand_total: number;
  created_at: string;
  components: BookingComponent[];
}

interface BookingManagementProps {
  onViewBooking: (bookingId: number) => void;
  onEditBooking: (bookingId: number) => void;
}

const BookingManagement: React.FC<BookingManagementProps> = ({
  onViewBooking,
  onEditBooking
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'|'info'}>({open: false, message: '', severity: 'success'});
  
  // Filtering and pagination
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  
  // View states
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, currentPage]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await api.get(`/booking?${params}`);
      
      if (response.data.success) {
        setBookings(response.data.data);
        setTotalPages(response.data.pagination.pages);
        setTotalBookings(response.data.pagination.total);
      } else {
        setError('Failed to load bookings');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (event: any) => {
    setStatusFilter(event.target.value as string);
    setCurrentPage(1);
  };

  const handleSearch = () => {
    // Implement search functionality
    fetchBookings();
  };

  const handleRefresh = () => {
    fetchBookings();
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setViewDialogOpen(true);
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      const response = await api.patch(`/booking/${bookingId}/cancel`);
      
      if (response.data.success) {
        setSnackbar({open: true, message: 'Booking cancelled successfully', severity: 'success'});
        fetchBookings(); // Refresh the list
      } else {
        throw new Error(response.data.message || 'Failed to cancel booking');
      }
    } catch (err: any) {
      setSnackbar({open: true, message: err.response?.data?.message || 'Failed to cancel booking', severity: 'error'});
    }
  };

  const handleDownloadInvoice = async (bookingId: number) => {
    try {
      const response = await api.get(`/booking/${bookingId}/invoice`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `booking-${bookingId}-invoice.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSnackbar({open: true, message: 'Invoice downloaded successfully', severity: 'success'});
    } catch (err: any) {
      setSnackbar({open: true, message: 'Failed to download invoice', severity: 'error'});
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      case 'planning': return 'Planning';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredBookings = bookings.filter(booking => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        booking.event_name.toLowerCase().includes(searchLower) ||
        booking.artist.toLowerCase().includes(searchLower) ||
        booking.venue_city.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading && bookings.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: 'white' }}>
        My Bookings
      </Typography>

      {/* Filters and Search */}
      <Card sx={{ mb: 3, backgroundColor: 'rgba(24,24,24,0.85)', color: 'white', border: '1.5px solid rgba(255,255,255,0.18)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', color: 'white' }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <TextField
                fullWidth
                label="Search bookings"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSearch} sx={{ color: 'white' }}>
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
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
            
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'white' }}>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={handleStatusChange}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { backgroundColor: 'rgba(24,24,24,0.95)', color: 'white' }
                    }
                  }}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="planning">Planning</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: '0 1 120px' }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={handleSearch}
                sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.08)' } }}
              >
                Filter
              </Button>
            </Box>
            
            <Box sx={{ flex: '0 1 120px' }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.08)' } }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <>
          {filteredBookings.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="h6" textAlign="center" color="text.secondary">
                  No bookings found
                </Typography>
                <Typography variant="body2" textAlign="center" color="text.secondary">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Start by booking your first trip!'
                  }
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <>
              <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(24,24,24,0.85)', color: 'white' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'white' }}>Event</TableCell>
                      <TableCell sx={{ color: 'white' }}>Date</TableCell>
                      <TableCell sx={{ color: 'white' }}>Status</TableCell>
                      <TableCell sx={{ color: 'white' }}>Total Cost</TableCell>
                      <TableCell sx={{ color: 'white' }}>Created</TableCell>
                      <TableCell sx={{ color: 'white' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell sx={{ color: 'white' }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {booking.event_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {booking.artist} • {booking.venue_city}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {formatDate(booking.event_date)}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Chip
                            label={getStatusLabel(booking.status)}
                            color={getStatusColor(booking.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(booking.grand_total)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            +{formatCurrency(booking.service_fee)} fee
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {formatDateTime(booking.created_at)}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Box display="flex" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleViewBooking(booking)}
                              title="View Details"
                            >
                              <ViewIcon />
                            </IconButton>
                            
                            {booking.status === 'planning' && (
                              <IconButton
                                size="small"
                                onClick={() => onEditBooking(booking.id)}
                                title="Edit Booking"
                              >
                                <EditIcon />
                              </IconButton>
                            )}
                            
                            {['planning', 'pending'].includes(booking.status) && (
                              <IconButton
                                size="small"
                                onClick={() => handleCancelBooking(booking.id)}
                                title="Cancel Booking"
                                color="error"
                              >
                                <CancelIcon />
                              </IconButton>
                            )}
                            
                            {booking.status === 'confirmed' && (
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadInvoice(booking.id)}
                                title="Download Invoice"
                              >
                                <DownloadIcon />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(event, page) => setCurrentPage(page)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </>
      )}

      {/* Booking Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { backgroundColor: 'rgba(24,24,24,0.95)', color: 'white' } }}
      >
        {selectedBooking && (
          <>
            <DialogTitle>
              <Typography variant="h6">
                Booking Details
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                {selectedBooking.event_name} • {selectedBooking.artist}
              </Typography>
            </DialogTitle>
            
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                    <Typography variant="h6" gutterBottom>
                      Event Information
                    </Typography>
                    <Box>
                      <Typography variant="body2">
                        <strong>Event:</strong> {selectedBooking.event_name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Artist:</strong> {selectedBooking.artist}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Venue:</strong> {selectedBooking.venue_city}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Date:</strong> {formatDate(selectedBooking.event_date)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                    <Typography variant="h6" gutterBottom>
                      Booking Information
                    </Typography>
                    <Box>
                      <Typography variant="body2">
                        <strong>Status:</strong> 
                        <Chip
                          label={getStatusLabel(selectedBooking.status)}
                          color={getStatusColor(selectedBooking.status) as any}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                      <Typography variant="body2">
                        <strong>Booking ID:</strong> #{selectedBooking.id}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Created:</strong> {formatDateTime(selectedBooking.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Trip Components
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Component</TableCell>
                          <TableCell>Provider</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Price</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedBooking.components.map((component, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {component.component_type.charAt(0).toUpperCase() + component.component_type.slice(1)}
                              </Typography>
                            </TableCell>
                            <TableCell>{component.provider}</TableCell>
                            <TableCell>
                              <Chip
                                label={component.status}
                                color={component.status === 'confirmed' ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{formatCurrency(component.price)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
                
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                      Total Cost
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(selectedBooking.grand_total)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Includes {formatCurrency(selectedBooking.service_fee)} service fee
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
              {selectedBooking.status === 'confirmed' && (
                <Button
                  variant="contained"
                  startIcon={<PaymentIcon />}
                  onClick={() => handleDownloadInvoice(selectedBooking.id)}
                  sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.08)' } }}
                >
                  Download Invoice
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

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
  );
};

export default BookingManagement; 