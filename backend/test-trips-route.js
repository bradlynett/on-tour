const { pool } = require('./config/database');
const jwt = require('jsonwebtoken');

async function testTripsRoute() {
    try {
        console.log('Testing trips route...');
        
        // First, get a valid user ID
        const userResult = await pool.query('SELECT id FROM users LIMIT 1');
        if (userResult.rows.length === 0) {
            console.log('❌ No users found in database');
            return;
        }
        
        const userId = userResult.rows[0].id;
        console.log('Using user ID:', userId);
        
        // Create a mock JWT token
        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback-secret');
        console.log('Created JWT token');
        
        // Simulate the exact query from the trips route
        const { status, page = 1, limit = 10 } = {};
        
        let query = `
            SELECT ts.*, e.name as event_name, e.artist, e.venue_name, e.venue_city, 
                   e.venue_state, e.event_date, e.ticket_url
            FROM trip_suggestions ts
            JOIN events e ON ts.event_id = e.id
            WHERE ts.user_id = $1
        `;
        const params = [userId];
        let paramCount = 1;

        if (status) {
            paramCount++;
            query += ` AND ts.status = $${paramCount}`;
            params.push(status);
        }

        // Get total count for pagination
        const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
        console.log('Count query:', countQuery);
        console.log('Count params:', params);
        
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        console.log('Total count:', total);

        // Add pagination
        const offset = (page - 1) * limit;
        paramCount++;
        query += ` ORDER BY ts.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(parseInt(limit), offset);
        
        console.log('Main query:', query);
        console.log('Main params:', params);

        const result = await pool.query(query, params);
        console.log('Main query result count:', result.rows.length);
        
        // Get components for each suggestion
        const suggestions = [];
        for (const suggestion of result.rows) {
            console.log(`Getting components for suggestion ${suggestion.id}...`);
            const componentsResult = await pool.query(`
                SELECT component_type, provider, price, details, booking_reference
                FROM trip_components
                WHERE trip_suggestion_id = $1
                ORDER BY component_type
            `, [suggestion.id]);
            
            console.log(`Found ${componentsResult.rows.length} components for suggestion ${suggestion.id}`);
            suggestion.components = componentsResult.rows;
            suggestions.push(suggestion);
        }

        console.log('✅ Success! Final suggestions count:', suggestions.length);
        
        const response = {
            success: true,
            data: {
                suggestions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        };
        
        console.log('Response structure:', JSON.stringify(response, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error testing trips route:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testTripsRoute(); 