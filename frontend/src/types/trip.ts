// Enhanced Trip Data Types

export interface TripSuggestion {
  id: string;
  user_id: string;
  event_id: string;
  total_cost: number;
  service_fee: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  
  // Enhanced data
  event?: Event;
  components?: TripComponent[];
  metadataInsights?: MetadataInsights;
  artistRecommendations?: ArtistRecommendation[];
  genreInsights?: GenreInsights;
  socialInsights?: SocialInsights;
}

export interface TripComponent {
  id: string;
  trip_suggestion_id: string;
  component_type: 'flight' | 'hotel' | 'car' | 'ticket';
  provider: string;
  price: number;
  details: string; // JSON string containing detailed component data
  booking_reference?: string;
  created_at: string;
  updated_at: string;
  
  // Enhanced fields
  provider_id?: string;
  external_reference?: string;
  last_updated?: string;
  data_source?: string;
  data_freshness?: string;
}

export interface Event {
  id: string;
  external_id?: string;
  name: string;
  artist: string;
  venue_name: string;
  venue_city: string;
  venue_state: string;
  event_date: string;
  ticket_url?: string;
  min_price?: number;
  max_price?: number;
  created_at: string;
  updated_at: string;
  
  // Enhanced fields
  event_time?: string;
  doors_open?: string;
  venue_capacity?: number;
  venue_seating_chart?: string;
  accessibility_features?: any;
  parking_info?: any;
  public_transport?: any;
  venue_photos?: any;
  event_duration?: string;
  age_restrictions?: string;
  dress_code?: string;
  prohibited_items?: string[];
  covid_policies?: any;
  venue_website?: string;
  venue_phone?: string;
  venue_email?: string;
}

// Enhanced Component Details
export interface FlightDetails {
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  departure_airport: string;
  arrival_airport: string;
  aircraft: string;
  seat_class: string;
  seat?: string;
  duration: number;
  stops: number;
  baggage: string;
  amenities?: string[];
  price?: {
    total: string;
    currency: string;
    base: string;
    fees: Array<{
      amount: string;
      type: string;
    }>;
  };
  itineraries?: any[];
  numberOfBookableSeats?: number;
  cabinClass?: string;
  fareType?: string[];
  baggage_details?: {
    checked: number;
    carry_on: number;
    personal_item: number;
    weight_limit: string;
    oversized_fees: string;
  };
  amenities_details?: {
    wifi: boolean;
    power_outlets: boolean;
    entertainment: string;
    meals: string;
    alcohol: boolean;
  };
  cancellation?: {
    refundable: boolean;
    change_fee: string;
    cancellation_fee: string;
  };
  dataSource?: string;
  lastUpdated?: string;
}

export interface HotelDetails {
  name: string;
  check_in: string;
  check_out: string;
  room_type: string;
  distance: string;
  amenities: string[];
  rating: string;
  cancellation_policy: string;
  breakfast: string;
  price?: number;
  provider?: string;
  photos?: string[];
  room_configuration?: {
    beds: string;
    occupancy: number;
    square_feet?: number;
  };
  location?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}

export interface CarDetails {
  car_type: string;
  car_model: string;
  pickup_date: string;
  return_date: string;
  pickup_location: string;
  unlimited_miles: boolean;
  insurance: string;
  fuel_policy: string;
  transmission: string;
  passengers: number;
  price?: number;
  provider?: string;
  photos?: string[];
  features?: string[];
}

export interface TicketDetails {
  section: string;
  row: string;
  seat: number;
  ticket_type: string;
  delivery: string;
  refund_policy: string;
  transfer_policy: string;
  price?: string;
  provider?: string;
  includes?: string[];
  view_description?: string;
  distance_from_stage?: string;
  angle?: string;
  obstructed?: boolean;
}

// Metadata Insights
export interface MetadataInsights {
  popularity?: string;
  genres?: string[];
  followers?: number;
  monthly_listeners?: number;
  social_media?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  biography?: string;
  awards?: any[];
  collaborations?: any[];
  latest_release?: any;
}

