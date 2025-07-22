# Mobile App Documentation

## Overview
The Concert Travel App includes a mobile application built with React Native, providing a native mobile experience for users to discover concerts, manage travel preferences, and receive personalized trip suggestions on the go.

## Current Status
- **Development Phase**: Core functionality with real data integration
- **Platform Support**: React Native (iOS and Android)
- **Status**: Landing page styled, dashboard integrated with backend, authentication working

## Technology Stack
- **React Native** - Cross-platform mobile development
- **TypeScript** - Type safety and better development experience
- **React Navigation** - Mobile navigation and routing
- **React Native Paper** - Material Design components and theming
- **Expo** - Development tools and build system
- **Axios** - HTTP client for API communication

## Project Structure
```
mobile/
├── src/
│   ├── screens/      # Screen components
│   │   ├── LandingScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   └── OnboardingFlow.tsx
│   ├── shared/       # Shared components and themes
│   │   └── theme.ts
│   ├── navigation/   # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── services/     # API and business logic
│   │   └── api.ts
│   ├── utils/        # Utility functions
│   └── types/        # TypeScript type definitions
├── assets/           # Images and static assets
│   └── Rio Beach Concert.png
├── debug-mobile.js   # Debug script for API testing
└── package.json
```

## Current Features

### ✅ **Implemented Features**

#### 1. **Shared Theme System**
- **File**: `mobile/src/shared/theme.ts`
- **Features**:
  - Cross-platform Material Design theme using React Native Paper
  - Consistent typography with system fonts (iOS: System, Android: Roboto)
  - Custom color palette matching web app design
  - MD3Type font configuration for React Native Paper v5 compatibility
  - Platform-specific font family selection

#### 2. **Pixel-Perfect Landing Page**
- **File**: `mobile/src/screens/LandingScreen.tsx`
- **Features**:
  - Background image integration with Rio Beach Concert.png
  - Transparent card design with glass-effect styling
  - 90% transparent white buttons with proper contrast
  - Responsive layout matching web app design
  - Proper text shadows and overlay effects
  - Branding placement and typography matching web version

#### 3. **Real-Time Dashboard Integration**
- **File**: `mobile/src/screens/DashboardScreen.tsx`
- **Features**:
  - Real trip suggestions from backend database
  - Dynamic component display (flights, hotels, car rentals)
  - User profile integration with travel preferences
  - Pull-to-refresh functionality
  - Loading states and empty state handling
  - Error handling for missing data and network issues

#### 4. **Authentication System**
- **File**: `mobile/src/screens/LoginScreen.tsx`
- **Features**:
  - JWT token-based authentication
  - Integration with backend auth endpoints
  - Error handling and user feedback
  - Navigation to onboarding for new users

#### 5. **Network and Debugging**
- **Files**: 
  - `mobile/src/services/api.ts`
  - `mobile/debug-mobile.js`
- **Features**:
  - Local network IP configuration (192.168.0.42)
  - Comprehensive error handling for API calls
  - Debug script for testing API connectivity
  - Authentication error handling and recovery

### 🔄 **In Progress**
- **Onboarding Flow**: User preference collection
- **Trip Booking**: Integration with booking system
- **Push Notifications**: Event alerts and updates

### 📋 **Planned Features**

#### Phase 1: Core Functionality (Mostly Complete)
- ✅ **Authentication**: Login/register with backend API
- ✅ **User Profile**: View user information from backend
- ✅ **Trip Suggestions**: View personalized trip recommendations
- 🔄 **Travel Preferences**: Manage travel settings

#### Phase 2: Event Discovery
- **Event Search**: Search for concerts and events
- **Event Details**: View event information and pricing
- **Location Services**: Find events near user location
- **Push Notifications**: Event alerts and updates

#### Phase 3: Trip Management
- **Trip Booking**: Book travel components (flights, hotels, etc.)
- **Trip History**: View past and upcoming trips
- **Offline Support**: Basic offline functionality

#### Phase 4: Advanced Features
- **Spotify Integration**: Import listening data
- **Social Features**: Share trips with friends
- **Advanced Search**: Filter by multiple criteria
- **Performance Optimization**: App performance improvements

## Development Setup

