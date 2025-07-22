require('dotenv').config();
const { pool } = require('../config/database');

async function checkAllUsersSpotify() {
    try {
        console.log('🔍 Checking all users and their Spotify data...\n');
        
        // Get all users
        const usersResult = await pool.query(`
            SELECT id, email, first_name, last_name, created_at
            FROM users
            ORDER BY id
        `);
        
        console.log('📋 All Users:');
        usersResult.rows.forEach(user => {
            console.log(`   ID: ${user.id} | ${user.first_name} ${user.last_name} | ${user.email}`);
        });
        
        console.log('\n🎵 Spotify Tokens:');
        const tokensResult = await pool.query(`
            SELECT user_id, created_at, updated_at
            FROM spotify_tokens
            ORDER BY user_id
        `);
        
        if (tokensResult.rows.length === 0) {
            console.log('   No Spotify tokens found');
        } else {
            tokensResult.rows.forEach(token => {
                console.log(`   User ID: ${token.user_id} | Created: ${token.created_at} | Updated: ${token.updated_at}`);
            });
        }
        
        console.log('\n📊 Spotify Data:');
        const dataResult = await pool.query(`
            SELECT user_id, created_at, updated_at
            FROM spotify_data
            ORDER BY user_id
        `);
        
        if (dataResult.rows.length === 0) {
            console.log('   No Spotify data found');
        } else {
            dataResult.rows.forEach(data => {
                console.log(`   User ID: ${data.user_id} | Created: ${data.created_at} | Updated: ${data.updated_at}`);
            });
        }
        
        // Check for mismatches
        console.log('\n🔍 Checking for mismatches...');
        
        // Users with tokens but no data
        const tokensOnlyResult = await pool.query(`
            SELECT st.user_id, u.email
            FROM spotify_tokens st
            LEFT JOIN spotify_data sd ON st.user_id = sd.user_id
            LEFT JOIN users u ON st.user_id = u.id
            WHERE sd.user_id IS NULL
        `);
        
        if (tokensOnlyResult.rows.length > 0) {
            console.log('⚠️  Users with tokens but no data:');
            tokensOnlyResult.rows.forEach(row => {
                console.log(`   User ID: ${row.user_id} | Email: ${row.email}`);
            });
        }
        
        // Users with data but no tokens
        const dataOnlyResult = await pool.query(`
            SELECT sd.user_id, u.email
            FROM spotify_data sd
            LEFT JOIN spotify_tokens st ON sd.user_id = st.user_id
            LEFT JOIN users u ON sd.user_id = u.id
            WHERE st.user_id IS NULL
        `);
        
        if (dataOnlyResult.rows.length > 0) {
            console.log('⚠️  Users with data but no tokens:');
            dataOnlyResult.rows.forEach(row => {
                console.log(`   User ID: ${row.user_id} | Email: ${row.email}`);
            });
        }
        
        // Check if user 24 has both tokens and data
        console.log('\n🎯 Specific check for User 24 (Christy):');
        const user24Tokens = await pool.query('SELECT COUNT(*) as count FROM spotify_tokens WHERE user_id = 24');
        const user24Data = await pool.query('SELECT COUNT(*) as count FROM spotify_data WHERE user_id = 24');
        
        console.log(`   Has tokens: ${user24Tokens.rows[0].count > 0 ? '✅ Yes' : '❌ No'}`);
        console.log(`   Has data: ${user24Data.rows[0].count > 0 ? '✅ Yes' : '❌ No'}`);
        
        if (user24Data.rows[0].count > 0) {
            const user24DataDetails = await pool.query(`
                SELECT music_data->>'userProfile' as profile
                FROM spotify_data 
                WHERE user_id = 24
                ORDER BY updated_at DESC
                LIMIT 1
            `);
            
            if (user24DataDetails.rows.length > 0) {
                try {
                    const profile = JSON.parse(user24DataDetails.rows[0].profile);
                    console.log(`   Spotify profile: ${profile.display_name} (${profile.email})`);
                } catch (e) {
                    console.log('   Could not parse profile data');
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkAllUsersSpotify(); 