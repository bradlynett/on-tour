// Database Schema TypeScript Interfaces
// These interfaces match the PostgreSQL schema exactly
// Use these for type safety in database operations

export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserAddress {
  id: number;
  user_id: number;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_primary: boolean;
}

export interface PaymentMethod {
  id: number;
  user_id: number;
  card_type: string;
  last_four: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
  encrypted_data: string;
}

export interface TravelPreferences {
  id: number;
  user_id: number;
  primary_airport?: string;
  preferred_airlines?: string[];
  flight_class: string;
  preferred_hotel_brands?: string[];
  rental_car_preference?: string;
  reward_programs?: string[];
}

export interface UserInterest {
  id: number;
  user_id: number;
  interest_type: 'artist' | 'genre' | 'venue' | 'city';
  interest_value: string;
  priority: number;
}

export interface Event {
  id: number;
  external_id?: string;
  name: string;
  artist?: string;
  venue_name?: string;
  venue_city?: string;
  venue_state?: string;
  event_date: Date;
  event_time?: string; // TIME format
  doors_open?: string; // TIME format
  ticket_url?: string;
  min_price?: number;
  max_price?: number;
  venue_capacity?: number;
  venue_seating_chart?: string;
  accessibility_features?: any; // JSONB
  parking_info?: any; // JSONB
  public_transport?: any; // JSONB
  venue_photos?: any; // JSONB
  event_duration?: string; // INTERVAL format
  age_restrictions?: string;
  dress_code?: string;
  prohibited_items?: string[];
  covid_policies?: any; // JSONB
  venue_website?: string;
  venue_phone?: string;
  venue_email?: string;
  seatgeek_event_id?: string;
  ticketmaster_event_id?: string;
  created_at: Date;
}

export interface TripSuggestion {
  id: number;
  user_id: number;
  event_id: number;
  status: 'pending' | 'approved' | 'rejected' | 'booked';
  total_cost?: number;
  service_fee?: number;
  created_at: Date;
}

export interface TripComponent {
  id: number;
  trip_suggestion_id: number;
  component_type: 'flight' | 'hotel' | 'car' | 'ticket';
  provider?: string;
  provider_id?: string; // External provider's unique identifier
  price?: number;
  details?: any; // JSONB - Enhanced with detailed schemas
  booking_reference?: string;
  external_reference?: string; // External booking reference number
  last_updated?: Date;
  data_source?: string; // Source of the component data
  data_freshness?: Date; // When data was last refreshed from source
}

export interface Booking {
  id: number;
  user_id: number;
  event_id: number;
  status: 'planning' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_cost: number;
  service_fee: number;
  grand_total: number;
  preferences?: any; // JSONB
  created_at: Date;
  updated_at: Date;
}

