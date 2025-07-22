# Frontend Documentation

## Overview
The frontend is a React Single Page Application (SPA) built with TypeScript, providing user and admin interfaces for the Concert Travel App. It features responsive design, authentication, and real-time updates.

## Technology Stack
- **React 18** with TypeScript
- **React Router** for navigation
- **Context API** for state management
- **Material-UI (MUI)** for UI components
- **CSS3** with modern styling
- **Create React App** for build tooling

## Project Structure
```
frontend/
├── public/           # Static assets, index.html
├── src/
│   ├── components/   # Reusable UI components
│   │   ├── Auth/     # Login, Register components
│   │   ├── Dashboard/ # User dashboard
│   │   ├── Events/   # Event search, display
│   │   ├── Profile/  # User profile management
│   │   └── ProtectedRoute.tsx
│   ├── contexts/     # React contexts (AuthContext)
│   ├── pages/        # Page components
│   ├── config/       # API configuration
│   ├── hooks/        # Custom React hooks
│   ├── services/     # API service layer
│   └── App.tsx       # Main app component
├── package.json
└── tsconfig.json
```

## Main Components

### Authentication
- **Login.tsx**: User login form with validation
- **Register.tsx**: User registration form
- **AuthContext.tsx**: Global authentication state
- **ProtectedRoute.tsx**: Route protection for authenticated users

### Dashboard
- **Dashboard.tsx**: Main user dashboard with trip suggestions
- **TripSuggestions.tsx**: Display personalized trip recommendations
- **EnhancedTripCard.tsx**: Reusable trip card component

### Profile Management
- **ProfilePage.tsx**: User profile overview
- **PersonalInfo.tsx**: Edit personal information
- **TravelPreferences.tsx**: Manage travel preferences
- **UserInterests.tsx**: Manage artist/genre interests

### Events
- **EventSearch.tsx**: Search and filter events

### Booking Flow
- **BookingFlow.tsx**: Complete booking process with stepper
- **TripCustomization.tsx**: Trip component customization
- **PaymentFlow.tsx**: Payment processing with Stripe
- **BookingManagement.tsx**: Booking history and management

## State Management
- **AuthContext**: Manages user authentication state
- **Local State**: Component-specific state using useState/useReducer
- **API Integration**: Direct API calls with error handling

## Routing
- `/` - Landing page
- `/login` - User login
- `/register` - User registration
- `/dashboard` - Main dashboard (protected)
- `/profile` - User profile (protected)
- `/events` - Event search (protected)
- `/trips` - Trip suggestions (protected)
- `/booking` - Booking management (protected)
- `/spotify-callback` - Spotify OAuth callback

