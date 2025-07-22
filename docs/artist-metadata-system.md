# Artist Metadata System

## Overview

The Artist Metadata System is a comprehensive solution for storing, managing, and utilizing detailed artist information to enhance the Concert Travel App's recommendation engine. It provides rich metadata including genres, popularity metrics, social media presence, and biographical information to improve artist matching and trip suggestions.

## Features

### 1. Comprehensive Artist Information
- **Basic Info**: Name, country, language, active years
- **Musical Data**: Genres, record labels, Spotify/Apple Music IDs
- **Social Metrics**: Follower counts, monthly listeners, popularity scores
- **Digital Presence**: Social media handles, official websites, YouTube channels
- **Biographical Data**: Artist bios, awards, collaborations, tour history
- **Media Assets**: Profile images, album covers, official photos

### 2. Advanced Search and Discovery
- **Genre-Based Search**: Find artists by musical genres
- **Similar Artist Discovery**: Algorithm-based artist recommendations
- **Popularity Rankings**: Trending and popular artists by genre/country
- **Multi-Criteria Search**: Complex queries with filters
- **Fuzzy Matching**: Intelligent name matching with variations

### 3. Enhanced Trip Suggestions
- **Metadata-Enhanced Scoring**: Artist popularity and genre matching
- **Genre-Based Recommendations**: Suggest artists based on user genre interests
- **Similar Artist Suggestions**: Recommend related artists for discovery
- **Trending Integration**: Include trending artists in suggestions

### 4. Performance Optimization
- **Intelligent Caching**: 5-minute cache for frequently accessed metadata
- **Database Indexing**: Optimized queries with proper indexes
- **Batch Operations**: Efficient bulk metadata operations
- **Connection Pooling**: Optimized database connections

## Database Schema