export interface BookingComponent {
  id: number;
  booking_id: number;
  component_type: 'flight' | 'hotel' | 'car' | 'ticket';
  provider: string;
  price: number;
  details?: any; // JSONB
  booking_reference?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface GroupTrip {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  event_id?: number;
  start_date: Date;
  end_date: Date;
  max_participants: number;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  privacy: 'private' | 'friends' | 'public';
  created_at: Date;
  updated_at: Date;
}

export interface GroupMember {
  id: number;
  group_trip_id: number;
  user_id: number;
  role: 'creator' | 'admin' | 'member';
  status: 'invited' | 'accepted' | 'declined' | 'left';
  joined_at: Date;
}

export interface UserConnection {
  id: number;
  user_id: number;
  connected_user_id: number;
  connection_type: 'friend' | 'follower';
  status: 'pending' | 'accepted' | 'blocked';
  created_at: Date;
  updated_at: Date;
}

export interface GroupTripComponent {
  id: number;
  group_trip_id: number;
  component_type: 'flight' | 'hotel' | 'car' | 'activity' | 'transportation' | 'ticket';
  provider: string;
  provider_id?: string;
  details: any; // JSONB
  price_per_person: number;
  currency: string;
  max_participants?: number;
  booking_deadline?: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: Date;
  updated_at: Date;
}

export interface GroupTripBooking {
  id: number;
  group_trip_id: number;
  user_id: number;
  component_id: number;
  booking_reference: string;
  amount: number;
  service_fee: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: Date;
  updated_at: Date;
}

export interface GroupTripMessage {
  id: number;
  group_trip_id: number;
  user_id: number;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  created_at: Date;
}

export interface SpotifyToken {
  id: number;
  user_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

// Common query result types
export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Input types for creating/updating records
export interface CreateUserInput {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface CreateBookingInput {
  user_id: number;
  event_id: number;
  total_cost: number;
  service_fee: number;
  grand_total: number;
  preferences?: any;
}

export interface CreateBookingComponentInput {
  booking_id: number;
  component_type: 'flight' | 'hotel' | 'car' | 'ticket';
  provider: string;
  price: number;
  details?: any;
  booking_reference?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'failed';
}

// Utility types
export type BookingStatus = Booking['status'];
export type ComponentType = BookingComponent['component_type'];
export type ComponentStatus = BookingComponent['status'];
export type InterestType = UserInterest['interest_type'];

// Database constraint enums
export const BOOKING_STATUSES = ['planning', 'pending', 'confirmed', 'cancelled', 'completed'] as const;
export const COMPONENT_TYPES = ['flight', 'hotel', 'car', 'ticket'] as const;
export const COMPONENT_STATUSES = ['pending', 'confirmed', 'cancelled', 'failed'] as const;
export const INTEREST_TYPES = ['artist', 'genre', 'venue', 'city'] as const;

// Validation functions
export function isValidBookingStatus(status: string): status is BookingStatus {
  return BOOKING_STATUSES.includes(status as BookingStatus);
}

export function isValidComponentType(type: string): type is ComponentType {
  return COMPONENT_TYPES.includes(type as ComponentType);
}

export function isValidComponentStatus(status: string): status is ComponentStatus {
  return COMPONENT_STATUSES.includes(status as ComponentStatus);
}

export function isValidInterestType(type: string): type is InterestType {
  return INTEREST_TYPES.includes(type as InterestType);
}

// Database helper functions
export function validateDecimal(value: any): number {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    throw new Error(`Invalid decimal value: ${value}`);
  }
  return parseFloat(value.toFixed(2));
}

export function validateRequiredString(value: any, fieldName: string): string {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required and must be a non-empty string`);
  }
  return value.trim();
}

export function validateOptionalString(value: any): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error('Value must be a string');
  }
  return value.trim() || undefined;
}

export function validateDate(value: any): Date {
  if (!value) {
    throw new Error('Date is required');
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }
  return date;
}

export function validateOptionalDate(value: any): Date | undefined {
  if (!value) {
    return undefined;
  }
  return validateDate(value);
}

// Type guards for runtime validation
export function isUser(obj: any): obj is User {
  return obj && 
    typeof obj.id === 'number' &&
    typeof obj.email === 'string' &&
    typeof obj.first_name === 'string' &&
    typeof obj.last_name === 'string';
}

export function isBooking(obj: any): obj is Booking {
  return obj &&
    typeof obj.id === 'number' &&
    typeof obj.user_id === 'number' &&
    typeof obj.event_id === 'number' &&
    isValidBookingStatus(obj.status) &&
    typeof obj.total_cost === 'number' &&
    typeof obj.service_fee === 'number' &&
    typeof obj.grand_total === 'number';
}

export function isBookingComponent(obj: any): obj is BookingComponent {
  return obj &&
    typeof obj.id === 'number' &&
    typeof obj.booking_id === 'number' &&
    isValidComponentType(obj.component_type) &&
    typeof obj.provider === 'string' &&
    typeof obj.price === 'number' &&
    isValidComponentStatus(obj.status);
} 