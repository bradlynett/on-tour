// backend/routes/users.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateUpdateProfile } = require('../middleware/validation');
const { pool } = require('../config/database');
const tripSuggestionEngine = require('../services/tripSuggestionEngine');

// Check if user exists (for debugging)
router.get('/check/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        const userResult = await pool.query(
            'SELECT id, email, first_name, last_name, created_at FROM users WHERE email = $1',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                exists: false
            });
        }
        
        const user = userResult.rows[0];
        res.json({
            success: true,
            message: 'User found',
            exists: true,
            data: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('User check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get user profile with travel preferences
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query(`
            SELECT 
                u.id, u.email, u.first_name, u.last_name, u.phone, u.street_address, u.city, u.state, u.zip_code, u.country, u.created_at,
                up.primary_airport, up.preferred_airlines, up.flight_class,
                up.preferred_hotel_brands, up.rental_car_preference, up.reward_programs, up.reward_program_memberships
            FROM users u
            LEFT JOIN travel_preferences up ON u.id = up.user_id
            WHERE u.id = $1
        `, [req.user.id]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = userResult.rows[0];
        
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone,
                    streetAddress: user.street_address,
                    city: user.city,
                    state: user.state,
                    zipCode: user.zip_code,
                    country: user.country,
                    createdAt: user.created_at,
                    travelPreferences: {
                        primaryAirport: user.primary_airport,
                        preferredAirlines: user.preferred_airlines || [],
                        flightClass: user.flight_class,
                        preferredHotelBrands: user.preferred_hotel_brands || [],
                        rentalCarPreference: user.rental_car_preference,
                        rewardPrograms: user.reward_programs || [],
                        rewardProgramMemberships: user.reward_program_memberships || []
                    }
                }
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get current user information (for 2FA and other components)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query(`
            SELECT 
                id, email, first_name, last_name, phone, street_address, city, state, zip_code, country, created_at,
                is_2fa_enabled, needs_onboarding
            FROM users 
            WHERE id = $1
        `, [req.user.id]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = userResult.rows[0];
        
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone,
                    streetAddress: user.street_address,
                    city: user.city,
                    state: user.state,
                    zipCode: user.zip_code,
                    country: user.country,
                    createdAt: user.created_at,
                    is2faEnabled: user.is_2fa_enabled,
                    needsOnboarding: user.needs_onboarding
                }
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get current user',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get travel preferences
router.get('/travel-preferences', authenticateToken, async (req, res) => {
    try {
        const preferencesResult = await pool.query(`
            SELECT 
                primary_airport, preferred_airlines, flight_class,
                preferred_hotel_brands, rental_car_preference, reward_programs, reward_program_memberships
            FROM travel_preferences
            WHERE user_id = $1
        `, [req.user.id]);
        
        if (preferencesResult.rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    preferences: {
                        primaryAirport: null,
                        preferredAirlines: [],
                        flightClass: null,
                        preferredHotelBrands: [],
                        rentalCarPreference: null,
                        rewardPrograms: [],
                        rewardProgramMemberships: []
                    }
                }
            });
        }
        
        const preferences = preferencesResult.rows[0];
        
        res.json({
            success: true,
            data: {
                preferences: {
                    primaryAirport: preferences.primary_airport,
                    preferredAirlines: preferences.preferred_airlines || [],
                    flightClass: preferences.flight_class,
                    preferredHotelBrands: preferences.preferred_hotel_brands || [],
                    rentalCarPreference: preferences.rental_car_preference,
                    rewardPrograms: preferences.reward_programs || [],
                    rewardProgramMemberships: preferences.reward_program_memberships || []
                }
            }
        });
    } catch (error) {
        console.error('Get travel preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get travel preferences',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update travel preferences
router.put('/travel-preferences', authenticateToken, validateUpdateProfile, async (req, res) => {
    try {
        const {
            primaryAirport,
            preferredAirlines,
            flightClass,
            preferredHotelBrands,
            rentalCarPreference,
            rewardPrograms,
            preferredDestinations,
            rewardProgramMemberships
        } = req.body;
        
        await pool.query(`
            INSERT INTO travel_preferences 
            (user_id, primary_airport, preferred_airlines, flight_class, 
             preferred_hotel_brands, rental_car_preference, 
             reward_programs, preferred_destinations, reward_program_memberships)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (user_id) 
            DO UPDATE SET
                primary_airport = EXCLUDED.primary_airport,
                preferred_airlines = EXCLUDED.preferred_airlines,
                flight_class = EXCLUDED.flight_class,
                preferred_hotel_brands = EXCLUDED.preferred_hotel_brands,
                rental_car_preference = EXCLUDED.rental_car_preference,
                reward_programs = EXCLUDED.reward_programs,
                preferred_destinations = EXCLUDED.preferred_destinations,
                reward_program_memberships = EXCLUDED.reward_program_memberships,
                updated_at = CURRENT_TIMESTAMP
        `, [req.user.id, primaryAirport, preferredAirlines, flightClass,
             preferredHotelBrands, rentalCarPreference, 
             rewardPrograms, JSON.stringify(preferredDestinations), rewardProgramMemberships]);
        
        res.json({
            success: true,
            message: 'Travel preferences updated successfully'
        });
    } catch (error) {
        console.error('Update travel preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update travel preferences',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Add user interests
router.post('/interests', authenticateToken, async (req, res) => {
    try {
        const { interestType, interestValue, priority } = req.body;
        
        if (!interestType || !interestValue) {
            return res.status(400).json({
                success: false,
                message: 'Interest type and value are required'
            });
        }
        
        // Validate interest type
        const validTypes = ['artist', 'genre', 'venue', 'city', 'playlist'];
        if (!validTypes.includes(interestType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid interest type. Must be one of: artist, genre, venue, city, playlist'
            });
        }
        
        // Check if interest already exists for this user
        const existingInterest = await pool.query(`
            SELECT id FROM user_interests 
            WHERE user_id = $1 AND interest_type = $2 AND interest_value = $3
        `, [req.user.id, interestType, interestValue]);
        
        if (existingInterest.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This interest already exists in your list'
            });
        }
        
        await pool.query(`
            INSERT INTO user_interests (user_id, interest_type, interest_value, priority)
            VALUES ($1, $2, $3, $4)
        `, [req.user.id, interestType, interestValue, priority || 1]);
        
        res.status(201).json({
            success: true,
            message: 'Interest added successfully'
        });
    } catch (error) {
        console.error('Add interest error:', error);
        
        // Check if it's a unique constraint violation
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'This interest already exists in your list'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to add interest',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get user interests
router.get('/interests', authenticateToken, async (req, res) => {
    try {
        const interestsResult = await pool.query(`
            SELECT id, interest_type, interest_value, priority, created_at
            FROM user_interests
            WHERE user_id = $1
            ORDER BY priority ASC, created_at DESC
        `, [req.user.id]);
        
        res.json({
            success: true,
            data: {
                interests: interestsResult.rows
            }
        });
    } catch (error) {
        console.error('Get interests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get interests',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Delete user interest
router.delete('/interests/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            DELETE FROM user_interests
            WHERE id = $1 AND user_id = $2
        `, [id, req.user.id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Interest not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Interest deleted successfully'
        });
    } catch (error) {
        console.error('Delete interest error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete interest',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Bulk update interest priorities for drag-and-drop operations
router.put('/interests/bulk-priority', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { updates } = req.body; // Array of { id: number, priority: number }
        
        // Validate request structure
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Updates array is required and must not be empty',
                error: 'INVALID_REQUEST_FORMAT'
            });
        }
        
        // Validate each update
        for (let i = 0; i < updates.length; i++) {
            const update = updates[i];
            if (!update.id || !update.priority || 
                typeof update.id !== 'number' || typeof update.priority !== 'number' ||
                update.id <= 0 || update.priority < 1 || update.priority > 1000) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid update at index ${i}: id and priority must be positive numbers between 1 and 1000`,
                    error: 'INVALID_UPDATE_DATA'
                });
            }
        }
        
        // Check for duplicate priorities
        const priorities = updates.map(u => u.priority);
        const uniquePriorities = new Set(priorities);
        if (uniquePriorities.size !== priorities.length) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate priorities are not allowed',
                error: 'DUPLICATE_PRIORITIES'
            });
        }
        
        // Start transaction
        await client.query('BEGIN');
        
        // Verify all interests exist and belong to user
        const interestIds = updates.map(u => u.id);
        const interestCheck = await client.query(`
            SELECT id, interest_type, interest_value, priority 
            FROM user_interests 
            WHERE id = ANY($1) AND user_id = $2
        `, [interestIds, req.user.id]);
        
        if (interestCheck.rows.length !== interestIds.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'One or more interests not found or do not belong to user',
                error: 'INTERESTS_NOT_FOUND'
            });
        }
        
        // Update all priorities
        const results = [];
        for (const update of updates) {
            const result = await client.query(`
                UPDATE user_interests 
                SET priority = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND user_id = $3
                RETURNING id, priority, updated_at
            `, [update.priority, update.id, req.user.id]);
            
            if (result.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(500).json({
                    success: false,
                    message: `Failed to update interest ${update.id}`,
                    error: 'UPDATE_FAILED'
                });
            }
            
            results.push(result.rows[0]);
        }
        
        // Commit transaction
        await client.query('COMMIT');

        // Invalidate user cache to refresh trip suggestions
        await tripSuggestionEngine.invalidateUserCache(req.user.id);

        // Log the bulk update
        console.log(`Bulk interest priority update: User ${req.user.id}, Updated ${results.length} interests`);
        
        res.json({
            success: true,
            message: `Successfully updated ${results.length} interest priorities`,
            data: {
                updatedCount: results.length,
                updates: results.map(r => ({
                    id: r.id,
                    priority: r.priority,
                    updatedAt: r.updated_at
                }))
            }
        });
        
    } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        
        console.error('Bulk update interest priority error:', error);
        
        // Handle specific database errors
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Priority conflict - duplicate priorities detected',
                error: 'PRIORITY_CONFLICT'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update interest priorities',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            errorCode: error.code || 'UNKNOWN_ERROR'
        });
    } finally {
        client.release();
    }
});

