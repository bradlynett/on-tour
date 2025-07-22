import api from '../config/api';

// Interfaces matching our backend
export interface BookingOption {
  id: string;
  provider: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  features: string[];
  availability: 'available' | 'limited' | 'low';
  bookingUrl?: string;
  estimatedTime?: string;
  cancellationPolicy?: string;
  highlights?: string[];
  details?: any;
  isPreferred?: boolean;
}

export interface BookingSelection {
  componentType: string;
  selectedOption: BookingOption;
  customizations?: any;
}

export interface BookingRequest {
  tripId: number;
  selections: BookingSelection[];
  travelers?: any[];
  hotelRooms?: number;
  components?: {
    tickets: number;
    flights: number;
    hotel: number;
    car: number;
  };
}

export interface BookingResponse {
  success: boolean;
  message: string;
  data: {
    bookingId: string;
    status: string;
    estimatedCompletion: string;
    components: number;
    totalCost: number;
  };
}

export interface BookingStatus {
  bookingId: string;
  status: string;
  totalCost: number;
  components: any[];
  failed: any[];
  createdAt: string;
  updatedAt: string;
}

export interface UserBooking {
  id: number;
  booking_id: string;
  booking_status: string;
  total_cost: number;
  created_at: string;
  component_count: number;
  confirmed_components: number;
}

export interface BookingAnalytics {
  total_bookings: number;
  successful_bookings: number;
  failed_bookings: number;
  partial_bookings: number;
  avg_components_per_booking: number;
}

class BookingService {
  /**
   * Create a new booking for a trip suggestion
   */
  async createBooking(tripSuggestionId: number, bookingData: BookingRequest | BookingSelection[]): Promise<BookingResponse> {
    let requestData: BookingRequest;
    
    if (Array.isArray(bookingData)) {
      // Backward compatibility - just selections array
      requestData = {
        tripId: tripSuggestionId,
        selections: bookingData
      };
    } else {
      // New format with travelers and component counts
      requestData = {
        tripId: tripSuggestionId,
        selections: bookingData.selections,
        travelers: bookingData.travelers,
        hotelRooms: bookingData.hotelRooms,
        components: bookingData.components
      };
    }
    
    const response = await api.post(`/booking/trip-suggestion/${tripSuggestionId}`, requestData);
    return response.data;
  }

  /**
   * Get booking status and details
   */
  async getBookingStatus(bookingId: string): Promise<BookingStatus> {
    const response = await api.get(`/booking/status/${bookingId}`);
    return response.data.data;
  }

  /**
   * Get user's booking history
   */
  async getUserBookings(limit: number = 10, offset: number = 0): Promise<UserBooking[]> {
    const response = await api.get('/booking/history', {
      params: { limit, offset }
    });
    return response.data.data.bookings;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<{ bookingId: string; status: string }> {
    const response = await api.post(`/booking/${bookingId}/cancel`);
    return response.data.data;
  }

  /**
   * Get booking analytics for user
   */
  async getBookingAnalytics(): Promise<BookingAnalytics> {
    const response = await api.get('/booking/analytics');
    return response.data.data;
  }

  /**
   * Poll booking status until complete
   */
  async pollBookingStatus(bookingId: string, maxAttempts: number = 30): Promise<BookingStatus> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const status = await this.getBookingStatus(bookingId);
        
        // If booking is complete (confirmed, failed, or partial), return
        if (['confirmed', 'failed', 'partial', 'cancelled'].includes(status.status)) {
          return status;
        }
        
        // Wait 2 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.error('Error polling booking status:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Booking status polling timed out');
  }
}

export default new BookingService(); 