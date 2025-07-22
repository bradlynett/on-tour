-- Migration: Create artist_metadata table
-- This table stores comprehensive artist information for enhanced matching and recommendations

-- Step 1: Create the main table
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
    active_since INTEGER, -- Year the artist became active
    record_label VARCHAR(255),
    social_media JSONB, -- Instagram, Twitter, TikTok, etc.
    spotify_id VARCHAR(255),
    apple_music_id VARCHAR(255),
    youtube_channel_id VARCHAR(255),
    wikipedia_url TEXT,
    official_website TEXT,
    biography TEXT,
    awards JSONB, -- Grammy nominations, Billboard awards, etc.
    collaborations JSONB, -- Frequent collaborators
    tour_history JSONB, -- Recent tour information
    latest_release JSONB, -- Most recent album/single info
    image_urls JSONB, -- Profile images, album covers
    tags TEXT[], -- User-generated tags
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(normalized_name)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_artist_metadata_artist_name ON artist_metadata(artist_name);
CREATE INDEX IF NOT EXISTS idx_artist_metadata_normalized_name ON artist_metadata(normalized_name);
CREATE INDEX IF NOT EXISTS idx_artist_metadata_popularity ON artist_metadata(popularity_score);
CREATE INDEX IF NOT EXISTS idx_artist_metadata_genres ON artist_metadata USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_artist_metadata_tags ON artist_metadata USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_artist_metadata_spotify_id ON artist_metadata(spotify_id);
CREATE INDEX IF NOT EXISTS idx_artist_metadata_created_at ON artist_metadata(created_at);

-- Step 3: Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_artist_metadata_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Step 4: Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_artist_metadata_updated_at ON artist_metadata;
CREATE TRIGGER trigger_update_artist_metadata_updated_at
    BEFORE UPDATE ON artist_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_artist_metadata_updated_at();

-- Step 5: Insert initial artist metadata
INSERT INTO artist_metadata (
    artist_name, 
    normalized_name, 
    genres, 
    popularity_score, 
    followers_count, 
    country, 
    language, 
    active_since, 
    record_label, 
    social_media, 
    spotify_id, 
    biography, 
    verified
) VALUES
    (
        'Taylor Swift',
        'taylor swift',
        ARRAY['Pop', 'Country', 'Folk', 'Alternative'],
        95,
        50000000,
        'United States',
        'English',
        2006,
        'Republic Records',
        '{"instagram": "taylorswift", "twitter": "taylorswift13", "tiktok": "taylorswift"}',
        '06HL4z0CvFAxyc27GXpf02',
        'Taylor Swift is an American singer-songwriter who has become one of the most successful and influential artists in music history.',
        true
    ),
    (
        'Drake',
        'drake',
        ARRAY['Hip Hop', 'R&B', 'Pop', 'Trap'],
        98,
        65000000,
        'Canada',
        'English',
        2006,
        'OVO Sound',
        '{"instagram": "champagnepapi", "twitter": "Drake"}',
        '3TVXtAsR1Inumwj472S9r4',
        'Drake is a Canadian rapper, singer, and actor who has become one of the most successful artists in hip-hop history.',
        true
    ),
    (
        'Beyoncé',
        'beyonce',
        ARRAY['R&B', 'Pop', 'Hip Hop', 'Soul'],
        97,
        45000000,
        'United States',
        'English',
        1997,
        'Parkwood Entertainment',
        '{"instagram": "beyonce", "twitter": "Beyonce"}',
        '6vWDO969PvNqNYHIOW5v0m',
        'Beyoncé is an American singer, songwriter, and actress who has been a dominant force in popular music for over two decades.',
        true
    ),
    (
        'Ed Sheeran',
        'ed sheeran',
        ARRAY['Pop', 'Folk', 'Acoustic', 'Singer-Songwriter'],
        92,
        40000000,
        'United Kingdom',
        'English',
        2004,
        'Atlantic Records',
        '{"instagram": "teddysphotos", "twitter": "edsheeran"}',
        '6eUKZXaKkcviH0Ku9w2n3V',
        'Ed Sheeran is an English singer-songwriter known for his acoustic sound and heartfelt lyrics.',
        true
    ),
    (
        'Bad Bunny',
        'bad bunny',
        ARRAY['Reggaeton', 'Latin Trap', 'Latin Pop', 'Urban'],
        96,
        55000000,
        'Puerto Rico',
        'Spanish',
        2016,
        'Rimas Entertainment',
        '{"instagram": "badbunnypr", "twitter": "sanbenito"}',
        '4q3ewBCX7sLwd24euuV69X',
        'Bad Bunny is a Puerto Rican rapper, singer, and songwriter who has revolutionized Latin music.',
        true
    ),
    (
        'The Weeknd',
        'the weeknd',
        ARRAY['R&B', 'Pop', 'Alternative R&B', 'Synth-pop'],
        94,
        48000000,
        'Canada',
        'English',
        2010,
        'XO Records',
        '{"instagram": "theweeknd", "twitter": "theweeknd"}',
        '1Xyo4u8uXC1ZmMpatF05PJ',
        'The Weeknd is a Canadian singer, songwriter, and record producer known for his distinctive voice and dark R&B sound.',
        true
    ),
    (
        'Post Malone',
        'post malone',
        ARRAY['Hip Hop', 'Pop', 'Rock', 'Trap'],
        93,
        52000000,
        'United States',
        'English',
        2015,
        'Republic Records',
        '{"instagram": "postmalone", "twitter": "PostMalone"}',
        '246dkjvS1zLTtiykXe5h60',
        'Post Malone is an American rapper, singer, and songwriter known for his genre-blending music style.',
        true
    ),
    (
        'Ariana Grande',
        'ariana grande',
        ARRAY['Pop', 'R&B', 'Dance', 'Soul'],
        91,
        38000000,
        'United States',
        'English',
        2008,
        'Republic Records',
        '{"instagram": "arianagrande", "twitter": "ArianaGrande"}',
        '66CXWjxzNUsdJxJ2JdwvnR',
        'Ariana Grande is an American singer and actress known for her powerful vocals and pop music.',
        true
    ),
    (
        'Kendrick Lamar',
        'kendrick lamar',
        ARRAY['Hip Hop', 'Rap', 'Conscious Hip Hop', 'West Coast Hip Hop'],
        89,
        35000000,
        'United States',
        'English',
        2003,
        'Top Dawg Entertainment',
        '{"instagram": "kendricklamar", "twitter": "kendricklamar"}',
        '2YZyLoL8N0Wb9xBt1NhZWg',
        'Kendrick Lamar is an American rapper, songwriter, and record producer known for his socially conscious lyrics.',
        true
    ),
    (
        'Lady Gaga',
        'lady gaga',
        ARRAY['Pop', 'Dance', 'Electronic', 'Art Pop'],
        88,
        32000000,
        'United States',
        'English',
        2001,
        'Interscope Records',
        '{"instagram": "ladygaga", "twitter": "ladygaga"}',
        '1HY2Jd0NmPuamShAr6KMms',
        'Lady Gaga is an American singer, songwriter, and actress known for her innovative music and fashion.',
        true
    )
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
    updated_at = CURRENT_TIMESTAMP; 