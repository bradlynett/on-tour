// Database migration system
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

class MigrationSystem {
    constructor() {
        this.migrationsPath = path.join(__dirname, 'migrations');
        this.migrationsTable = 'database_migrations';
    }

    async initialize() {
        // Create migrations tracking table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INTEGER,
                status VARCHAR(50) DEFAULT 'success'
            )
        `);
    }

    async getAppliedMigrations() {
        const result = await pool.query(`
            SELECT migration_name FROM ${this.migrationsTable} 
            WHERE status = 'success' 
            ORDER BY applied_at ASC
        `);
        return result.rows.map(row => row.migration_name);
    }

    async getMigrationFiles() {
        if (!fs.existsSync(this.migrationsPath)) {
            return [];
        }

        const files = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Natural sort order

        return files;
    }

    async runMigration(migrationFile) {
        const startTime = Date.now();
        const migrationPath = path.join(this.migrationsPath, migrationFile);
        
        try {
            console.log(`🔄 Running migration: ${migrationFile}`);
            
            // Read migration file
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            // Split into individual statements
            const statements = this.parseSQLStatements(migrationSQL);
            
            // Execute each statement
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                if (statement.trim()) {
                    try {
                        await pool.query(statement);
                    } catch (error) {
                        // Handle expected errors (like "already exists")
                        if (this.isExpectedError(error)) {
                            console.log(`  ⚠️  Statement ${i + 1} skipped: ${error.message.split('\n')[0]}`);
                        } else {
                            throw error;
                        }
                    }
                }
            }
            
            const executionTime = Date.now() - startTime;
            
            // Record successful migration
            await pool.query(`
                INSERT INTO ${this.migrationsTable} (migration_name, execution_time_ms, status)
                VALUES ($1, $2, 'success')
                ON CONFLICT (migration_name) DO UPDATE SET
                    applied_at = CURRENT_TIMESTAMP,
                    execution_time_ms = $2,
                    status = 'success'
            `, [migrationFile, executionTime]);
            
            console.log(`✅ Migration completed: ${migrationFile} (${executionTime}ms)`);
            return true;
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            // Record failed migration
            await pool.query(`
                INSERT INTO ${this.migrationsTable} (migration_name, execution_time_ms, status)
                VALUES ($1, $2, 'failed')
                ON CONFLICT (migration_name) DO UPDATE SET
                    applied_at = CURRENT_TIMESTAMP,
                    execution_time_ms = $2,
                    status = 'failed'
            `, [migrationFile, executionTime]);
            
            console.error(`❌ Migration failed: ${migrationFile}`);
            console.error(`   Error: ${error.message}`);
            return false;
        }
    }

    parseSQLStatements(sql) {
        // Split SQL into statements, handling multi-line statements properly
        const statements = [];
        let currentStatement = '';
        let inString = false;
        let stringChar = '';
        let inDollarQuote = false;
        let dollarQuoteTag = '';
        let inComment = false;
        let commentType = '';
        
        for (let i = 0; i < sql.length; i++) {
            const char = sql[i];
            const nextChar = sql[i + 1] || '';
            
            // Handle comments
            if (!inString && !inDollarQuote && !inComment) {
                if (char === '-' && nextChar === '-') {
                    inComment = true;
                    commentType = 'line';
                    i++; // Skip next dash
                    continue;
                } else if (char === '/' && nextChar === '*') {
                    inComment = true;
                    commentType = 'block';
                    i++; // Skip next char
                    continue;
                }
            }
            
            // Handle end of comments
            if (inComment) {
                if (commentType === 'line' && char === '\n') {
                    inComment = false;
                    commentType = '';
                } else if (commentType === 'block' && char === '*' && nextChar === '/') {
                    inComment = false;
                    commentType = '';
                    i++; // Skip next char
                }
                continue;
            }
            
            // Handle dollar-quoted strings
            if (!inString && !inDollarQuote && char === '$') {
                // Look ahead to find the dollar quote tag
                let tagStart = i + 1;
                let tagEnd = sql.indexOf('$', tagStart);
                if (tagEnd !== -1) {
                    dollarQuoteTag = sql.substring(tagStart, tagEnd);
                    inDollarQuote = true;
                    i = tagEnd; // Move to the end of the opening tag
                    continue;
                }
            } else if (inDollarQuote) {
                // Look for closing dollar quote
                const closingTag = '$' + dollarQuoteTag + '$';
                if (sql.substring(i, i + closingTag.length) === closingTag) {
                    inDollarQuote = false;
                    dollarQuoteTag = '';
                    i += closingTag.length - 1; // Move to the end of the closing tag
                }
            }
            
            // Handle regular string literals (only if not in dollar quote)
            if (!inDollarQuote && !inString && (char === "'" || char === '"')) {
                inString = true;
                stringChar = char;
            } else if (!inDollarQuote && inString && char === stringChar) {
                // Check for escaped quotes
                if (sql[i - 1] !== '\\') {
                    inString = false;
                    stringChar = '';
                }
            }
            
            // Add character to current statement
            if (!inComment) {
                currentStatement += char;
            }
            
            // Check for statement end
            if (!inString && !inDollarQuote && char === ';') {
                const trimmed = currentStatement.trim();
                if (trimmed) {
                    statements.push(trimmed);
                }
                currentStatement = '';
            }
        }
        
        // Add any remaining statement
        const trimmed = currentStatement.trim();
        if (trimmed) {
            statements.push(trimmed);
        }
        
        return statements.filter(stmt => stmt.length > 0);
    }

    isExpectedError(error) {
        const expectedErrors = [
            'already exists',
            'duplicate key',
            'relation "artist_metadata" does not exist', // For DROP statements
            'does not exist'
        ];
        
        return expectedErrors.some(expected => 
            error.message.toLowerCase().includes(expected.toLowerCase())
        );
    }

    async runAllMigrations() {
        try {
            console.log('🚀 Starting database migrations...\n');
            
            await this.initialize();
            
            const appliedMigrations = await this.getAppliedMigrations();
            const migrationFiles = await this.getMigrationFiles();
            
            console.log(`Found ${migrationFiles.length} migration files`);
            console.log(`Applied migrations: ${appliedMigrations.length}\n`);
            
            let successCount = 0;
            let failureCount = 0;
            
            for (const migrationFile of migrationFiles) {
                if (!appliedMigrations.includes(migrationFile)) {
                    const success = await this.runMigration(migrationFile);
                    if (success) {
                        successCount++;
                    } else {
                        failureCount++;
                        // Continue with other migrations even if one fails
                    }
                } else {
                    console.log(`⏭️  Skipping already applied migration: ${migrationFile}`);
                }
            }
            
            console.log(`\n📊 Migration Summary:`);
            console.log(`   ✅ Successful: ${successCount}`);
            console.log(`   ❌ Failed: ${failureCount}`);
            console.log(`   ⏭️  Skipped: ${appliedMigrations.length}`);
            
            if (failureCount === 0) {
                console.log('\n🎉 All migrations completed successfully!');
            } else {
                console.log('\n⚠️  Some migrations failed. Check the logs above.');
            }
            
            return failureCount === 0;
            
        } catch (error) {
            console.error('❌ Migration system error:', error);
            return false;
        }
    }

    async getMigrationStatus() {
        await this.initialize();
        
        const appliedMigrations = await this.getAppliedMigrations();
        const migrationFiles = await this.getMigrationFiles();
        
        console.log('📋 Migration Status:\n');
        
        for (const migrationFile of migrationFiles) {
            const isApplied = appliedMigrations.includes(migrationFile);
            const status = isApplied ? '✅ Applied' : '⏳ Pending';
            console.log(`   ${status} ${migrationFile}`);
        }
        
        console.log(`\nTotal: ${migrationFiles.length} migrations`);
        console.log(`Applied: ${appliedMigrations.length}`);
        console.log(`Pending: ${migrationFiles.length - appliedMigrations.length}`);
    }
}

// CLI interface
async function main() {
    const migrationSystem = new MigrationSystem();
    const command = process.argv[2] || 'run';
    
    try {
        switch (command) {
            case 'run':
                await migrationSystem.runAllMigrations();
                break;
            case 'status':
                await migrationSystem.getMigrationStatus();
                break;
            default:
                console.log('Usage: node migrate.js [run|status]');
                console.log('  run    - Run all pending migrations');
                console.log('  status - Show migration status');
        }
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = MigrationSystem; 