export interface ArtistRecommendation {
  artist: string;
  type: 'collaboration' | 'genre' | 'similar';
  match: number;
  metadata?: MetadataInsights;
  reason: string;
}

export interface GenreInsights {
  primary_genre: string;
  genre_diversity: number;
  related_genres: string[];
  genre_popularity: number;
}

export interface SocialInsights {
  social_score: number;
  engagement_rate: number;
  trending: boolean;
  social_platforms: string[];
}

// Real-time Data
export interface AvailabilityStatus {
  status: 'available' | 'limited' | 'low' | 'sold_out';
  quantity?: number;
  last_checked: string;
}

export interface PriceHistory {
  date: string;
  price: number;
  currency: string;
  source: string;
}

// Booking and Payment
export interface Booking {
  id: string;
  trip_suggestion_id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  booking_date: string;
  travel_date: string;
  created_at: string;
  updated_at: string;
  
  // Enhanced booking details
  components: BookingComponent[];
  payment_method?: string;
  confirmation_number?: string;
  itinerary_url?: string;
}

export interface BookingComponent {
  id: string;
  booking_id: string;
  component_type: 'flight' | 'hotel' | 'car' | 'ticket';
  provider: string;
  provider_booking_id: string;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  details: any;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface TripSuggestionsResponse {
  success: boolean;
  data: TripSuggestion[];
  total: number;
  page: number;
  limit: number;
}

export interface TripSuggestionResponse {
  success: boolean;
  data: TripSuggestion;
}

export interface ComponentDetailsResponse {
  success: boolean;
  data: {
    component: TripComponent;
    details: FlightDetails | HotelDetails | CarDetails | TicketDetails;
    availability: AvailabilityStatus;
    priceHistory: PriceHistory[];
  };
}

// Real-time Updates
export interface RealTimeUpdate {
  type: 'price_change' | 'availability_update' | 'booking_status';
  componentId: string;
  data: any;
  timestamp: string;
}

// Utility Types
export type ComponentType = 'flight' | 'hotel' | 'car' | 'ticket';

export interface DateRange {
  start: string;
  end: string;
}

// Formatter Functions - Import from utils instead
// These are now available in src/utils/formatters.ts 

// CamelCase types for API responses
export interface TripComponentCamel {
  id: string;
  tripSuggestionId: string;
  componentType: 'flight' | 'hotel' | 'car' | 'ticket';
  provider: string;
  price: number | string;
  details: any;
  bookingReference?: string;
  createdAt: string;
  updatedAt: string;
  // Enhanced fields
  providerId?: string;
  externalReference?: string;
  lastUpdated?: string;
  dataSource?: string;
  dataFreshness?: string;
  options?: any[]; // UI: available options for this component
}

// Update TripSuggestionCamel to match API response
export interface TripSuggestionCamel {
  id: number;
  userId: number;
  eventId: number;
  status: string;
  totalCost: number;
  serviceFee: number;
  createdAt: string | {};
  updatedAt: string | {};
  bookingId?: string | null;
  bookingStatus?: string;
  bookingDetails?: any;
  bookingCreatedAt?: string | null;
  bookingUpdatedAt?: string | {};
  eventName: string;
  artist: string;
  venueName: string;
  venueCity: string;
  venueState: string;
  eventDate: string | {};
  ticketUrl: string;
  components?: TripComponentCamel[];
  artistMetadata?: any;
  metadataInsights?: any;
  artistRecommendations?: any[];
  genreInsights?: any;
  socialInsights?: any;
  hidden?: boolean; // UI state for hiding cards
} 

// Airport type for airport search API
export interface Airport {
  id: number;
  city: string;
  code: string; // IATA code
  name: string;
  country: string;
  state?: string;
  latitude: number;
  longitude: number;
  searchProvider: string; // 'local' or provider name
} 