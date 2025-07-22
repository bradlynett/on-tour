#!/usr/bin/env node

/**
 * Test Script for Metadata Services
 * 
 * This script tests all metadata services to ensure they're working correctly:
 * - Spotify Artist API integration
 * - MusicBrainz API integration
 * - Last.fm API integration
 * - Unified metadata service
 * 
 * Usage:
 *   node test-metadata-services.js [options]
 * 
 * Options:
 *   --artist <name>     Test with specific artist name
 *   --source <source>   Test specific source: spotify, musicbrainz, lastfm, unified
 *   --all              Test all sources
 */

const UnifiedMetadataService = require('../services/unifiedMetadataService');
const ArtistMetadataService = require('../services/artistMetadataService');
const MusicBrainzService = require('../services/musicBrainzService');
const LastfmService = require('../services/lastfmService');

class MetadataServiceTester {
    constructor() {
        this.unifiedService = UnifiedMetadataService;
        this.spotifyService = ArtistMetadataService;
        this.musicBrainzService = MusicBrainzService;
        this.lastfmService = LastfmService;
        this.testArtists = [
            'Taylor Swift',
            'Ed Sheeran',
            'Drake',
            'Beyoncé',
            'Post Malone'
        ];
    }

    // Parse command line arguments
    parseArgs() {
        const args = process.argv.slice(2);
        const options = {
            artist: null,
            source: null,
            all: false
        };

        for (let i = 0; i < args.length; i++) {
            switch (args[i]) {
                case '--artist':
                    options.artist = args[++i];
                    break;
                case '--source':
                    options.source = args[++i];
                    break;
                case '--all':
                    options.all = true;
                    break;
                case '--help':
                    this.showHelp();
                    process.exit(0);
                    break;
            }
        }

        return options;
    }

    // Show help information
    showHelp() {
        console.log(`
🎵 Metadata Services Test Script

This script tests all metadata services to ensure they're working correctly.

Usage:
  node test-metadata-services.js [options]

Options:
  --artist <name>     Test with specific artist name
  --source <source>   Test specific source: spotify, musicbrainz, lastfm, unified
  --all              Test all sources with multiple artists
  --help             Show this help message

Examples:
  node test-metadata-services.js --artist "Taylor Swift"
  node test-metadata-services.js --source spotify
  node test-metadata-services.js --all
        `);
    }

    // Test Spotify service
    async testSpotifyService(artistName) {
        console.log(`\n🎵 Testing Spotify Service with: ${artistName}`);
        console.log('=' .repeat(50));

        try {
            // Test search
            console.log('1. Testing artist search...');
            const searchResult = await this.spotifyService.searchArtistOnSpotify(artistName);
            if (searchResult) {
                console.log(`   ✅ Found artist: ${searchResult.name} (ID: ${searchResult.id})`);
                console.log(`   📊 Popularity: ${searchResult.popularity}/100`);
                console.log(`   👥 Followers: ${searchResult.followers?.total || 'N/A'}`);
            } else {
                console.log('   ❌ Artist not found');
                return false;
            }

            // Test detailed info
            console.log('\n2. Testing detailed artist info...');
            const details = await this.spotifyService.getSpotifyArtistDetails(searchResult.id);
            if (details) {
                console.log(`   ✅ Got detailed info`);
                console.log(`   🎵 Genres: ${details.genres?.slice(0, 3).join(', ')}`);
                console.log(`   📀 Top tracks: ${details.top_tracks?.length || 0}`);
                console.log(`   💿 Albums: ${details.albums?.length || 0}`);
            } else {
                console.log('   ❌ Failed to get detailed info');
            }

            // Test metadata enrichment
            console.log('\n3. Testing metadata enrichment...');
            const enriched = await this.spotifyService.enrichArtistMetadataFromSpotify(artistName);
            if (enriched) {
                console.log(`   ✅ Enriched metadata created`);
                console.log(`   🏷️ Tags: ${enriched.tags?.length || 0}`);
                console.log(`   📈 Popularity score: ${enriched.popularity_score}`);
                console.log(`   🎵 Genres: ${enriched.genres?.slice(0, 3).join(', ')}`);
            } else {
                console.log('   ❌ Failed to enrich metadata');
            }

            return true;
        } catch (error) {
            console.error(`   ❌ Spotify service error:`, error.message);
            return false;
        }
    }

