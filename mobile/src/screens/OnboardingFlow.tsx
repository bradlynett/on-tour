import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import api from '../services/api';

type OnboardingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

interface OnboardingData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;

  // Interests
  favoriteArtists: string[];
  favoriteGenres: string[];
  musicDiscoveryStyle: 'spotify' | 'manual' | 'both';
  favoriteEventTypes: string[];

  // Travel Preferences
  primaryAirport: string;
  preferredAirlines: string[];
  flightClass: 'economy' | 'premium_economy' | 'business' | 'first';
  preferredHotelBrands: string[];
  preferredDestinations: string[];

  // Communication Preferences
  emailNotifications: boolean;
  pushNotifications: boolean;
  suggestedTrips: number;
}

const stepLabels = [
  'Your Information',
  'Interests',
  'Travel Preferences',
  'Communication Preferences',
  "Let's Go!"
];

// Popular options for selection
const popularGenres = [
  'Rock', 'Pop', 'Hip Hop', 'Country', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Folk', 'Metal'
];

const popularEventTypes = [
  'Concert', 'Festival', 'Arena Show', 'Club Show', 'Outdoor Concert', 'Theater Show'
];

const popularAirlines = [
  'Delta', 'American Airlines', 'United', 'Southwest', 'JetBlue', 'Alaska Airlines', 'Spirit', 'Frontier'
];

const popularHotelBrands = [
  'Marriott', 'Hilton', 'Hyatt', 'InterContinental', 'Best Western', 'Holiday Inn', 'Comfort Inn', 'Motel 6'
];

const popularDestinations = [
  'New York', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas', 'Nashville', 'Austin', 'Denver', 'Seattle', 'Boston'
];