## API Integration
- **config/api.ts**: API configuration and base URLs
- **services/**: Service layer for API calls
- **Error Handling**: Centralized error handling for API calls
- **Loading States**: Loading indicators for async operations

## Development

### Setup
```bash
cd frontend
npm install
npm start
```

### Available Scripts
- `npm start` - Start development server
- `npm test` - Run tests
- `npm run build` - Build for production
- `npm run eject` - Eject from Create React App

### Environment Variables
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_SPOTIFY_CLIENT_ID` - Spotify OAuth client ID

## Styling Guidelines

### Material-UI (MUI) Best Practices
- **Theme Consistency**: Use the app's dark theme consistently
- **Component Styling**: Use `sx` prop for component-specific styles
- **Responsive Design**: Use MUI's responsive breakpoints
- **Color Scheme**: 
  - Primary: `#1976d2` (blue)
  - Success: `#4caf50` (green)
  - Background: `#000000` (black)
  - Text: `white` and `rgba(255,255,255,0.7)` for secondary

### CSS Guidelines
- **Global Styles**: Use `index.css` for global overrides
- **Component Styles**: Prefer `sx` prop over styled-components
- **Transparency**: Use `rgba()` for transparency effects
- **Consistency**: Follow established patterns for spacing and typography

## MUI Component Import Best Practices

- **Always import Grid as a default import:**
  ```tsx
  import Grid from '@mui/material/Grid';
  ```
- **Do NOT destructure Grid from '@mui/material'** (e.g., `import { Grid } from '@mui/material'}`) as this can cause prop errors.
- **Never import the same MUI component under two names in the same file.**
- **Use a single, consistent alias for each MUI component.**
- **If you need to customize, use a wrapper component instead of aliasing.**

## Common Pitfalls
- Using both `FormControlLabel` and `FormControlLabel as MuiFormControlLabel` in the same file will cause type errors. Use only one import and one name.
- Always check the MUI documentation for the correct import style for each component.

## Common Pitfalls and Best Practices

### ⚠️ **Critical Syntax Guidelines**

#### 1. **MUI Component Props**
```typescript
// ✅ CORRECT - Proper sx prop syntax
<Radio sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#1976d2' } }} />

// ❌ INCORRECT - Extra closing brace
<Radio sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#1976d2' } } />}

// ✅ CORRECT - FormControlLabel with proper props
<FormControlLabel
  control={<Radio />}
  label="Option"
  value="option"
/>

// ❌ INCORRECT - Missing required props
<FormControlLabel
  control={<Radio />}
  // Missing label prop
/>
```

#### 2. **TypeScript Interface Compliance**
```typescript
// ✅ CORRECT - Proper interface implementation
interface BookingOption {
  id: string;
  provider: string;
  price: number;
  features: string[];
}

// ✅ CORRECT - Using optional properties safely
const departureTime = flightSelection?.selectedOption?.details?.departureTime || 'TBD';

// ❌ INCORRECT - Accessing non-existent properties
const departureTime = flightSelection.selectedOption.departure_date; // Property doesn't exist
```

#### 3. **Component State Management**
```typescript
// ✅ CORRECT - Proper state initialization
const [travelerInfo, setTravelerInfo] = useState({
  numberOfTravelers: 1,
  travelerNames: [''] as string[]
});

// ✅ CORRECT - Safe state updates
const handleTravelerCountChange = (count: number) => {
  setTravelerInfo(prev => ({
    numberOfTravelers: count,
    travelerNames: Array(count).fill('').map((_, i) => prev.travelerNames[i] || '')
  }));
};
```

### 🔧 **Development Workflow**

#### 1. **Before Making Changes**
- Review existing component patterns
- Check TypeScript interfaces in `services/` directory
- Ensure compatibility with existing state management
- Test component integration

#### 2. **During Development**
- Use TypeScript strict mode
- Follow established naming conventions
- Implement proper error handling
- Add loading states for async operations

#### 3. **After Development**
- Test all user flows
- Verify TypeScript compilation
- Check for console errors
- Validate responsive design

### 📋 **Component Development Checklist**

#### **New Component Creation**
- [ ] Create TypeScript interface for props
- [ ] Implement proper error boundaries
- [ ] Add loading states
- [ ] Include accessibility attributes
- [ ] Test responsive behavior
- [ ] Add proper TypeScript types

#### **Component Updates**
- [ ] Maintain backward compatibility
- [ ] Update related interfaces
- [ ] Test integration points
- [ ] Verify no breaking changes
- [ ] Update documentation

### 🚨 **Common Error Prevention**

#### **1. Syntax Errors**
- Always check JSX closing tags
- Verify MUI component prop syntax
- Use proper TypeScript type annotations
- Avoid extra closing braces in sx props

#### **2. Type Errors**
- Use optional chaining (`?.`) for nested properties
- Provide fallback values for optional properties
- Check interface definitions before accessing properties
- Use type guards for conditional rendering

#### **3. State Management Errors**
- Initialize state with proper types
- Use functional updates for complex state changes
- Avoid direct mutation of state objects
- Handle async state updates properly

### 🎨 **UI/UX Guidelines**

#### **1. Consistent Styling**
- Use the app's dark theme consistently
- Maintain proper contrast ratios
- Follow established spacing patterns
- Use consistent typography hierarchy

#### **2. User Experience**
- Provide clear loading states
- Implement proper error handling
- Use intuitive navigation patterns
- Ensure responsive design

#### **3. Accessibility**
- Include proper ARIA labels
- Maintain keyboard navigation
- Use semantic HTML elements
- Ensure color contrast compliance

## Testing
- Unit tests for components
- Integration tests for user flows
- Manual testing for UI/UX
- TypeScript compilation testing

## Performance
- Lazy loading for routes
- Memoization for expensive components
- Optimized bundle size
- Efficient state management

## Related Docs
- [System Architecture](architecture.md)
- [Backend & API](backend.md)
- [Developer Guide](developer-guide.md)
- [Booking Flow Documentation](frontend-booking-flow.md)

---
[Back to README](../README.md) 