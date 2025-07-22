// Database Helper Utilities
// Common functions for database operations, validation, and error handling

const { validateDecimal, validateRequiredString, validateOptionalString, validateDate } = require('../types/database');

/**
 * Database operation result wrapper
 */
class DatabaseResult {
  constructor(success, data = null, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.timestamp = new Date();
  }

  static success(data) {
    return new DatabaseResult(true, data);
  }

  static error(error) {
    return new DatabaseResult(false, null, error);
  }
}

/**
 * Common database validation functions
 */
const DatabaseValidators = {
  /**
   * Validate user input for database operations
   */
  validateUserInput(input) {
    const errors = [];
    
    if (!input.email || typeof input.email !== 'string') {
      errors.push('Email is required and must be a string');
    }
    
    if (!input.first_name || typeof input.first_name !== 'string') {
      errors.push('First name is required and must be a string');
    }
    
    if (!input.last_name || typeof input.last_name !== 'string') {
      errors.push('Last name is required and must be a string');
    }
    
    if (input.phone && typeof input.phone !== 'string') {
      errors.push('Phone must be a string');
    }
    
    return errors;
  },

  /**
   * Validate booking input
   */
  validateBookingInput(input) {
    const errors = [];
    
    if (!input.user_id || typeof input.user_id !== 'number') {
      errors.push('User ID is required and must be a number');
    }
    
    if (!input.event_id || typeof input.event_id !== 'number') {
      errors.push('Event ID is required and must be a number');
    }
    
    if (typeof input.total_cost !== 'number' || input.total_cost < 0) {
      errors.push('Total cost must be a non-negative number');
    }
    
    if (typeof input.service_fee !== 'number' || input.service_fee < 0) {
      errors.push('Service fee must be a non-negative number');
    }
    
    if (typeof input.grand_total !== 'number' || input.grand_total < 0) {
      errors.push('Grand total must be a non-negative number');
    }
    
    return errors;
  },

  /**
   * Validate booking component input
   */
  validateBookingComponentInput(input) {
    const errors = [];
    
    if (!input.booking_id || typeof input.booking_id !== 'number') {
      errors.push('Booking ID is required and must be a number');
    }
    
    if (!input.component_type || !['flight', 'hotel', 'car', 'ticket'].includes(input.component_type)) {
      errors.push('Component type must be one of: flight, hotel, car, ticket');
    }
    
    if (!input.provider || typeof input.provider !== 'string') {
      errors.push('Provider is required and must be a string');
    }
    
    if (typeof input.price !== 'number' || input.price < 0) {
      errors.push('Price must be a non-negative number');
    }
    
    return errors;
  },

  /**
   * Validate event input
   */
  validateEventInput(input) {
    const errors = [];
    
    if (!input.name || typeof input.name !== 'string') {
      errors.push('Event name is required and must be a string');
    }
    
    if (!input.event_date) {
      errors.push('Event date is required');
    } else {
      try {
        validateDate(input.event_date);
      } catch (error) {
        errors.push('Invalid event date');
      }
    }
    
    if (input.min_price !== undefined && (typeof input.min_price !== 'number' || input.min_price < 0)) {
      errors.push('Min price must be a non-negative number');
    }
    
    if (input.max_price !== undefined && (typeof input.max_price !== 'number' || input.max_price < 0)) {
      errors.push('Max price must be a non-negative number');
    }
    
    return errors;
  }
};

/**
 * Database query builders
 */