const Step1PersonalInfo = ({ 
  data, 
  onDataChange, 
  onNext 
}: { 
  data: OnboardingData; 
  onDataChange: (field: keyof OnboardingData, value: any) => void; 
  onNext: () => void; 
}) => {
  const isValid = data.firstName && data.lastName && data.email;

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Your Information</Text>
        <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.textInput}
            value={data.firstName}
            onChangeText={(value) => onDataChange('firstName', value)}
            placeholder="Enter your first name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.textInput}
            value={data.lastName}
            onChangeText={(value) => onDataChange('lastName', value)}
            placeholder="Enter your last name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.textInput}
            value={data.email}
            onChangeText={(value) => onDataChange('email', value)}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.textInput}
            value={data.phone}
            onChangeText={(value) => onDataChange('phone', value)}
            placeholder="Enter your phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Street Address</Text>
          <TextInput
            style={styles.textInput}
            value={data.addressLine1}
            onChangeText={(value) => onDataChange('addressLine1', value)}
            placeholder="Enter your street address"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.textInput}
              value={data.city}
              onChangeText={(value) => onDataChange('city', value)}
              placeholder="City"
              placeholderTextColor="#999"
            />
          </View>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={styles.textInput}
              value={data.state}
              onChangeText={(value) => onDataChange('state', value)}
              placeholder="State"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>ZIP Code</Text>
          <TextInput
            style={styles.textInput}
            value={data.zipCode}
            onChangeText={(value) => onDataChange('zipCode', value)}
            placeholder="Enter ZIP code"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity 
          style={[styles.nextButton, !isValid && styles.disabledButton]} 
          onPress={onNext}
          disabled={!isValid}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const Step2Interests = ({ 
  data, 
  onDataChange, 
  onNext, 
  onBack 
}: { 
  data: OnboardingData; 
  onDataChange: (field: keyof OnboardingData, value: any) => void; 
  onNext: () => void; 
  onBack: () => void; 
}) => {
  const [artistInput, setArtistInput] = useState('');

  const addArtist = (artist: string) => {
    if (artist.trim() && !data.favoriteArtists.includes(artist.trim())) {
      onDataChange('favoriteArtists', [...data.favoriteArtists, artist.trim()]);
      setArtistInput('');
    }
  };

  const removeArtist = (artist: string) => {
    onDataChange('favoriteArtists', data.favoriteArtists.filter(a => a !== artist));
  };

  const toggleGenre = (genre: string) => {
    if (data.favoriteGenres.includes(genre)) {
      onDataChange('favoriteGenres', data.favoriteGenres.filter(g => g !== genre));
    } else {
      onDataChange('favoriteGenres', [...data.favoriteGenres, genre]);
    }
  };

  const toggleEventType = (eventType: string) => {
    if (data.favoriteEventTypes.includes(eventType)) {
      onDataChange('favoriteEventTypes', data.favoriteEventTypes.filter(e => e !== eventType));
    } else {
      onDataChange('favoriteEventTypes', [...data.favoriteEventTypes, eventType]);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Your Interests</Text>
        <Text style={styles.stepSubtitle}>Help us find the perfect events for you</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Favorite Artists</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Add an artist (press Enter)"
            placeholderTextColor="#999"
            value={artistInput}
            onChangeText={setArtistInput}
            onSubmitEditing={(e) => {
              addArtist(e.nativeEvent.text);
            }}
          />
          <View style={styles.chipContainer}>
            {(data.favoriteArtists || []).map((artist, index) => (
              <TouchableOpacity
                key={index}
                style={styles.chip}
                onPress={() => removeArtist(artist)}
              >
                <Text style={styles.chipText}>{artist} ×</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Favorite Genres</Text>
          <View style={styles.chipContainer}>
            {popularGenres.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={[
                  styles.chip,
                  (data.favoriteGenres || []).includes(genre) && styles.selectedChip
                ]}
                onPress={() => toggleGenre(genre)}
              >
                <Text style={[
                  styles.chipText,
                  (data.favoriteGenres || []).includes(genre) && styles.selectedChipText
                ]}>
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Event Types</Text>
          <View style={styles.chipContainer}>
            {popularEventTypes.map((eventType) => (
              <TouchableOpacity
                key={eventType}
                style={[
                  styles.chip,
                  (data.favoriteEventTypes || []).includes(eventType) && styles.selectedChip
                ]}
                onPress={() => toggleEventType(eventType)}
              >
                <Text style={[
                  styles.chipText,
                  (data.favoriteEventTypes || []).includes(eventType) && styles.selectedChipText
                ]}>
                  {eventType}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const Step3TravelPreferences = ({ 
  data, 
  onDataChange, 
  onNext, 
  onBack 
}: { 
  data: OnboardingData; 
  onDataChange: (field: keyof OnboardingData, value: any) => void; 
  onNext: () => void; 
  onBack: () => void; 
}) => {
  const toggleAirline = (airline: string) => {
    if (data.preferredAirlines.includes(airline)) {
      onDataChange('preferredAirlines', data.preferredAirlines.filter(a => a !== airline));
    } else {
      onDataChange('preferredAirlines', [...data.preferredAirlines, airline]);
    }
  };

  const toggleHotelBrand = (brand: string) => {
    if (data.preferredHotelBrands.includes(brand)) {
      onDataChange('preferredHotelBrands', data.preferredHotelBrands.filter(b => b !== brand));
    } else {
      onDataChange('preferredHotelBrands', [...data.preferredHotelBrands, brand]);
    }
  };

  const toggleDestination = (destination: string) => {
    if (data.preferredDestinations.includes(destination)) {
      onDataChange('preferredDestinations', data.preferredDestinations.filter(d => d !== destination));
    } else {
      onDataChange('preferredDestinations', [...data.preferredDestinations, destination]);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Travel Preferences</Text>
        <Text style={styles.stepSubtitle}>Customize your travel experience</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Primary Airport</Text>
          <TextInput
            style={styles.textInput}
            value={data.primaryAirport}
            onChangeText={(value) => onDataChange('primaryAirport', value)}
            placeholder="e.g., JFK, LAX, ORD"
            placeholderTextColor="#999"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Preferred Airlines</Text>
          <View style={styles.chipContainer}>
            {popularAirlines.map((airline) => (
              <TouchableOpacity
                key={airline}
                style={[
                  styles.chip,
                  (data.preferredAirlines || []).includes(airline) && styles.selectedChip
                ]}
                onPress={() => toggleAirline(airline)}
              >
                <Text style={[
                  styles.chipText,
                  (data.preferredAirlines || []).includes(airline) && styles.selectedChipText
                ]}>
                  {airline}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Flight Class</Text>
          <View style={styles.radioContainer}>
            {['economy', 'premium_economy', 'business', 'first'].map((flightClass) => (
              <TouchableOpacity
                key={flightClass}
                style={[
                  styles.radioOption,
                  data.flightClass === flightClass && styles.selectedRadio
                ]}
                onPress={() => onDataChange('flightClass', flightClass)}
              >
                <Text style={[
                  styles.radioText,
                  data.flightClass === flightClass && styles.selectedRadioText
                ]}>
                  {flightClass.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Preferred Hotel Brands</Text>
          <View style={styles.chipContainer}>
            {popularHotelBrands.map((brand) => (
              <TouchableOpacity
                key={brand}
                style={[
                  styles.chip,
                  (data.preferredHotelBrands || []).includes(brand) && styles.selectedChip
                ]}
                onPress={() => toggleHotelBrand(brand)}
              >
                <Text style={[
                  styles.chipText,
                  (data.preferredHotelBrands || []).includes(brand) && styles.selectedChipText
                ]}>
                  {brand}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Preferred Destinations</Text>
          <View style={styles.chipContainer}>
            {popularDestinations.map((destination) => (
              <TouchableOpacity
                key={destination}
                style={[
                  styles.chip,
                  (data.preferredDestinations || []).includes(destination) && styles.selectedChip
                ]}
                onPress={() => toggleDestination(destination)}
              >
                <Text style={[
                  styles.chipText,
                  (data.preferredDestinations || []).includes(destination) && styles.selectedChipText
                ]}>
                  {destination}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const Step4CommunicationPreferences = ({ 
  data, 
  onDataChange, 
  onNext, 
  onBack 
}: { 
  data: OnboardingData; 
  onDataChange: (field: keyof OnboardingData, value: any) => void; 
  onNext: () => void; 
  onBack: () => void; 
}) => {
  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Communication Preferences</Text>
        <Text style={styles.stepSubtitle}>How would you like to stay updated?</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Email Notifications</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              data.emailNotifications && styles.toggleButtonActive
            ]}
            onPress={() => onDataChange('emailNotifications', !data.emailNotifications)}
          >
            <Text style={[
              styles.toggleText,
              data.emailNotifications && styles.toggleTextActive
            ]}>
              {data.emailNotifications ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Push Notifications</Text>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              data.pushNotifications && styles.toggleButtonActive
            ]}
            onPress={() => onDataChange('pushNotifications', !data.pushNotifications)}
          >
            <Text style={[
              styles.toggleText,
              data.pushNotifications && styles.toggleTextActive
            ]}>
              {data.pushNotifications ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Suggested Trips per Week</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderValue}>{data.suggestedTrips}</Text>
            <View style={styles.sliderTrack}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.sliderDot,
                    data.suggestedTrips >= value && styles.sliderDotActive
                  ]}
                  onPress={() => onDataChange('suggestedTrips', value)}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const Step5Summary = ({ 
  data, 
  onBack, 
  onFinish,
  loading 
}: { 
  data: OnboardingData; 
  onBack: () => void; 
  onFinish: () => void;
  loading: boolean;
}) => {
  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Let's Go!</Text>
        <Text style={styles.stepSubtitle}>Review your preferences and get started</Text>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Personal Info</Text>
          <Text style={styles.summaryText}>Name: {data.firstName} {data.lastName}</Text>
          <Text style={styles.summaryText}>Email: {data.email}</Text>
          {data.phone && <Text style={styles.summaryText}>Phone: {data.phone}</Text>}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Interests</Text>
          <Text style={styles.summaryText}>
            Artists: {(data.favoriteArtists || []).length > 0 ? data.favoriteArtists.join(', ') : 'None selected'}
          </Text>
          <Text style={styles.summaryText}>
            Genres: {(data.favoriteGenres || []).length > 0 ? data.favoriteGenres.join(', ') : 'None selected'}
          </Text>
          <Text style={styles.summaryText}>
            Event Types: {(data.favoriteEventTypes || []).length > 0 ? data.favoriteEventTypes.join(', ') : 'None selected'}
          </Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Travel Preferences</Text>
          {data.primaryAirport && <Text style={styles.summaryText}>Airport: {data.primaryAirport}</Text>}
          <Text style={styles.summaryText}>
            Airlines: {(data.preferredAirlines || []).length > 0 ? data.preferredAirlines.join(', ') : 'None selected'}
          </Text>
          <Text style={styles.summaryText}>
            Flight Class: {data.flightClass.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Communication</Text>
          <Text style={styles.summaryText}>
            Email: {data.emailNotifications ? 'ON' : 'OFF'}
          </Text>
          <Text style={styles.summaryText}>
            Push: {data.pushNotifications ? 'ON' : 'OFF'}
          </Text>
          <Text style={styles.summaryText}>
            Trips per week: {data.suggestedTrips}
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.nextButton, loading && styles.disabledButton]} 
            onPress={onFinish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.nextButtonText}>Get Started!</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const OnboardingFlow: React.FC = () => {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    zipCode: '',
    favoriteArtists: [],
    favoriteGenres: [],
    musicDiscoveryStyle: 'spotify',
    favoriteEventTypes: [],
    primaryAirport: '',
    preferredAirlines: [],
    flightClass: 'economy',
    preferredHotelBrands: [],
    preferredDestinations: [],
    emailNotifications: true,
    pushNotifications: true,
    suggestedTrips: 3,
  });

  const handleDataChange = (field: keyof OnboardingData, value: any) => {
    setOnboardingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const goNext = () => setStep((prev) => Math.min(prev + 1, stepLabels.length - 1));
  const goBack = () => setStep((prev) => Math.max(prev - 1, 0));

  const finish = async () => {
    setLoading(true);
    try {
      // Save user profile
      await api.put('/users/profile', {
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        phone: onboardingData.phone,
        addressLine1: onboardingData.addressLine1,
        city: onboardingData.city,
        state: onboardingData.state,
        zipCode: onboardingData.zipCode,
      });

      // Save travel preferences
      await api.put('/users/travel-preferences', {
        primaryAirport: onboardingData.primaryAirport,
        preferredAirlines: onboardingData.preferredAirlines,
        flightClass: onboardingData.flightClass,
        preferredHotelBrands: onboardingData.preferredHotelBrands,
        preferredDestinations: onboardingData.preferredDestinations
      });

      // Save music interests
      for (const artist of onboardingData.favoriteArtists) {
        try {
          await api.post('/users/interests', {
            interestType: 'artist',
            interestValue: artist,
            priority: 1
          });
        } catch (error: any) {
          // Handle duplicate interests gracefully (409 Conflict)
          if (error.response?.status === 409) {
            console.log(`Artist interest "${artist}" already exists, skipping`);
          } else {
            console.error('Error saving artist interest:', error);
          }
        }
      }

      for (const genre of onboardingData.favoriteGenres) {
        try {
          await api.post('/users/interests', {
            interestType: 'genre',
            interestValue: genre,
            priority: 1
          });
        } catch (error: any) {
          // Handle duplicate interests gracefully (409 Conflict)
          if (error.response?.status === 409) {
            console.log(`Genre interest "${genre}" already exists, skipping`);
          } else {
            console.error('Error saving genre interest:', error);
          }
        }
      }

      // Note: Backend doesn't support event_type interests, so we'll skip these for now
      // The backend only supports: ['artist', 'genre', 'venue', 'city', 'playlist']
      console.log('Skipping event type interests - not supported by backend');

      // Generate trip suggestions
      await api.post('/trips/generate', { limit: 5 });

      navigation.navigate('Dashboard');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to save onboarding data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <Step1PersonalInfo data={onboardingData} onDataChange={handleDataChange} onNext={goNext} />;
      case 1:
        return <Step2Interests data={onboardingData} onDataChange={handleDataChange} onNext={goNext} onBack={goBack} />;
      case 2:
        return <Step3TravelPreferences data={onboardingData} onDataChange={handleDataChange} onNext={goNext} onBack={goBack} />;
      case 3:
        return <Step4CommunicationPreferences data={onboardingData} onDataChange={handleDataChange} onNext={goNext} onBack={goBack} />;
      case 4:
        return <Step5Summary data={onboardingData} onBack={goBack} onFinish={finish} loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.stepper}>
          {stepLabels.map((_, i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                i <= step ? styles.activeDot : null,
                i < step ? styles.completedDot : null
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepLabel}>{stepLabels[step]}</Text>
        {renderStep()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#1976d2',
  },
  completedDot: {
    backgroundColor: '#4caf50',
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 20,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedChip: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedChipText: {
    color: 'white',
    fontWeight: '600',
  },
  radioContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  radioOption: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedRadio: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
  },
  selectedRadioText: {
    color: 'white',
    fontWeight: '600',
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'flex-start',
  },
  toggleButtonActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: 'white',
  },
  sliderContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  sliderTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  sliderDotActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  summarySection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  nextButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default OnboardingFlow; 