    // Test MusicBrainz service
    async testMusicBrainzService(artistName) {
        console.log(`\n🎵 Testing MusicBrainz Service with: ${artistName}`);
        console.log('=' .repeat(50));

        try {
            // Test search
            console.log('1. Testing artist search...');
            const searchResult = await this.musicBrainzService.searchArtist(artistName);
            if (searchResult) {
                console.log(`   ✅ Found artist: ${searchResult.name} (ID: ${searchResult.id})`);
                console.log(`   🌍 Country: ${searchResult.country || 'N/A'}`);
                console.log(`   🎭 Type: ${searchResult.type || 'N/A'}`);
            } else {
                console.log('   ❌ Artist not found');
                return false;
            }

            // Test detailed info
            console.log('\n2. Testing detailed artist info...');
            const details = await this.musicBrainzService.getArtistDetails(searchResult.id);
            if (details) {
                console.log(`   ✅ Got detailed info`);
                console.log(`   📅 Life span: ${details['life-span']?.begin || 'N/A'} - ${details['life-span']?.end || 'Present'}`);
                console.log(`   🏷️ Tags: ${details.tags?.length || 0}`);
            } else {
                console.log('   ❌ Failed to get detailed info');
            }

            // Test releases
            console.log('\n3. Testing artist releases...');
            const releases = await this.musicBrainzService.getArtistReleases(searchResult.id, 3);
            if (releases.length > 0) {
                console.log(`   ✅ Found ${releases.length} releases`);
                releases.slice(0, 2).forEach((release, index) => {
                    console.log(`   📀 ${index + 1}. ${release.title} (${release.date})`);
                });
            } else {
                console.log('   ⚠️ No releases found');
            }

            // Test comprehensive metadata
            console.log('\n4. Testing comprehensive metadata...');
            const comprehensive = await this.musicBrainzService.getComprehensiveArtistMetadata(artistName);
            if (comprehensive) {
                console.log(`   ✅ Comprehensive metadata created`);
                console.log(`   🏷️ Genres: ${comprehensive.genres?.slice(0, 3).join(', ')}`);
                console.log(`   📖 Biography: ${comprehensive.biography ? 'Available' : 'Not available'}`);
                console.log(`   🌐 Social media: ${Object.keys(comprehensive.social_media || {}).length} platforms`);
            } else {
                console.log('   ❌ Failed to create comprehensive metadata');
            }

            return true;
        } catch (error) {
            console.error(`   ❌ MusicBrainz service error:`, error.message);
            return false;
        }
    }

    // Test Last.fm service
    async testLastfmService(artistName) {
        console.log(`\n🎵 Testing Last.fm Service with: ${artistName}`);
        console.log('=' .repeat(50));

        try {
            // Test search
            console.log('1. Testing artist search...');
            const searchResult = await this.lastfmService.searchArtist(artistName);
            if (searchResult) {
                console.log(`   ✅ Found artist: ${searchResult.name}`);
                console.log(`   👥 Listeners: ${searchResult.listeners || 'N/A'}`);
                console.log(`   🎵 URL: ${searchResult.url}`);
            } else {
                console.log('   ❌ Artist not found');
                return false;
            }

            // Test artist info
            console.log('\n2. Testing artist info...');
            const info = await this.lastfmService.getArtistInfo(artistName);
            if (info) {
                console.log(`   ✅ Got artist info`);
                console.log(`   📊 Play count: ${info.stats?.playcount || 'N/A'}`);
                console.log(`   👥 Listeners: ${info.stats?.listeners || 'N/A'}`);
                console.log(`   📖 Bio: ${info.bio?.summary ? 'Available' : 'Not available'}`);
            } else {
                console.log('   ❌ Failed to get artist info');
            }

            // Test tags
            console.log('\n3. Testing artist tags...');
            const tags = await this.lastfmService.getArtistTags(artistName);
            if (tags.length > 0) {
                console.log(`   ✅ Found ${tags.length} tags`);
                tags.slice(0, 5).forEach((tag, index) => {
                    console.log(`   🏷️ ${index + 1}. ${tag.name} (${tag.count} votes)`);
                });
            } else {
                console.log('   ⚠️ No tags found');
            }

            // Test similar artists
            console.log('\n4. Testing similar artists...');
            const similar = await this.lastfmService.getSimilarArtists(artistName, 3);
            if (similar.length > 0) {
                console.log(`   ✅ Found ${similar.length} similar artists`);
                similar.slice(0, 3).forEach((artist, index) => {
                    console.log(`   🎵 ${index + 1}. ${artist.name} (${artist.match}% match)`);
                });
            } else {
                console.log('   ⚠️ No similar artists found');
            }

            // Test comprehensive metadata
            console.log('\n5. Testing comprehensive metadata...');
            const comprehensive = await this.lastfmService.getComprehensiveArtistMetadata(artistName);
            if (comprehensive) {
                console.log(`   ✅ Comprehensive metadata created`);
                console.log(`   🏷️ Genres: ${comprehensive.genres?.slice(0, 3).join(', ')}`);
                console.log(`   📈 Popularity score: ${comprehensive.popularity_score}`);
                console.log(`   👥 Followers: ${comprehensive.followers_count}`);
            } else {
                console.log('   ❌ Failed to create comprehensive metadata');
            }

            return true;
        } catch (error) {
            console.error(`   ❌ Last.fm service error:`, error.message);
            return false;
        }
    }

