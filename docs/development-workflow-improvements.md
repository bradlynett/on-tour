# Development Workflow Improvements

## Overview
This document outlines improvements to prevent common development issues, especially database-related problems like data type mismatches, column name errors, and validation failures.

## 🎯 **Database Schema Memory & Reference**

### **1. Always Reference the Schema**
- **Before writing any database code**: Check `docs/database-schema-reference.md`
- **For TypeScript**: Use interfaces from `backend/types/database.ts`
- **For validation**: Use helper functions from `backend/utils/databaseHelpers.js`

### **2. Database Schema Quick Reference**

#### **Core Tables & Key Fields**
```sql
-- Users (id, email, first_name, last_name, phone)
users (id SERIAL, email VARCHAR(255) UNIQUE, ...)

-- Bookings (id, user_id, event_id, status, total_cost, service_fee, grand_total)
bookings (id SERIAL, user_id INTEGER, event_id INTEGER, status VARCHAR(20), ...)

-- Booking Components (id, booking_id, component_type, provider, price, status)
booking_components (id SERIAL, booking_id INTEGER, component_type VARCHAR(20), ...)

-- Events (id, external_id, name, artist, event_date, min_price, max_price)
events (id SERIAL, external_id VARCHAR(255) UNIQUE, name VARCHAR(255), ...)
```

#### **Critical Data Types**
- **IDs**: `SERIAL` (auto-increment) or `INTEGER`
- **Prices**: `DECIMAL(10,2)` (always pass as numbers, not strings)
- **Dates**: `TIMESTAMP` or `TIMESTAMP WITH TIME ZONE`
- **Status**: `VARCHAR(20)` with CHECK constraints
- **JSON**: `JSONB` for flexible data storage

#### **Status Enums**
```javascript
// Booking statuses
const BOOKING_STATUSES = ['planning', 'pending', 'confirmed', 'cancelled', 'completed'];

// Component types
const COMPONENT_TYPES = ['flight', 'hotel', 'car', 'ticket'];

// Component statuses
const COMPONENT_STATUSES = ['pending', 'confirmed', 'cancelled', 'failed'];
```

## 🔧 **Development Workflow Improvements**

### **1. Pre-Development Checklist**

#### **Before Writing Database Code**
- [ ] Check `docs/database-schema-reference.md` for table structure
- [ ] Review `backend/types/database.ts` for TypeScript interfaces
- [ ] Use `backend/utils/databaseHelpers.js` for validation
- [ ] Verify data types match schema exactly

#### **Before Writing API Endpoints**
- [ ] Define input validation using helper functions
- [ ] Use TypeScript interfaces for request/response types
- [ ] Implement proper error handling
- [ ] Add parameterized queries (no string concatenation)

### **2. Code Templates & Patterns**

#### **Database Query Template**
```javascript
const { DatabaseValidators, QueryBuilders, DatabaseErrorHandlers } = require('../utils/databaseHelpers');

async function createBooking(bookingData) {
  try {
    // 1. Validate input
    const validationErrors = DatabaseValidators.validateBookingInput(bookingData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // 2. Sanitize data
    const sanitizedData = DataSanitizers.sanitizeUserInput(bookingData);

    // 3. Build query
    const { query, params } = QueryBuilders.buildInsertQuery('bookings', sanitizedData);

    // 4. Execute query
    const result = await db.query(query, params);
    
    return DatabaseResult.success(result.rows[0]);
  } catch (error) {
    return DatabaseErrorHandlers.handleError(error);
  }
}
```

#### **API Endpoint Template**
```javascript
const { validateDecimal, validateRequiredString } = require('../types/database');

router.post('/booking/create', async (req, res) => {
  try {
    // 1. Validate request body
    const { user_id, event_id, total_cost, service_fee, grand_total } = req.body;
    
    // Validate required fields
    if (!user_id || !event_id) {
      return res.status(400).json({ error: 'User ID and Event ID are required' });
    }
    
    // Validate numeric fields
    const validatedCost = validateDecimal(total_cost);
    const validatedFee = validateDecimal(service_fee);
    const validatedTotal = validateDecimal(grand_total);

    // 2. Create booking data
    const bookingData = {
      user_id: parseInt(user_id),
      event_id: parseInt(event_id),
      total_cost: validatedCost,
      service_fee: validatedFee,
      grand_total: validatedTotal,
      status: 'planning'
    };

    // 3. Call service
    const result = await bookingService.createBooking(bookingData);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### **3. Testing Workflow**

#### **Database Testing Template**
```javascript
const { DatabaseValidators } = require('../utils/databaseHelpers');