### Prerequisites
- **Node.js** (LTS version)
- **Expo CLI** (`npm install -g @expo/cli`)
- **Expo Go app** on your mobile device
- **Git** for version control

### Installation
```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start development server
npm start
```

### Running the App
```bash
# Start Expo development server
npm start

# Scan QR code with Expo Go app
# Or press 'a' for Android emulator, 'i' for iOS simulator
```

### Debugging
```bash
# Test API connectivity
node debug-mobile.js

# Check network configuration
# Ensure backend is running on 192.168.0.42:5001
```

## API Integration
- **Backend API**: Same API endpoints as web frontend
- **Authentication**: JWT token-based authentication
- **Error Handling**: Consistent error handling across platforms
- **Network Configuration**: Local network IP for device testing

### API Endpoints Used
- `POST /api/auth/login` - User authentication
- `GET /api/users/profile` - User profile data
- `GET /api/trips` - Trip suggestions
- `POST /api/trips/generate` - Generate new trip suggestions

## Styling and Theming

### Shared Theme System
The mobile app uses a shared theme system based on React Native Paper:

```typescript
// Example usage
import { useTheme } from 'react-native-paper';
import { sharedTheme } from '../shared/theme';

const MyComponent = () => {
  const theme = useTheme();
  // Use theme.colors, theme.fonts, etc.
};
```

### Style Matching with Web App
- **Typography**: System fonts matching web app
- **Colors**: Consistent color palette
- **Layout**: Responsive design principles
- **Components**: Material Design components

## Platform-Specific Considerations

### iOS
- **Fonts**: System font family
- **Permissions**: Location, notifications, camera
- **App Store**: Guidelines compliance
- **Performance**: iOS-specific optimizations

### Android
- **Fonts**: Roboto font family
- **Permissions**: Location, notifications, storage
- **Play Store**: Guidelines compliance
- **Performance**: Android-specific optimizations

## Testing Strategy
- **Unit Tests**: Component and utility testing
- **Integration Tests**: API integration testing
- **E2E Tests**: User flow testing
- **Platform Testing**: iOS and Android specific testing

## Deployment

### Development
- **Expo Development Server**: Local development server
- **Hot Reloading**: Fast development iteration
- **Debug Tools**: React Native debugger

### Production
- **App Store**: iOS App Store deployment via Expo
- **Play Store**: Google Play Store deployment via Expo
- **Code Signing**: Proper app signing
- **Release Management**: Version management

## Performance Considerations
- **Bundle Size**: Optimize app bundle size
- **Memory Usage**: Efficient memory management
- **Network**: Optimize API calls and caching
- **Battery**: Minimize battery usage

## Security
- **API Security**: Secure API communication
- **Data Storage**: Secure local data storage
- **Authentication**: Secure token management
- **Input Validation**: Client-side validation

## Troubleshooting

### Common Issues

#### Network Connectivity
- **Problem**: "Network Error" when trying to connect to backend
- **Solution**: Ensure backend is running on `192.168.0.42:5001`
- **Debug**: Run `node debug-mobile.js` to test connectivity

#### Authentication Errors
- **Problem**: 401 errors when accessing protected endpoints
- **Solution**: Check if user is logged in, clear tokens if needed
- **Debug**: Check authentication flow in LoginScreen

#### Styling Issues
- **Problem**: Components not matching web app design
- **Solution**: Use shared theme and React Native Paper components
- **Debug**: Check theme configuration in `shared/theme.ts`

## Future Roadmap

### Short Term (1-3 months)
- ✅ Complete authentication flow
- ✅ Basic trip suggestion display
- 🔄 User profile management
- **Event search and display**

### Medium Term (3-6 months)
- **Trip booking integration**
- **Push notifications**
- **Offline support**
- **Advanced search features**

### Long Term (6+ months)
- **Advanced features**
- **Performance optimization**
- **Platform-specific enhancements**
- **Social features**

## Related Documentation
- [System Architecture](architecture.md)
- [Backend & API](backend.md)
- [Frontend](frontend.md)
- [Developer Guide](developer-guide.md)

## Contributing to Mobile Development
- Follow React Native best practices
- Test on both iOS and Android
- Consider platform-specific differences
- Update documentation for mobile-specific changes
- Use the shared theme system for consistency

---
[Back to README](../README.md) 