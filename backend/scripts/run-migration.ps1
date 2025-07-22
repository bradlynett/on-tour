# Database Migration Script - Runs all migrations in order

Write-Host "Running all database migrations..." -ForegroundColor Green

# Database connection details
$DB_HOST = "localhost"
$DB_PORT = "5433"
$DB_NAME = "concert_travel"
$DB_USER = "postgres"
$DB_PASSWORD = "password"

# Path to migrations
$MIGRATIONS_PATH = "database\migrations"

# Get all .sql files in order
$MIGRATION_FILES = Get-ChildItem -Path $MIGRATIONS_PATH -Filter *.sql | Sort-Object Name

foreach ($file in $MIGRATION_FILES) {
    Write-Host "Applying migration: $($file.Name)" -ForegroundColor Yellow
    $MIGRATION_SQL = Get-Content $file.FullName -Raw

    try {
        $env:PGPASSWORD = $DB_PASSWORD
        $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $file.FullName 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Migration $($file.Name) applied successfully!" -ForegroundColor Green
        } else {
            Write-Host "Migration $($file.Name) failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host "Error output: $result" -ForegroundColor Red
            break
        }
    } catch {
        Write-Host "Error running migration $($file.Name): $_" -ForegroundColor Red
        break
    } finally {
        $env:PGPASSWORD = ""
    }
}

Write-Host "All migrations completed." -ForegroundColor Green