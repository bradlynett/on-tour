#!/usr/bin/env node

/**
 * Automated Artist Metadata Population Script
 * 
 * This script automatically populates artist metadata from multiple sources:
 * - Spotify (primary source for popularity and current data)
 * - MusicBrainz (comprehensive biographical and discography data)
 * - Last.fm (community-driven tags and similar artists)
 * 
 * Usage:
 *   node populate-artist-metadata.js [options]
 * 
 * Options:
 *   --limit <number>     Number of artists to process (default: 50)
 *   --source <source>    Specific source to use: spotify, musicbrainz, lastfm, unified (default: unified)
 *   --force              Force refresh existing metadata
 *   --dry-run           Show what would be done without making changes
 *   --stats             Show metadata statistics only
 */

const { pool } = require('../config/database');
const UnifiedMetadataService = require('../services/unifiedMetadataService');
const ArtistMetadataService = require('../services/artistMetadataService');
const MusicBrainzService = require('../services/musicBrainzService');
const LastfmService = require('../services/lastfmService');

class MetadataPopulator {
    constructor() {
        this.unifiedService = UnifiedMetadataService;
        this.spotifyService = ArtistMetadataService;
        this.musicBrainzService = MusicBrainzService;
        this.lastfmService = LastfmService;
    }

    // Parse command line arguments
    parseArgs() {
        const args = process.argv.slice(2);
        const options = {
            limit: 50,
            source: 'unified',
            force: false,
            dryRun: false,
            stats: false
        };

        for (let i = 0; i < args.length; i++) {
            switch (args[i]) {
                case '--limit':
                    options.limit = parseInt(args[++i]) || 50;
                    break;
                case '--source':
                    options.source = args[++i] || 'unified';
                    break;
                case '--force':
                    options.force = true;
                    break;
                case '--dry-run':
                    options.dryRun = true;
                    break;
                case '--stats':
                    options.stats = true;
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
🎵 Artist Metadata Population Script

This script automatically populates artist metadata from multiple sources.

Usage:
  node populate-artist-metadata.js [options]

Options:
  --limit <number>     Number of artists to process (default: 50)
  --source <source>    Specific source to use: spotify, musicbrainz, lastfm, unified (default: unified)
  --force              Force refresh existing metadata
  --dry-run           Show what would be done without making changes
  --stats             Show metadata statistics only
  --help              Show this help message

Examples:
  node populate-artist-metadata.js --limit 100 --source unified
  node populate-artist-metadata.js --source spotify --dry-run
  node populate-artist-metadata.js --stats
        `);
    }

    // Get artists that need metadata
    async getArtistsNeedingMetadata(limit, force = false) {
        try {
            let query = `
                SELECT DISTINCT e.artist 
                FROM events e
                WHERE e.artist IS NOT NULL 
                AND e.artist != ''
                AND e.artist != 'Unknown'
            `;

            if (!force) {
                query += `
                    AND NOT EXISTS (
                        SELECT 1 FROM artist_metadata am 
                        WHERE LOWER(e.artist) = am.normalized_name
                    )
                `;
            }

            query += `
                ORDER BY e.event_date DESC
                LIMIT $1
            `;

            const result = await pool.query(query, [limit]);
            return result.rows.map(row => row.artist);
        } catch (error) {
            console.error('❌ Failed to get artists needing metadata:', error);
            return [];
        }
    }

    // Get artists with existing metadata
    async getArtistsWithMetadata(limit) {
        try {
            const result = await pool.query(`
                SELECT artist_name, metadata_sources, popularity_score, updated_at
                FROM artist_metadata 
                ORDER BY updated_at DESC
                LIMIT $1
            `, [limit]);

            return result.rows;
        } catch (error) {
            console.error('❌ Failed to get artists with metadata:', error);
            return [];
        }
    }

    // Populate metadata using specified source
    async populateMetadata(artistNames, source, dryRun = false) {
        console.log(`🔄 Starting metadata population for ${artistNames.length} artists using ${source}`);
        
        const results = {
            success: [],
            errors: [],
            skipped: []
        };

        for (let i = 0; i < artistNames.length; i++) {
            const artistName = artistNames[i];
            console.log(`\n🎵 [${i + 1}/${artistNames.length}] Processing: ${artistName}`);

            try {
                let metadata = null;

                switch (source) {
                    case 'spotify':
                        metadata = await this.spotifyService.enrichArtistMetadataFromSpotify(artistName);
                        break;
                    case 'musicbrainz':
                        metadata = await this.musicBrainzService.getComprehensiveArtistMetadata(artistName);
                        break;
                    case 'lastfm':
                        metadata = await this.lastfmService.getComprehensiveArtistMetadata(artistName);
                        break;
                    case 'unified':
                        metadata = await this.unifiedService.getMetadataWithFallback(artistName);
                        break;
                    default:
                        throw new Error(`Unknown source: ${source}`);
                }

                if (metadata) {
                    if (dryRun) {
                        console.log(`  ✅ Would save metadata for: ${artistName}`);
                        results.success.push({ artist: artistName, metadata });
                    } else {
                        const saved = await this.spotifyService.upsertArtistMetadata(metadata);
                        if (saved) {
                            console.log(`  ✅ Saved metadata for: ${artistName}`);
                            results.success.push({ artist: artistName, metadata: saved });
                        } else {
                            console.log(`  ⚠️ Failed to save metadata for: ${artistName}`);
                            results.errors.push({ artist: artistName, error: 'Failed to save' });
                        }
                    }
                } else {
                    console.log(`  ⚠️ No metadata found for: ${artistName}`);
                    results.skipped.push({ artist: artistName, reason: 'No metadata found' });
                }

                // Rate limiting between requests
                if (i < artistNames.length - 1) {
                    const delay = source === 'musicbrainz' ? 2000 : 1000;
                    console.log(`  ⏳ Waiting ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

            } catch (error) {
                console.error(`  ❌ Error processing ${artistName}:`, error.message);
                results.errors.push({ artist: artistName, error: error.message });
            }
        }

        return results;
    }

