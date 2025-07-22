# Frontend Development Best Practices

## 🚨 **Pre-Change Checklist**

### **1. Dependencies**
- [ ] Check if new MUI components need additional imports
- [ ] Verify TypeScript types are available
- [ ] Install missing packages before coding

### **2. Component Structure**
- [ ] Define proper TypeScript interfaces for props
- [ ] Use proper React.FC typing
- [ ] Include proper return types for functions

### **3. State Management**
- [ ] Use proper useState typing: `useState<Type>(initialValue)`
- [ ] Include dependency arrays in useEffect
- [ ] Handle async state updates properly

### **4. Context Usage**
- [ ] Check if context methods exist before using them
- [ ] Update context interface when adding new methods
- [ ] Use proper property names (camelCase vs snake_case)

### **5. Type Annotations**
- [ ] Add types to function parameters
- [ ] Add types to array methods (sort, map, filter)
- [ ] Use proper interface names consistently

## 🔧 **Common Fixes**

### **TypeScript Errors**
```typescript
// ❌ Wrong
const [data, setData] = useState([]);

// ✅ Correct
const [data, setData] = useState<DataType[]>([]);

// ❌ Wrong
const handleClick = (event) => { ... };

// ✅ Correct
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => { ... };
```

### **Material-UI Imports**
```typescript
// ❌ Wrong - Missing imports
import { Box, Typography } from '@mui/material';

// ✅ Correct - Complete imports
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
    Alert
} from '@mui/material';
```

### **Component Props**
```typescript
// ❌ Wrong - No interface
const MyComponent = (props) => { ... };

// ✅ Correct - Proper interface
interface MyComponentProps {
    title: string;
    onAction?: () => void;
    data?: DataType[];
}

const MyComponent: React.FC<MyComponentProps> = ({ title, onAction, data = [] }) => { ... };
```

## 🛠 **Debugging Steps**

### **1. Check Console Errors**
- Look for specific TypeScript errors
- Check for missing imports
- Verify component usage

### **2. Verify Dependencies**
```bash
# Check if package is installed
npm list @mui/material

# Install missing packages
npm install package-name @types/package-name
```

### **3. Type Checking**
```bash
# Run TypeScript check
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/components/MyComponent.tsx
```

## 📝 **Component Template**

```typescript
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    // Add all needed MUI components
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

// Define interfaces
interface ComponentProps {
    title: string;
    onAction?: () => void;
    data?: any[];
}

interface ComponentState {
    loading: boolean;
    error: string | null;
    data: any[];
}

// Component with proper typing
const MyComponent: React.FC<ComponentProps> = ({ 
    title, 
    onAction, 
    data = [] 
}) => {
    // Properly typed state
    const [state, setState] = useState<ComponentState>({
        loading: false,
        error: null,
        data: []
    });

    // Properly typed event handlers
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        onAction?.();
    };

    return (
        <Box>
            <Typography variant="h6">{title}</Typography>
            {/* Component content */}
        </Box>
    );
};

export default MyComponent;
```

## 🎯 **Quick Fix Reference**

### **Common Error: "Cannot find module"**
```bash
npm install missing-package @types/missing-package
```

### **Common Error: "Property does not exist on type"**
```typescript
// Add proper interface
interface MyData {
    id: number;
    name: string;
    // ... other properties
}
```

### **Common Error: "JSX element has no corresponding closing tag"**
- Check for proper JSX fragment syntax: `<>...</>`
- Verify all components are properly closed
- Check for missing closing tags

### **Common Error: "Expected corresponding closing tag"**
- Ensure all JSX elements are properly nested
- Check for missing closing brackets/parentheses
- Verify fragment syntax

### **Common Error: "Property does not exist on type"**
```typescript
// ❌ Wrong - Using snake_case for camelCase properties
user.first_name  // Error: Property 'first_name' does not exist

// ✅ Correct - Use camelCase properties
user.firstName   // Correct
```

### **Common Error: "Parameter implicitly has an 'any' type"**
```typescript
// ❌ Wrong - No type annotations
const sorted = array.sort((a, b) => a - b);

// ✅ Correct - Add type annotations
const sorted = array.sort((a: MyType, b: MyType) => a.priority - b.priority);
```

### **Common Error: "Property does not exist on type 'ContextType'"**
```typescript
// ❌ Wrong - Missing method in context interface
interface AuthContextType {
  user: User | null;
  // Missing updateUser method
}

// ✅ Correct - Include all methods in interface
interface AuthContextType {
  user: User | null;
  updateUser: (userData: Partial<User>) => void;
}
```

## 🔄 **Before Committing**

- [ ] Run `npm run build` to check for compile errors
- [ ] Run `npx tsc --noEmit` for TypeScript errors
- [ ] Test component functionality
- [ ] Verify responsive design
- [ ] Check console for warnings/errors

## 📚 **Resources**

- [Material-UI Documentation](https://mui.com/material-ui/getting-started/)
- [TypeScript React Guide](https://www.typescriptlang.org/docs/handbook/react.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

---

**Remember**: Always define types first, then implement. It saves debugging time! 🎯 