### Artist Metadata Table
```sql
CREATE TABLE artist_metadata (
    id SERIAL PRIMARY KEY,
    artist_name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL UNIQUE,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Views and Functions
- **artist_search_view**: Combined view with aliases for easy searching
- **search_artists_by_genre()**: Function for genre-based artist search
- **Automatic triggers**: Update timestamps on record changes

## API Reference

### ArtistMetadataService

#### Core Methods

##### `getArtistMetadata(artistName)`
Retrieves comprehensive metadata for an artist.

**Parameters:**
- `artistName` (string): Artist name to look up

**Returns:**
```javascript
{
    id: number,
    artist_name: string,
    normalized_name: string,
    genres: string[],
    popularity_score: number,
    followers_count: number,
    monthly_listeners: number,
    country: string,
    language: string,
    active_since: number,
    record_label: string,
    social_media: object,
    spotify_id: string,
    apple_music_id: string,
    youtube_channel_id: string,
    wikipedia_url: string,
    official_website: string,
    biography: string,
    awards: object,
    collaborations: object,
    tour_history: object,
    latest_release: object,
    image_urls: object,
    tags: string[],
    verified: boolean,
    created_at: string,
    updated_at: string
}
```

##### `searchArtistsByGenre(genre, limit = 20)`
Finds artists by musical genre.

**Parameters:**
- `genre` (string): Genre to search for
- `limit` (number): Maximum number of results

**Returns:** Array of artist objects with match scores

##### `getSimilarArtists(artistName, limit = 10)`
Finds artists similar to the specified artist.

**Parameters:**
- `artistName` (string): Base artist name
- `limit` (number): Maximum number of results

**Returns:** Array of similar artists with similarity scores

##### `getPopularArtistsByGenre(genre, limit = 20)`
Gets the most popular artists in a specific genre.

**Parameters:**
- `genre` (string): Genre to search
- `limit` (number): Maximum number of results

**Returns:** Array of popular artists sorted by popularity

##### `upsertArtistMetadata(metadata)`
Creates or updates artist metadata.

**Parameters:**
- `metadata` (object): Complete artist metadata object

**Returns:** Updated artist metadata object

##### `getArtistRecommendations(userInterests, limit = 10)`
Generates artist recommendations based on user interests.

**Parameters:**
- `userInterests` (array): Array of user interest objects
- `limit` (number): Maximum number of recommendations

**Returns:** Array of recommended artists with recommendation scores

#### Advanced Methods

##### `searchArtists(criteria)`
Advanced search with multiple criteria.

**Parameters:**
```javascript
{
    query: string,           // Text search
    genres: string[],        // Genre filters
    minPopularity: number,   // Minimum popularity score
    maxPopularity: number,   // Maximum popularity score
    country: string,         // Country filter
    language: string,        // Language filter
    limit: number           // Result limit
}
```

##### `getTrendingArtists(limit = 20)`
Gets currently trending artists.

##### `getArtistsByCountry(country, limit = 20)`
Gets artists from a specific country.

##### `getGenreStatistics()`
Gets statistics about genres and artist counts.

##### `updatePopularityScore(artistName, popularityScore)`
Updates an artist's popularity score.

##### `addArtistTags(artistName, tags)`
Adds tags to an artist's metadata.

#### Utility Methods

##### `normalizeArtistName(artistName)`
Normalizes artist names for consistent storage.

##### `clearCache()`
Clears the metadata cache.

##### `getCacheStats()`
Gets cache statistics.

## Integration with Trip Suggestions

### Enhanced Matching Algorithm

The artist metadata system integrates with the trip suggestion engine to provide more accurate and relevant recommendations:

```javascript
// Enhanced artist match scoring with metadata
async calculateArtistMatchScoreWithMetadata(interestValue, eventArtist, priority = 1) {
    const baseScore = this.calculateArtistMatchScore(interestValue, eventArtist, priority);
    
    // Get metadata for both interest and event artist
    const interestMetadata = await ArtistMetadataService.getArtistMetadata(interestValue);
    const eventArtistMetadata = await ArtistMetadataService.getArtistMetadata(eventArtist);
    
    let metadataBonus = 0;
    
    // Genre matching bonus
    if (interestMetadata && eventArtistMetadata && interestMetadata.genres && eventArtistMetadata.genres) {
        const genreOverlap = interestMetadata.genres.filter(genre => 
            eventArtistMetadata.genres.includes(genre)
        );
        
        if (genreOverlap.length > 0) {
            metadataBonus += genreOverlap.length * 10;
        }
    }
    
    // Popularity bonus
    if (eventArtistMetadata && eventArtistMetadata.popularity_score) {
        metadataBonus += Math.floor(eventArtistMetadata.popularity_score * 0.1);
    }
    
    // Verified artist bonus
    if (eventArtistMetadata && eventArtistMetadata.verified) {
        metadataBonus += 5;
    }
    
    return Math.round(baseScore + metadataBonus);
}
```

### Metadata-Enhanced Prioritization

Events are prioritized using metadata information:

```javascript
// Metadata-based artist scoring
if (event.artist) {
    const artistMetadata = await ArtistMetadataService.getArtistMetadata(event.artist);
    if (artistMetadata) {
        // Popularity bonus
        if (artistMetadata.popularity_score) {
            score += Math.floor(artistMetadata.popularity_score * 0.2);
        }
        
        // Genre matching with user interests
        if (artistMetadata.genres && userInterests) {
            const genreInterests = userInterests.filter(interest => 
                interest.interest_type === 'genre'
            );
            
            genreInterests.forEach(genreInterest => {
                if (artistMetadata.genres.includes(genreInterest.interest_value)) {
                    score += 20 * genreInterest.priority;
                }
            });
        }
        
        // Verified artist bonus
        if (artistMetadata.verified) {
            score += 10;
        }
    }
}
```

## Usage Examples

### Basic Metadata Retrieval
```javascript
const ArtistMetadataService = require('./services/artistMetadataService');