    // Show metadata statistics
    async showStatistics() {
        console.log('\n📊 Artist Metadata Statistics\n');

        try {
            const stats = await this.unifiedService.getMetadataStatistics();
            
            if (stats) {
                console.log(`Total Artists with Metadata: ${stats.total_artists}`);
                console.log(`\nData Sources:`);
                console.log(`  Spotify: ${stats.with_spotify}`);
                console.log(`  MusicBrainz: ${stats.with_musicbrainz}`);
                console.log(`  Last.fm: ${stats.with_lastfm}`);
                console.log(`  Multiple Sources: ${stats.with_multiple_sources}`);
                
                console.log(`\nQuality Distribution:`);
                console.log(`  Excellent (80-100): ${stats.quality_distribution.excellent}`);
                console.log(`  Good (60-79): ${stats.quality_distribution.good}`);
                console.log(`  Fair (40-59): ${stats.quality_distribution.fair}`);
                console.log(`  Poor (0-39): ${stats.quality_distribution.poor}`);
                
                console.log(`\nAverage Quality Score: ${stats.average_quality}/100`);
                
                if (stats.total_artists > 0) {
                    const coveragePercent = Math.round((stats.total_artists / stats.total_artists) * 100);
                    console.log(`Coverage: ${coveragePercent}%`);
                }
            } else {
                console.log('❌ Failed to get statistics');
            }

            // Show recent metadata
            console.log('\n📋 Recent Metadata Updates:');
            const recent = await this.getArtistsWithMetadata(10);
            recent.forEach((artist, index) => {
                const sources = artist.metadata_sources || [];
                const sourceStr = sources.length > 0 ? sources.join(', ') : 'none';
                console.log(`  ${index + 1}. ${artist.artist_name} (${sourceStr}) - Score: ${artist.popularity_score}`);
            });

        } catch (error) {
            console.error('❌ Failed to show statistics:', error);
        }
    }

    // Show what would be processed (dry run)
    async showDryRun(artistNames, source) {
        console.log(`\n🔍 Dry Run - Would process ${artistNames.length} artists using ${source}:`);
        
        artistNames.forEach((artist, index) => {
            console.log(`  ${index + 1}. ${artist}`);
        });

        console.log(`\nTotal: ${artistNames.length} artists would be processed`);
        console.log('Use --force to actually process these artists');
    }

    // Main execution method
    async run() {
        try {
            const options = this.parseArgs();

            console.log('🎵 Artist Metadata Population Script');
            console.log('=====================================\n');

            // Show statistics only
            if (options.stats) {
                await this.showStatistics();
                return;
            }

            // Get artists to process
            const artistNames = await this.getArtistsNeedingMetadata(options.limit, options.force);
            
            if (artistNames.length === 0) {
                console.log('✅ No artists need metadata population');
                if (!options.force) {
                    console.log('Use --force to refresh existing metadata');
                }
                return;
            }

            // Show dry run
            if (options.dryRun) {
                await this.showDryRun(artistNames, options.source);
                return;
            }

            // Populate metadata
            const results = await this.populateMetadata(artistNames, options.source, options.dryRun);

            // Show results
            console.log('\n📊 Population Results:');
            console.log(`  ✅ Success: ${results.success.length}`);
            console.log(`  ❌ Errors: ${results.errors.length}`);
            console.log(`  ⚠️ Skipped: ${results.skipped.length}`);
            console.log(`  📈 Total: ${artistNames.length}`);

            if (results.errors.length > 0) {
                console.log('\n❌ Errors:');
                results.errors.forEach(error => {
                    console.log(`  - ${error.artist}: ${error.error}`);
                });
            }

            if (results.skipped.length > 0) {
                console.log('\n⚠️ Skipped:');
                results.skipped.forEach(skip => {
                    console.log(`  - ${skip.artist}: ${skip.reason}`);
                });
            }

            // Show updated statistics
            console.log('\n📊 Updated Statistics:');
            await this.showStatistics();

        } catch (error) {
            console.error('❌ Script failed:', error);
            process.exit(1);
        } finally {
            await pool.end();
        }
    }
}

// Run the script
if (require.main === module) {
    const populator = new MetadataPopulator();
    populator.run().catch(error => {
        console.error('❌ Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = MetadataPopulator; 