// Update interest priority with enhanced error handling and validation
router.put('/interests/:id', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { priority } = req.body;
        const interestId = parseInt(req.params.id);
        
        // Enhanced validation
        if (!interestId || isNaN(interestId) || interestId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid interest ID',
                error: 'INTEREST_ID_INVALID'
            });
        }
        
        if (typeof priority !== 'number' || priority < 1 || priority > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Priority must be a number between 1 and 1000',
                error: 'PRIORITY_INVALID'
            });
        }

        // Start transaction
        await client.query('BEGIN');
        
        // Verify interest exists and belongs to user
        const interestCheck = await client.query(`
            SELECT id, interest_type, interest_value, priority 
            FROM user_interests 
            WHERE id = $1 AND user_id = $2
        `, [interestId, req.user.id]);

        if (interestCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Interest not found or does not belong to user',
                error: 'INTEREST_NOT_FOUND'
            });
        }

        const currentInterest = interestCheck.rows[0];
        
        // Check if priority is actually changing
        if (currentInterest.priority === priority) {
            await client.query('ROLLBACK');
            return res.json({
                success: true,
                message: 'Priority unchanged',
                data: { priority: currentInterest.priority }
            });
        }

        // Update the interest priority
        const updateResult = await client.query(`
            UPDATE user_interests 
            SET priority = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3
            RETURNING id, priority, updated_at
        `, [priority, interestId, req.user.id]);

        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(500).json({
                success: false,
                message: 'Failed to update interest priority',
                error: 'UPDATE_FAILED'
            });
        }

        // Commit transaction
        await client.query('COMMIT');

        // Invalidate user cache to refresh trip suggestions
        await tripSuggestionEngine.invalidateUserCache(req.user.id);

        // Log the update for debugging
        console.log(`Interest priority updated: User ${req.user.id}, Interest ${interestId}, Priority ${currentInterest.priority} -> ${priority}`);

        res.json({
            success: true,
            message: 'Interest priority updated successfully',
            data: {
                id: updateResult.rows[0].id,
                priority: updateResult.rows[0].priority,
                updatedAt: updateResult.rows[0].updated_at,
                previousPriority: currentInterest.priority
            }
        });
        
    } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        
        console.error('Update interest priority error:', error);
        
        // Handle specific database errors
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({
                success: false,
                message: 'Priority conflict - another interest already has this priority',
                error: 'PRIORITY_CONFLICT'
            });
        }
        
        if (error.code === '23503') { // Foreign key violation
            return res.status(400).json({
                success: false,
                message: 'Invalid interest reference',
                error: 'FOREIGN_KEY_VIOLATION'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update interest priority',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            errorCode: error.code || 'UNKNOWN_ERROR'
        });
    } finally {
        client.release();
    }
});