// Get artist metadata
const metadata = await ArtistMetadataService.getArtistMetadata('Taylor Swift');
console.log(`${metadata.artist_name}: ${metadata.genres.join(', ')} (${metadata.popularity_score})`);
```

### Genre-Based Search
```javascript
// Find pop artists
const popArtists = await ArtistMetadataService.searchArtistsByGenre('Pop', 10);
popArtists.forEach(artist => {
    console.log(`${artist.artist_name} (${artist.popularity_score})`);
});
```

### Similar Artist Discovery
```javascript
// Find artists similar to Drake
const similarArtists = await ArtistMetadataService.getSimilarArtists('Drake', 5);
similarArtists.forEach(artist => {
    console.log(`${artist.artist_name} (Similarity: ${artist.similarity_score})`);
});
```

### Artist Recommendations
```javascript
const userInterests = [
    { interest_type: 'artist', interest_value: 'Taylor Swift', priority: 1 },
    { interest_type: 'genre', interest_value: 'Pop', priority: 2 }
];

const recommendations = await ArtistMetadataService.getArtistRecommendations(userInterests, 10);
recommendations.forEach(artist => {
    console.log(`${artist.artist_name} (Score: ${artist.recommendation_score})`);
});
```

### Advanced Search
```javascript
const searchResults = await ArtistMetadataService.searchArtists({
    query: 'Taylor',
    genres: ['Pop'],
    minPopularity: 80,
    country: 'United States',
    limit: 10
});
```

### Metadata Management
```javascript
// Create or update artist metadata
const metadata = {
    artist_name: 'New Artist',
    genres: ['Pop', 'R&B'],
    popularity_score: 85,
    followers_count: 5000000,
    country: 'United States',
    biography: 'A talented new artist...'
};

const result = await ArtistMetadataService.upsertArtistMetadata(metadata);

// Update popularity
await ArtistMetadataService.updatePopularityScore('New Artist', 90);

// Add tags
await ArtistMetadataService.addArtistTags('New Artist', 'rising-star');
```

## Performance Considerations

### Caching Strategy
- **Cache Duration**: 5 minutes for frequently accessed metadata
- **Cache Keys**: Based on normalized artist names
- **Cache Invalidation**: Automatic on metadata updates
- **Memory Management**: LRU-style cache with size limits

### Database Optimization
- **Indexes**: Optimized for common query patterns
- **JSONB**: Efficient storage for complex metadata
- **Array Operations**: Fast genre and tag searches
- **Connection Pooling**: Efficient database connections

### Scalability
- **Horizontal Scaling**: Stateless service design
- **Load Balancing**: Multiple service instances
- **Database Sharding**: Future-ready for large datasets
- **CDN Integration**: Image and media asset delivery

## Testing

### Running Tests
```powershell
# Run comprehensive metadata tests
.\scripts\test-artist-metadata.ps1
```

### Test Coverage
- Basic metadata operations
- Search and discovery functionality
- Integration with trip suggestions
- Performance and caching
- Error handling and edge cases

## Future Enhancements

### Planned Features
1. **Machine Learning Integration**: AI-powered artist similarity
2. **Real-time Updates**: Live popularity and trend data
3. **Social Media Integration**: Automated metadata updates
4. **Multi-language Support**: International artist data
5. **Advanced Analytics**: Detailed artist performance metrics

### External API Integration
- **Spotify Web API**: Real-time artist data
- **Last.fm API**: Genre and tag information
- **MusicBrainz**: Comprehensive artist databases
- **Social Media APIs**: Live follower counts and engagement

## Troubleshooting

### Common Issues

#### Missing Metadata
- Check if artist exists in database
- Verify normalized name matching
- Review data import processes

#### Performance Issues
- Monitor cache hit rates
- Check database query performance
- Review indexing strategy

#### Search Accuracy
- Verify genre data quality
- Check popularity score calculations
- Review similarity algorithms

### Debug Mode
Enable detailed logging for troubleshooting:

```javascript
// Enable debug logging
console.log('Metadata lookup:', artistName);
console.log('Cache stats:', ArtistMetadataService.getCacheStats());
```

## Contributing

When adding new metadata features:

1. **Add Tests**: Include comprehensive test coverage
2. **Update Documentation**: Document new methods and features
3. **Performance Testing**: Ensure new features don't impact performance
4. **Data Validation**: Validate metadata quality and consistency

## Version History

### v1.0.0 (Current)
- Initial implementation of artist metadata system
- Comprehensive metadata storage and retrieval
- Genre-based search and recommendations
- Integration with trip suggestion engine
- Caching and performance optimization
- Complete test suite and documentation 