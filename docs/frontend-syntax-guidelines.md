# Frontend Syntax Guidelines

## Overview
This document provides specific syntax guidelines and common pitfalls to prevent compilation errors in the Concert Travel App frontend.

## 🚨 **Critical Syntax Rules**

### 1. **MUI Component Props**

#### **Radio Component**
```typescript
// ✅ CORRECT
<Radio sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#1976d2' } }} />

// ❌ INCORRECT - Extra closing brace
<Radio sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#1976d2' } } />}
```

#### **FormControlLabel Component**
```typescript
// ✅ CORRECT - All required props
<FormControlLabel
  control={<Radio />}
  label="Option"
  value="option"
/>

// ❌ INCORRECT - Missing label prop
<FormControlLabel
  control={<Radio />}
  value="option"
  // Missing label prop - will cause TypeScript error
/>
```

#### **Checkbox Component**
```typescript
// ✅ CORRECT
<Checkbox 
  checked={selectedComponents.tickets}
  onChange={() => handleComponentToggle('tickets')}
  sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#1976d2' } }}
/>

// ❌ INCORRECT - Missing closing brace
<Checkbox 
  checked={selectedComponents.tickets}
  onChange={() => handleComponentToggle('tickets')}
  sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#1976d2' }
/>
```

### 2. **JSX Syntax**

#### **Proper Closing Tags**
```typescript
// ✅ CORRECT
<Box sx={{ color: 'white' }}>
  <Typography>Content</Typography>
</Box>

// ❌ INCORRECT - Self-closing tag with content
<Box sx={{ color: 'white' }} />
  <Typography>Content</Typography>
</Box>
```

#### **Conditional Rendering**
```typescript
// ✅ CORRECT
{condition && <Component />}

// ✅ CORRECT - With proper parentheses
{(condition1 && condition2) && <Component />}

// ❌ INCORRECT - Missing parentheses
{condition1 && condition2 && <Component />}
```

### 3. **TypeScript Interfaces**

#### **Interface Compliance**
```typescript
// ✅ CORRECT - Using optional chaining
const departureTime = flightSelection?.selectedOption?.details?.departureTime || 'TBD';

// ❌ INCORRECT - Accessing non-existent properties
const departureTime = flightSelection.selectedOption.departure_date; // Property doesn't exist
```

#### **State Initialization**
```typescript
// ✅ CORRECT - Proper type annotation
const [travelerInfo, setTravelerInfo] = useState({
  numberOfTravelers: 1,
  travelerNames: [''] as string[]
});

// ❌ INCORRECT - Missing type annotation
const [travelerInfo, setTravelerInfo] = useState({
  numberOfTravelers: 1,
  travelerNames: [''] // Missing 'as string[]'
});
```

## 🔧 **Common Error Patterns**

### 1. **Extra Closing Braces**
```typescript
// ❌ COMMON ERROR - Extra closing brace in sx prop
<Component sx={{ color: 'white' } } />

// ✅ CORRECT
<Component sx={{ color: 'white' }} />
```

### 2. **Missing Required Props**
```typescript
// ❌ COMMON ERROR - Missing required props
<FormControlLabel control={<Radio />} />

// ✅ CORRECT
<FormControlLabel 
  control={<Radio />} 
  label="Option" 
  value="option" 
/>
```

### 3. **Incorrect Property Access**
```typescript
// ❌ COMMON ERROR - Accessing undefined properties
const value = object.property.subProperty; // May cause runtime error

// ✅ CORRECT - Safe property access
const value = object?.property?.subProperty || defaultValue;
```

## 📋 **Pre-Compilation Checklist**

### **Before Running `npm start`**
- [ ] Check all JSX closing tags
- [ ] Verify MUI component prop syntax
- [ ] Ensure all required props are provided
- [ ] Check TypeScript interface compliance
- [ ] Validate state initialization
- [ ] Review conditional rendering logic

### **Common Compilation Errors to Check**
- [ ] `Unexpected token` - Usually extra/missing braces
- [ ] `Property 'label' is missing` - Missing required props
- [ ] `Expression expected` - Syntax error in JSX
- [ ] `Cannot find name` - Missing imports or undefined variables
- [ ] `Type is not assignable` - TypeScript interface mismatch

## 🛠️ **Debugging Tips**

### 1. **Syntax Error Location**
- Look at the line number in the error message
- Check the character position (e.g., `360:113`)
- Focus on the specific component mentioned

### 2. **TypeScript Error Resolution**
- Check interface definitions in `services/` directory
- Use optional chaining (`?.`) for nested properties
- Provide fallback values for optional properties
- Verify prop types match component expectations

### 3. **MUI Component Issues**
- Check MUI documentation for required props
- Verify `sx` prop syntax
- Ensure proper component nesting
- Check for version compatibility issues

## 📚 **Reference Resources**

### **MUI Documentation**
- [Radio Component](https://mui.com/material-ui/api/radio/)
- [FormControlLabel Component](https://mui.com/material-ui/api/form-control-label/)
- [Checkbox Component](https://mui.com/material-ui/api/checkbox/)

### **TypeScript Guidelines**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### **React Best Practices**
- [React Documentation](https://react.dev/)
- [JSX in Depth](https://react.dev/learn/writing-markup-with-jsx)

## 🎯 **Quick Fix Commands**

### **Common Fixes**
```bash
# Clear build cache
rm -rf node_modules/.cache
npm start

# Check TypeScript compilation
npx tsc --noEmit

# Lint and fix
npm run lint -- --fix
```

### **IDE Setup**
- Enable TypeScript strict mode
- Install ESLint and Prettier extensions
- Configure auto-formatting on save
- Enable real-time error checking

---

**Remember: Always test your changes with `npm start` before committing to catch syntax errors early!** 