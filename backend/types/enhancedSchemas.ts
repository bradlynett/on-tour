// Enhanced data schemas for rich travel information

export interface EnhancedFlightDetails {
  flightNumber: string;
  aircraft: {
    type: string;
    registration?: string;
    manufacturer: string;
    capacity: number;
    seatMap?: string;
  };
  departure: {
    airport: string;
    terminal?: string;
    gate?: string;
    time: string;
    timezone: string;
  };
  arrival: {
    airport: string;
    terminal?: string;
    gate?: string;
    time: string;
    timezone: string;
  };
  seats: {
    assigned?: string;
    class: string;
    row?: number;
    seat?: string;
    window?: boolean;
    aisle?: boolean;
    exit_row?: boolean;
    premium?: boolean;
  };
  baggage: {
    checked: number;
    carry_on: number;
    personal_item: number;
    weight_limit?: string;
    oversized_fees?: string;
  };
  amenities: {
    wifi?: boolean;
    power_outlets?: boolean;
    entertainment?: string;
    meals?: string;
    alcohol?: boolean;
  };
  cancellation: {
    refundable: boolean;
    change_fee?: string;
    cancellation_fee?: string;
  };
  duration?: string;
  stops?: number;
  airline_code?: string;
  operating_carrier?: string;
}

export interface EnhancedHotelDetails {
  hotelName: string;
  chain?: string;
  brand?: string;
  rating?: number;
  stars?: number;
  location: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    latitude?: number;
    longitude?: number;
    timezone: string;
  };
  room: {
    type: string;
    category?: string;
    size?: string;
    floor?: string;
    roomNumber?: string;
    view?: string;
    bedding: {
      primary: string;
      capacity: number;
      maxOccupancy: number;
      extraBeds?: boolean;
      cribAvailable?: boolean;
    };
    bathroom?: {
      type: string;
      shower?: boolean;
      bathtub?: boolean;
      amenities?: string[];
    };
  };
  amenities: {
    room?: string[];
    hotel?: string[];
    accessibility?: string[];
  };
  policies: {
    checkIn: string;
    checkOut: string;
    earlyCheckIn?: string;
    lateCheckOut?: string;
    cancellation: string;
    pets?: string;
    smoking?: string;
  };
  photos?: Array<{
    url: string;
    caption?: string;
    category?: string;
  }>;
  distance_to_venue?: string;
  transportation_options?: string[];
}

export interface EnhancedTicketDetails {
  ticketType: string;
  section: string;
  row: string;
  seat: string;
  price: {
    faceValue: number;
    serviceFees: number;
    total: number;
    currency: string;
  };
  location: {
    venue: string;
    section: string;
    row: string;
    seat: string;
    view?: string;
    distance?: string;
    angle?: string;
    obstructed?: boolean;
  };
  package?: {
    includes?: string[];
    exclusions?: string[];
  };
  delivery: {
    method: string;
    available?: string;
    instructions?: string;
  };
  restrictions: {
    transferable?: boolean;
    transferDeadline?: string;
    refundable: boolean;
    ageRestriction?: string;
    photoId?: string;
  };
  event_info?: {
    artist?: string;
    event_name?: string;
    event_date?: string;
    event_time?: string;
    venue_name?: string;
  };
}

export interface EnhancedCarDetails {
  carModel: string;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  luggageCapacity: string;
  pickupLocation: {
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    hours?: string;
  };
  returnLocation: {
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    hours?: string;
  };
  pickupDate: string;
  returnDate: string;
  mileage: {
    included: number;
    overage_rate?: string;
  };
  insurance: {
    included: boolean;
    options?: string[];
    cost?: string;
  };
  features: string[];
  photos?: Array<{
    url: string;
    caption?: string;
  }>;
  cancellation: {
    refundable: boolean;
    change_fee?: string;
    cancellation_fee?: string;
  };
}

// Utility types for data validation
export type ComponentType = 'flight' | 'hotel' | 'car' | 'ticket';

export interface EnhancedComponentDetails {
  flight?: EnhancedFlightDetails;
  hotel?: EnhancedHotelDetails;
  car?: EnhancedCarDetails;
  ticket?: EnhancedTicketDetails;
}

// Data source tracking
export interface DataSourceInfo {
  source: string;
  last_updated: Date;
  data_freshness: Date;
  provider_id?: string;
  external_reference?: string;
  confidence_score?: number; // 0-1, how confident we are in the data
}

// Price tracking
export interface PriceHistory {
  timestamp: Date;
  price: number;
  currency: string;
  availability: 'available' | 'limited' | 'low' | 'unavailable';
  source: string;
}

// Availability tracking
export interface AvailabilityInfo {
  available: boolean;
  quantity?: number;
  last_checked: Date;
  next_check?: Date;
  waitlist_available?: boolean;
  waitlist_position?: number;
} 