    // Test unified service
    async testUnifiedService(artistName) {
        console.log(`\n🎵 Testing Unified Metadata Service with: ${artistName}`);
        console.log('=' .repeat(50));

        try {
            // Test comprehensive metadata
            console.log('1. Testing comprehensive metadata...');
            const comprehensive = await this.unifiedService.getComprehensiveMetadata(artistName);
            if (comprehensive) {
                console.log(`   ✅ Comprehensive metadata created`);
                console.log(`   📊 Sources: ${comprehensive.metadata_sources?.join(', ')}`);
                console.log(`   🏷️ Genres: ${comprehensive.genres?.slice(0, 3).join(', ')}`);
                console.log(`   📈 Popularity score: ${comprehensive.popularity_score}`);
                console.log(`   👥 Followers: ${comprehensive.followers_count}`);
                console.log(`   🌍 Country: ${comprehensive.country || 'N/A'}`);
                console.log(`   📖 Biography: ${comprehensive.biography ? 'Available' : 'Not available'}`);
            } else {
                console.log('   ❌ Failed to create comprehensive metadata');
                return false;
            }

            // Test metadata with fallback
            console.log('\n2. Testing metadata with fallback...');
            const fallback = await this.unifiedService.getMetadataWithFallback(artistName);
            if (fallback) {
                console.log(`   ✅ Fallback metadata created`);
                console.log(`   📊 Sources: ${fallback.metadata_sources?.join(', ')}`);
            } else {
                console.log('   ❌ Failed to create fallback metadata');
            }

            // Test quality score
            console.log('\n3. Testing metadata quality...');
            const quality = this.unifiedService.calculateMetadataQuality(comprehensive);
            console.log(`   📊 Quality score: ${quality}/100`);
            
            let qualityLevel = 'Poor';
            if (quality >= 80) qualityLevel = 'Excellent';
            else if (quality >= 60) qualityLevel = 'Good';
            else if (quality >= 40) qualityLevel = 'Fair';
            
            console.log(`   🏆 Quality level: ${qualityLevel}`);

            return true;
        } catch (error) {
            console.error(`   ❌ Unified service error:`, error.message);
            return false;
        }
    }

    // Test specific source
    async testSource(source, artistName) {
        switch (source) {
            case 'spotify':
                return await this.testSpotifyService(artistName);
            case 'musicbrainz':
                return await this.testMusicBrainzService(artistName);
            case 'lastfm':
                return await this.testLastfmService(artistName);
            case 'unified':
                return await this.testUnifiedService(artistName);
            default:
                console.error(`❌ Unknown source: ${source}`);
                return false;
        }
    }

    // Test all sources with multiple artists
    async testAllSources() {
        console.log('🎵 Testing All Metadata Services');
        console.log('=' .repeat(50));

        const results = {
            spotify: { success: 0, total: 0 },
            musicbrainz: { success: 0, total: 0 },
            lastfm: { success: 0, total: 0 },
            unified: { success: 0, total: 0 }
        };

        for (const artist of this.testArtists) {
            console.log(`\n🎵 Testing artist: ${artist}`);
            
            for (const source of Object.keys(results)) {
                const success = await this.testSource(source, artist);
                results[source].total++;
                if (success) results[source].success++;
                
                // Rate limiting between tests
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Show summary
        console.log('\n📊 Test Results Summary');
        console.log('=' .repeat(50));
        
        Object.entries(results).forEach(([source, result]) => {
            const percentage = result.total > 0 ? Math.round((result.success / result.total) * 100) : 0;
            const status = result.success === result.total ? '✅' : result.success > 0 ? '⚠️' : '❌';
            console.log(`${status} ${source}: ${result.success}/${result.total} (${percentage}%)`);
        });
    }

    // Main execution
    async run() {
        try {
            const options = this.parseArgs();

            console.log('🎵 Metadata Services Test Script');
            console.log('===============================\n');

            if (options.artist) {
                // Test specific artist
                if (options.source) {
                    await this.testSource(options.source, options.artist);
                } else {
                    await this.testUnifiedService(options.artist);
                }
            } else if (options.all) {
                // Test all sources
                await this.testAllSources();
            } else {
                // Default: test unified service with first test artist
                await this.testUnifiedService(this.testArtists[0]);
            }

        } catch (error) {
            console.error('❌ Test failed:', error);
            process.exit(1);
        }
    }
}

// Run the test
if (require.main === module) {
    const tester = new MetadataServiceTester();
    tester.run().catch(error => {
        console.error('❌ Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = MetadataServiceTester; 