describe('Booking Validation', () => {
  test('should validate correct booking data', () => {
    const validData = {
      user_id: 1,
      event_id: 1,
      total_cost: 299.99,
      service_fee: 15.00,
      grand_total: 314.99
    };
    
    const errors = DatabaseValidators.validateBookingInput(validData);
    expect(errors).toHaveLength(0);
  });

  test('should reject invalid booking data', () => {
    const invalidData = {
      user_id: 'not-a-number',
      event_id: -1,
      total_cost: 'invalid-price'
    };
    
    const errors = DatabaseValidators.validateBookingInput(invalidData);
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

#### **API Testing Template**
```javascript
describe('POST /api/booking/create', () => {
  test('should create booking with valid data', async () => {
    const bookingData = {
      user_id: 1,
      event_id: 1,
      total_cost: 299.99,
      service_fee: 15.00,
      grand_total: 314.99
    };

    const response = await request(app)
      .post('/api/booking/create')
      .set('Authorization', `Bearer ${validToken}`)
      .send(bookingData);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
  });

  test('should reject invalid data types', async () => {
    const invalidData = {
      user_id: 'not-a-number',
      total_cost: 'invalid-price'
    };

    const response = await request(app)
      .post('/api/booking/create')
      .set('Authorization', `Bearer ${validToken}`)
      .send(invalidData);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Validation failed');
  });
});
```

## 🛠 **Tools & Automation**

### **1. Database Schema Validation Script**
```javascript
// scripts/validate-schema.js
const { Pool } = require('pg');
const fs = require('fs');

async function validateSchema() {
  const pool = new Pool();
  
  try {
    // Check if all tables exist
    const tables = ['users', 'bookings', 'booking_components', 'events'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [table]);
      
      if (!result.rows[0].exists) {
        console.error(`❌ Table '${table}' does not exist`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }
    
    // Check column types
    const columnChecks = [
      { table: 'bookings', column: 'total_cost', expected: 'numeric' },
      { table: 'bookings', column: 'status', expected: 'character varying' },
      { table: 'events', column: 'event_date', expected: 'timestamp' }
    ];
    
    for (const check of columnChecks) {
      const result = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [check.table, check.column]);
      
      if (result.rows.length === 0) {
        console.error(`❌ Column '${check.column}' not found in '${check.table}'`);
      } else if (result.rows[0].data_type !== check.expected) {
        console.error(`❌ Column '${check.column}' in '${check.table}' has wrong type: ${result.rows[0].data_type}`);
      } else {
        console.log(`✅ Column '${check.column}' in '${check.table}' has correct type`);
      }
    }
    
  } catch (error) {
    console.error('Schema validation error:', error);
  } finally {
    await pool.end();
  }
}

validateSchema();
```

### **2. Pre-commit Hooks**
```json
// .husky/pre-commit
#!/bin/sh
echo "🔍 Running pre-commit checks..."

# Run schema validation
node scripts/validate-schema.js

# Run TypeScript type checking
npm run type-check

# Run database tests
npm run test:db

# Run API tests
npm run test:api
```

### **3. Development Environment Setup**
```bash
# scripts/setup-dev-env.sh
#!/bin/bash

echo "🚀 Setting up development environment..."

# Install dependencies
npm install

# Set up database
npm run db:migrate
npm run db:seed

# Validate schema
node scripts/validate-schema.js

# Run tests
npm run test

echo "✅ Development environment ready!"
```

## 📋 **Common Issues & Solutions**

### **1. Data Type Mismatches**

#### **Problem**: Passing string to DECIMAL field
```javascript
// ❌ Wrong
await db.query('INSERT INTO bookings (total_cost) VALUES ($1)', ['299.99']);

// ✅ Correct
await db.query('INSERT INTO bookings (total_cost) VALUES ($1)', [299.99]);
```

#### **Solution**: Use validation helpers
```javascript
const validatedCost = validateDecimal(totalCost);
await db.query('INSERT INTO bookings (total_cost) VALUES ($1)', [validatedCost]);
```

### **2. Missing Required Fields**

#### **Problem**: Missing NOT NULL fields
```javascript
// ❌ Wrong
await db.query('INSERT INTO users (email) VALUES ($1)', [email]);

// ✅ Correct
await db.query(
  'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4)',
  [email, passwordHash, firstName, lastName]
);
```

#### **Solution**: Use validation
```javascript
const errors = DatabaseValidators.validateUserInput(userData);
if (errors.length > 0) {
  throw new Error(`Validation failed: ${errors.join(', ')}`);
}
```

### **3. Invalid Enum Values**

#### **Problem**: Invalid status values
```javascript
// ❌ Wrong
await db.query('UPDATE bookings SET status = $1 WHERE id = $2', ['invalid_status', bookingId]);

// ✅ Correct
await db.query('UPDATE bookings SET status = $1 WHERE id = $2', ['confirmed', bookingId]);
```

#### **Solution**: Use validation functions
```javascript
if (!isValidBookingStatus(status)) {
  throw new Error(`Invalid booking status: ${status}`);
}
```

## 🎯 **Best Practices Summary**

### **1. Always Use**
- ✅ Parameterized queries (no string concatenation)
- ✅ Input validation before database operations
- ✅ TypeScript interfaces for type safety
- ✅ Database helper functions for common operations
- ✅ Proper error handling and logging

### **2. Never Use**
- ❌ String concatenation in SQL queries
- ❌ Raw user input without validation
- ❌ Hardcoded values for enums
- ❌ Ignoring database errors
- ❌ Mixing data types (string vs number)

### **3. Development Checklist**
- [ ] Reference schema documentation
- [ ] Use TypeScript interfaces
- [ ] Validate all inputs
- [ ] Test with various data types
- [ ] Handle errors gracefully
- [ ] Log operations for debugging

## 📚 **Resources**

### **Documentation**
- `docs/database-schema-reference.md` - Complete schema reference
- `backend/types/database.ts` - TypeScript interfaces
- `backend/utils/databaseHelpers.js` - Helper functions

### **Scripts**
- `scripts/validate-schema.js` - Schema validation
- `scripts/setup-dev-env.sh` - Environment setup
- `scripts/test-db.js` - Database testing

### **Testing**
- `tests/database.test.js` - Database operation tests
- `tests/api.test.js` - API endpoint tests
- `tests/validation.test.js` - Validation tests

---

**Remember**: Always reference the schema documentation before writing database code. The few minutes spent checking the schema will save hours of debugging later! 🎯 