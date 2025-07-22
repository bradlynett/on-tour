import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import api from '../services/api';

type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

// Updated interfaces to match backend API structure
interface TripComponent {
  component_type: string;
  provider: string;
  price: number;
  details: any;
  booking_reference?: string;
}

interface TripSuggestion {
  id: string;
  event_name: string;
  artist: string;
  venue_name: string;
  venue_city: string;
  venue_state: string;
  event_date: string;
  ticket_url?: string;
  total_cost: number;
  service_fee: number;
  status: string;
  created_at: string;
  components: TripComponent[];
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  createdAt: string;
  travelPreferences?: {
    primaryAirport?: string;
    preferredAirlines?: string[];
    flightClass?: string;
    preferredHotelBrands?: string[];
    rentalCarPreference?: string;
    rewardPrograms?: string[];
    rewardProgramMemberships?: string[];
  };
}

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  const [tripSuggestions, setTripSuggestions] = useState<TripSuggestion[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupedTrips, setGroupedTrips] = useState<Record<string, TripSuggestion[]>>({});

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      const profileResponse = await api.get('/users/profile');
      if (profileResponse.data.success) {
        setUserProfile(profileResponse.data.data.user);
      }

      // Load trip suggestions
      const tripsResponse = await api.get('/trips');
      if (tripsResponse.data.success) {
        const trips = tripsResponse.data.data.suggestions || [];
        setTripSuggestions(trips);

        // Group trips by artist
        const grouped = trips.reduce((acc: Record<string, TripSuggestion[]>, trip: TripSuggestion) => {
          const artist = trip.artist;
          if (!acc[artist]) {
            acc[artist] = [];
          }
          acc[artist].push(trip);
          return acc;
        }, {});

        setGroupedTrips(grouped);
      }
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        Alert.alert(
          'Authentication Error',
          'Please log in again.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
        return;
      }
      
      Alert.alert(
        'Error',
        'Failed to load dashboard data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number | undefined | null) => {
    if (typeof price !== 'number' || isNaN(price)) return '$0';
    return `$${price.toLocaleString()}`;
  };

  const handleTripPress = (trip: TripSuggestion) => {
    // Navigate to trip details (to be implemented)
    Alert.alert(
      'Trip Details',
      `${trip.event_name} by ${trip.artist}\n${trip.venue_name}, ${trip.venue_city}\n${formatDate(trip.event_date)}\nTotal: ${formatPrice(trip.total_cost)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Book Now', onPress: () => console.log('Book trip:', trip.id) }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => navigation.navigate('Landing') }
      ]
    );
  };

  const renderTripCard = (trip: TripSuggestion, isBestMatch: boolean = false) => (
    <TouchableOpacity
      key={trip.id}
      style={[styles.tripCard, isBestMatch && styles.bestMatchCard]}
      onPress={() => handleTripPress(trip)}
    >
      {isBestMatch && (
        <View style={styles.bestMatchBadge}>
          <Text style={styles.bestMatchText}>Best Match</Text>
        </View>
      )}
      
      <View style={styles.tripHeader}>
        <Text style={styles.eventName}>{trip.event_name}</Text>
        <Text style={styles.artistName}>{trip.artist}</Text>
      </View>

      <View style={styles.tripDetails}>
        <Text style={styles.venueText}>{trip.venue_name}</Text>
        <Text style={styles.cityText}>{trip.venue_city}, {trip.venue_state}</Text>
        <Text style={styles.dateText}>{formatDate(trip.event_date)}</Text>
      </View>

      <View style={styles.componentsSection}>
        <Text style={styles.componentsTitle}>Travel Components:</Text>
        
        {trip.components && trip.components.length > 0 && (
          <View>
            {trip.components.filter(comp => comp.component_type === 'flight').map((flight, index) => (
              <View key={index} style={styles.componentGroup}>
                <Text style={styles.componentLabel}>✈️ Flight:</Text>
                <Text style={styles.componentText}>
                  {flight.provider} • {formatPrice(flight.price)}
                </Text>
                {flight.details && (
                  <Text style={styles.componentDetails}>
                    {flight.details.departure} → {flight.details.arrival}
                  </Text>
                )}
              </View>
            ))}

            {trip.components.filter(comp => comp.component_type === 'hotel').map((hotel, index) => (
              <View key={index} style={styles.componentGroup}>
                <Text style={styles.componentLabel}>🏨 Hotel:</Text>
                <Text style={styles.componentText}>
                  {hotel.provider} • {formatPrice(hotel.price)}/night
                </Text>
                {hotel.details && (
                  <Text style={styles.componentDetails}>
                    {hotel.details.name} • ⭐ {hotel.details.rating || 'N/A'}
                  </Text>
                )}
              </View>
            ))}

            {trip.components.filter(comp => comp.component_type === 'car').map((car, index) => (
              <View key={index} style={styles.componentGroup}>
                <Text style={styles.componentLabel}>🚗 Car Rental:</Text>
                <Text style={styles.componentText}>
                  {car.provider} • {formatPrice(car.price)}/day
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.priceSection}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Service Fee:</Text>
          <Text style={styles.priceValue}>{formatPrice(trip.service_fee)}</Text>
        </View>
        <View style={[styles.priceRow, styles.totalPriceRow]}>
          <Text style={styles.totalPriceLabel}>Total:</Text>
          <Text style={styles.totalPriceValue}>{formatPrice(trip.total_cost)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.bookButton}>
        <Text style={styles.bookButtonText}>Book This Trip</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderArtistGroup = (artist: string, trips: TripSuggestion[]) => {
    const bestMatch = (trips || [])[0]; // First trip is the best match
    const otherTrips = (trips || []).slice(1);

    // Defensive: get min price for otherTrips
    let minOtherTripPrice = 0;
    if (otherTrips.length > 0) {
      const prices = otherTrips.map(t => typeof t.total_cost === 'number' ? t.total_cost : 0);
      minOtherTripPrice = Math.min(...prices);
    }

    return (
      <View key={artist} style={styles.artistGroup}>
        <View style={styles.artistHeader}>
          <Text style={styles.artistTitle}>{artist}</Text>
          <Text style={styles.tripCount}>{(trips || []).length} trip{(trips || []).length !== 1 ? 's' : ''} available</Text>
        </View>

        {/* Best match trip */}
        {renderTripCard(bestMatch, true)}

        {/* Other trips (collapsed by default) */}
        {otherTrips.length > 0 && (
          <View style={styles.otherTripsSection}>
            <Text style={styles.otherTripsTitle}>
              {otherTrips.length} more option{otherTrips.length !== 1 ? 's' : ''} from {formatPrice(minOtherTripPrice)}
            </Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllButtonText}>View All Options</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>Loading your personalized trips...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>
            Welcome back, {userProfile?.firstName || 'User'}! 🎵
          </Text>
          <Text style={styles.subtitleText}>
            Here are your personalized trip suggestions
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(groupedTrips || {}).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Trip Suggestions Yet</Text>
            <Text style={styles.emptyStateText}>
              We're working on finding the perfect trips for you based on your interests.
              Check back soon!
            </Text>
            <TouchableOpacity style={styles.refreshButton} onPress={loadDashboardData}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {Object.entries(groupedTrips || {}).map(([artist, trips]) =>
              renderArtistGroup(artist, trips)
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  artistGroup: {
    marginBottom: 24,
  },
  artistHeader: {
    marginBottom: 12,
  },
  artistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tripCount: {
    fontSize: 14,
    color: '#666',
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bestMatchCard: {
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  bestMatchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4caf50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestMatchText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tripHeader: {
    marginBottom: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
  },
  tripDetails: {
    marginBottom: 16,
  },
  venueText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  cityText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  componentsSection: {
    marginBottom: 16,
  },
  componentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  componentGroup: {
    marginBottom: 8,
  },
  componentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  componentText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    marginBottom: 2,
  },
  componentDetails: {
    fontSize: 12,
    color: '#999',
    marginLeft: 20,
    marginTop: 2,
  },
  priceSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalPriceRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  totalPriceLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  totalPriceValue: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  otherTripsSection: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  otherTripsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  viewAllButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  viewAllButtonText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DashboardScreen; 