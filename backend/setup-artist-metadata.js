// Simple setup script for artist metadata system
const { pool } = require('./config/database');

async function setupArtistMetadata() {
    try {
        console.log('🎵 Setting up Artist Metadata System...\n');

        // Step 1: Create the artist_metadata table
        console.log('1. Creating artist_metadata table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS artist_metadata (
                id SERIAL PRIMARY KEY,
                artist_name VARCHAR(255) NOT NULL,
                normalized_name VARCHAR(255) NOT NULL,
                genres TEXT[],
                popularity_score INTEGER CHECK (popularity_score >= 0 AND popularity_score <= 100),
                followers_count BIGINT,
                monthly_listeners INTEGER,
                country VARCHAR(100),
                language VARCHAR(50),
                active_since INTEGER,
                record_label VARCHAR(255),
                social_media JSONB,
                spotify_id VARCHAR(255),
                apple_music_id VARCHAR(255),
                youtube_channel_id VARCHAR(255),
                wikipedia_url TEXT,
                official_website TEXT,
                biography TEXT,
                awards JSONB,
                collaborations JSONB,
                tour_history JSONB,
                latest_release JSONB,
                image_urls JSONB,
                tags TEXT[],
                verified BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(normalized_name)
            )
        `);
        console.log('✅ Table created successfully');

        // Step 2: Create indexes
        console.log('2. Creating indexes...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_artist_metadata_artist_name ON artist_metadata(artist_name)',
            'CREATE INDEX IF NOT EXISTS idx_artist_metadata_normalized_name ON artist_metadata(normalized_name)',
            'CREATE INDEX IF NOT EXISTS idx_artist_metadata_popularity ON artist_metadata(popularity_score)',
            'CREATE INDEX IF NOT EXISTS idx_artist_metadata_spotify_id ON artist_metadata(spotify_id)',
            'CREATE INDEX IF NOT EXISTS idx_artist_metadata_created_at ON artist_metadata(created_at)'
        ];

        for (const indexQuery of indexes) {
            await pool.query(indexQuery);
        }
        console.log('✅ Indexes created successfully');

        // Step 3: Create update trigger function
        console.log('3. Creating update trigger...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_artist_metadata_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        `);

        await pool.query(`
            DROP TRIGGER IF EXISTS trigger_update_artist_metadata_updated_at ON artist_metadata
        `);

        await pool.query(`
            CREATE TRIGGER trigger_update_artist_metadata_updated_at
                BEFORE UPDATE ON artist_metadata
                FOR EACH ROW
                EXECUTE FUNCTION update_artist_metadata_updated_at()
        `);
        console.log('✅ Update trigger created successfully');

        // Step 4: Insert sample artist data
        console.log('4. Inserting sample artist data...');
        const artists = [
            {
                name: 'Taylor Swift',
                normalized: 'taylor swift',
                genres: ['Pop', 'Country', 'Folk', 'Alternative'],
                popularity: 95,
                followers: 50000000,
                country: 'United States',
                language: 'English',
                active_since: 2006,
                record_label: 'Republic Records',
                social_media: { instagram: 'taylorswift', twitter: 'taylorswift13' },
                spotify_id: '06HL4z0CvFAxyc27GXpf02',
                biography: 'Taylor Swift is an American singer-songwriter who has become one of the most successful and influential artists in music history.',
                verified: true
            },
            {
                name: 'Drake',
                normalized: 'drake',
                genres: ['Hip Hop', 'R&B', 'Pop', 'Trap'],
                popularity: 98,
                followers: 65000000,
                country: 'Canada',
                language: 'English',
                active_since: 2006,
                record_label: 'OVO Sound',
                social_media: { instagram: 'champagnepapi', twitter: 'Drake' },
                spotify_id: '3TVXtAsR1Inumwj472S9r4',
                biography: 'Drake is a Canadian rapper, singer, and actor who has become one of the most successful artists in hip-hop history.',
                verified: true
            },
            {
                name: 'Beyoncé',
                normalized: 'beyonce',
                genres: ['R&B', 'Pop', 'Hip Hop', 'Soul'],
                popularity: 97,
                followers: 45000000,
                country: 'United States',
                language: 'English',
                active_since: 1997,
                record_label: 'Parkwood Entertainment',
                social_media: { instagram: 'beyonce', twitter: 'Beyonce' },
                spotify_id: '6vWDO969PvNqNYHIOW5v0m',
                biography: 'Beyoncé is an American singer, songwriter, and actress who has been a dominant force in popular music for over two decades.',
                verified: true
            },
            {
                name: 'Ed Sheeran',
                normalized: 'ed sheeran',
                genres: ['Pop', 'Folk', 'Acoustic', 'Singer-Songwriter'],
                popularity: 92,
                followers: 40000000,
                country: 'United Kingdom',
                language: 'English',
                active_since: 2004,
                record_label: 'Atlantic Records',
                social_media: { instagram: 'teddysphotos', twitter: 'edsheeran' },
                spotify_id: '6eUKZXaKkcviH0Ku9w2n3V',
                biography: 'Ed Sheeran is an English singer-songwriter known for his acoustic sound and heartfelt lyrics.',
                verified: true
            },
            {
                name: 'Bad Bunny',
                normalized: 'bad bunny',
                genres: ['Reggaeton', 'Latin Trap', 'Latin Pop', 'Urban'],
                popularity: 96,
                followers: 55000000,
                country: 'Puerto Rico',
                language: 'Spanish',
                active_since: 2016,
                record_label: 'Rimas Entertainment',
                social_media: { instagram: 'badbunnypr', twitter: 'sanbenito' },
                spotify_id: '4q3ewBCX7sLwd24euuV69X',
                biography: 'Bad Bunny is a Puerto Rican rapper, singer, and songwriter who has revolutionized Latin music.',
                verified: true
            }
        ];

        for (const artist of artists) {
            await pool.query(`
                INSERT INTO artist_metadata (
                    artist_name, normalized_name, genres, popularity_score, followers_count,
                    country, language, active_since, record_label, social_media, spotify_id, biography, verified
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (normalized_name) DO UPDATE SET
                    artist_name = EXCLUDED.artist_name,
                    genres = EXCLUDED.genres,
                    popularity_score = EXCLUDED.popularity_score,
                    followers_count = EXCLUDED.followers_count,
                    country = EXCLUDED.country,
                    language = EXCLUDED.language,
                    active_since = EXCLUDED.active_since,
                    record_label = EXCLUDED.record_label,
                    social_media = EXCLUDED.social_media,
                    spotify_id = EXCLUDED.spotify_id,
                    biography = EXCLUDED.biography,
                    verified = EXCLUDED.verified,
                    updated_at = CURRENT_TIMESTAMP
            `, [
                artist.name, artist.normalized, artist.genres, artist.popularity, artist.followers,
                artist.country, artist.language, artist.active_since, artist.record_label,
                JSON.stringify(artist.social_media), artist.spotify_id, artist.biography, artist.verified
            ]);
        }
        console.log(`✅ Inserted ${artists.length} artists successfully`);

        // Step 5: Verify the setup
        console.log('5. Verifying setup...');
        const countResult = await pool.query('SELECT COUNT(*) FROM artist_metadata');
        console.log(`✅ Found ${countResult.rows[0].count} artists in database`);

        const sampleResult = await pool.query('SELECT artist_name, genres, popularity_score FROM artist_metadata LIMIT 3');
        console.log('Sample artists:');
        sampleResult.rows.forEach((artist, i) => {
            console.log(`  ${i + 1}. ${artist.artist_name} - ${artist.genres?.join(', ')} (Popularity: ${artist.popularity_score})`);
        });

        console.log('\n🎉 Artist Metadata System setup completed successfully!');
        console.log('\nYou can now:');
        console.log('  • Run: node scripts/test-artist-metadata-simple.js');
        console.log('  • Use the enhanced trip suggestions with metadata');
        console.log('  • Get artist recommendations based on genres');
        console.log('  • Search artists by popularity and trends');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.error('Make sure your database is running and accessible.');
    } finally {
        await pool.end();
    }
}

// Run the setup
if (require.main === module) {
    setupArtistMetadata();
}

module.exports = { setupArtistMetadata }; 