// Update personal information
router.put('/personal-info', authenticateToken, validateUpdateProfile, async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            phone,
            streetAddress,
            city,
            state,
            zipCode,
            country
        } = req.body;
        
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        
        if (firstName !== undefined) {
            updateFields.push(`first_name = $${paramCount++}`);
            values.push(firstName);
        }
        if (lastName !== undefined) {
            updateFields.push(`last_name = $${paramCount++}`);
            values.push(lastName);
        }
        if (phone !== undefined) {
            updateFields.push(`phone = $${paramCount++}`);
            values.push(phone);
        }
        if (streetAddress !== undefined) {
            updateFields.push(`street_address = $${paramCount++}`);
            values.push(streetAddress);
        }
        if (city !== undefined) {
            updateFields.push(`city = $${paramCount++}`);
            values.push(city);
        }
        if (state !== undefined) {
            updateFields.push(`state = $${paramCount++}`);
            values.push(state);
        }
        if (zipCode !== undefined) {
            updateFields.push(`zip_code = $${paramCount++}`);
            values.push(zipCode);
        }
        if (country !== undefined) {
            updateFields.push(`country = $${paramCount++}`);
            values.push(country);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(req.user.id);
        
        const query = `
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, email, first_name, last_name, phone, street_address, city, state, zip_code, country, created_at, updated_at
        `;
        
        const result = await pool.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = result.rows[0];
        
        res.json({
            success: true,
            message: 'Personal information updated successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    phone: user.phone,
                    streetAddress: user.street_address,
                    city: user.city,
                    state: user.state,
                    zipCode: user.zip_code,
                    country: user.country,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at
                }
            }
        });
    } catch (error) {
        console.error('Update personal info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update personal information',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName, lastName, phone, addressLine1, addressLine2,
      city, state, zipCode, country
    } = req.body;

    // Update user basic info
    await pool.query(
      `UPDATE users SET
        first_name = $1,
        last_name = $2,
        phone = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4`,
      [firstName, lastName, phone, userId]
    );

    // Handle address information
    if (addressLine1 || addressLine2 || city || state || zipCode || country) {
      // Check if user already has a primary address
      const existingAddress = await pool.query(
        'SELECT id FROM user_addresses WHERE user_id = $1 AND is_primary = true',
        [userId]
      );

      if (existingAddress.rows.length > 0) {
        // Update existing primary address
        await pool.query(
          `UPDATE user_addresses SET
            address_line1 = $1,
            address_line2 = $2,
            city = $3,
            state = $4,
            zip_code = $5,
            country = $6
          WHERE user_id = $7 AND is_primary = true`,
          [addressLine1 || '', addressLine2 || '', city || '', state || '', zipCode || '', country || 'USA', userId]
        );
      } else {
        // Create new primary address
        await pool.query(
          `INSERT INTO user_addresses (user_id, address_line1, address_line2, city, state, zip_code, country, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
          [userId, addressLine1 || '', addressLine2 || '', city || '', state || '', zipCode || '', country || 'USA']
        );
      }
    }

    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// Mark onboarding as complete
router.put('/onboarding-complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update user to mark onboarding as complete
    await pool.query(
      'UPDATE users SET needs_onboarding = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    res.json({ 
      success: true, 
      message: 'Onboarding completed successfully',
      data: {
        user: {
          needsOnboarding: false
        }
      }
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark onboarding as complete' });
  }
});

module.exports = router;