const QueryBuilders = {
  /**
   * Build a SELECT query with optional WHERE conditions
   */
  buildSelectQuery(table, conditions = {}, orderBy = null, limit = null, offset = null) {
    let query = `SELECT * FROM ${table}`;
    const params = [];
    let paramIndex = 1;
    
    // Add WHERE conditions
    if (Object.keys(conditions).length > 0) {
      const whereClauses = [];
      for (const [key, value] of Object.entries(conditions)) {
        if (value !== undefined && value !== null) {
          whereClauses.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
    }
    
    // Add ORDER BY
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    // Add LIMIT
    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
      paramIndex++;
    }
    
    // Add OFFSET
    if (offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(offset);
    }
    
    return { query, params };
  },

  /**
   * Build an INSERT query
   */
  buildInsertQuery(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    return { query, params: values };
  },

  /**
   * Build an UPDATE query
   */
  buildUpdateQuery(table, data, conditions) {
    const setColumns = Object.keys(data);
    const setValues = Object.values(data);
    const whereColumns = Object.keys(conditions);
    const whereValues = Object.values(conditions);
    
    const setClause = setColumns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    const whereClause = whereColumns.map((col, index) => `${col} = $${setValues.length + index + 1}`).join(' AND ');
    
    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;
    
    return { query, params: [...setValues, ...whereValues] };
  },

  /**
   * Build a DELETE query
   */
  buildDeleteQuery(table, conditions) {
    const whereColumns = Object.keys(conditions);
    const whereValues = Object.values(conditions);
    
    const whereClause = whereColumns.map((col, index) => `${col} = $${index + 1}`).join(' AND ');
    
    const query = `
      DELETE FROM ${table}
      WHERE ${whereClause}
      RETURNING *
    `;
    
    return { query, params: whereValues };
  }
};

/**
 * Database error handlers
 */
const DatabaseErrorHandlers = {
  /**
   * Handle common database errors
   */
  handleError(error) {
    console.error('Database Error:', error);
    
    // Handle specific PostgreSQL errors
    if (error.code) {
      switch (error.code) {
        case '23505': // unique_violation
          return DatabaseResult.error('Duplicate entry found');
        case '23503': // foreign_key_violation
          return DatabaseResult.error('Referenced record does not exist');
        case '23502': // not_null_violation
          return DatabaseResult.error('Required field is missing');
        case '22P02': // invalid_text_representation
          return DatabaseResult.error('Invalid data type provided');
        case '42703': // undefined_column
          return DatabaseResult.error('Column does not exist');
        case '42P01': // undefined_table
          return DatabaseResult.error('Table does not exist');
        default:
          return DatabaseResult.error(`Database error: ${error.message}`);
      }
    }
    
    return DatabaseResult.error(error.message || 'Unknown database error');
  },

  /**
   * Handle connection errors
   */
  handleConnectionError(error) {
    console.error('Database Connection Error:', error);
    return DatabaseResult.error('Database connection failed');
  },

  /**
   * Handle query timeout
   */
  handleTimeoutError(error) {
    console.error('Database Timeout Error:', error);
    return DatabaseResult.error('Database query timed out');
  }
};

/**
 * Database transaction helpers
 */
const TransactionHelpers = {
  /**
   * Execute a function within a database transaction
   */
  async executeInTransaction(db, operation) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Execute multiple operations in a transaction
   */
  async executeMultipleInTransaction(db, operations) {
    return this.executeInTransaction(db, async (client) => {
      const results = [];
      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
      }
      return results;
    });
  }
};

/**
 * Database performance helpers
 */
const PerformanceHelpers = {
  /**
   * Add query timing logging
   */
  async withTiming(operation, operationName = 'Database Operation') {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      console.log(`${operationName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`${operationName} failed after ${duration}ms:`, error);
      throw error;
    }
  },

  /**
   * Add query result caching
   */
  createCache(ttl = 300000) { // 5 minutes default
    const cache = new Map();
    
    return {
      get(key) {
        const item = cache.get(key);
        if (item && Date.now() - item.timestamp < ttl) {
          return item.value;
        }
        cache.delete(key);
        return null;
      },
      
      set(key, value) {
        cache.set(key, { value, timestamp: Date.now() });
      },
      
      clear() {
        cache.clear();
      }
    };
  }
};

/**
 * Database data sanitization
 */
const DataSanitizers = {
  /**
   * Sanitize user input for database queries
   */
  sanitizeUserInput(input) {
    if (typeof input !== 'object' || input === null) {
      return input;
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else if (typeof value === 'number') {
        sanitized[key] = isNaN(value) ? 0 : value;
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  },

  /**
   * Sanitize SQL identifiers
   */
  sanitizeIdentifier(identifier) {
    // Only allow alphanumeric characters and underscores
    return identifier.replace(/[^a-zA-Z0-9_]/g, '');
  },

  /**
   * Escape SQL LIKE patterns
   */
  escapeLikePattern(pattern) {
    return pattern.replace(/[%_]/g, '\\$&');
  }
};

module.exports = {
  DatabaseResult,
  DatabaseValidators,
  QueryBuilders,
  DatabaseErrorHandlers,
  TransactionHelpers,
  PerformanceHelpers,
  DataSanitizers
}; 