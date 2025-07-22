const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            apiCalls: {
                single: { count: 0, totalTime: 0, avgTime: 0 },
                bulk: { count: 0, totalTime: 0, avgTime: 0 }
            },
            database: {
                queries: { count: 0, totalTime: 0, avgTime: 0 },
                transactions: { count: 0, totalTime: 0, avgTime: 0 }
            },
            errors: {
                validation: 0,
                database: 0,
                network: 0,
                other: 0
            },
            performance: {
                startTime: Date.now(),
                lastReset: Date.now()
            }
        };
        
        this.logFile = path.join(__dirname, '../logs/performance-metrics.json');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    startTimer() {
        return process.hrtime.bigint();
    }

    endTimer(startTime) {
        const endTime = process.hrtime.bigint();
        return Number(endTime - startTime) / 1000000; // Convert to milliseconds
    }

    recordApiCall(type, duration, success = true) {
        const metric = this.metrics.apiCalls[type];
        if (metric) {
            metric.count++;
            metric.totalTime += duration;
            metric.avgTime = metric.totalTime / metric.count;
        }
        
        if (!success) {
            this.metrics.errors.other++;
        }
        
        this.logMetric('api_call', { type, duration, success });
    }

    recordDatabaseQuery(duration, success = true) {
        this.metrics.database.queries.count++;
        this.metrics.database.queries.totalTime += duration;
        this.metrics.database.queries.avgTime = this.metrics.database.queries.totalTime / this.metrics.database.queries.count;
        
        if (!success) {
            this.metrics.errors.database++;
        }
        
        this.logMetric('database_query', { duration, success });
    }

    recordTransaction(duration, success = true) {
        this.metrics.database.transactions.count++;
        this.metrics.database.transactions.totalTime += duration;
        this.metrics.database.transactions.avgTime = this.metrics.database.transactions.totalTime / this.metrics.database.transactions.count;
        
        this.logMetric('transaction', { duration, success });
    }

    recordError(type, error) {
        if (this.metrics.errors[type] !== undefined) {
            this.metrics.errors[type]++;
        }
        
        this.logMetric('error', { type, message: error.message, stack: error.stack });
    }

    logMetric(type, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type,
            data
        };
        
        try {
            fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('Failed to write performance log:', error);
        }
    }

    getMetrics() {
        const uptime = Date.now() - this.metrics.performance.startTime;
        const timeSinceReset = Date.now() - this.metrics.performance.lastReset;
        
        return {
            ...this.metrics,
            uptime: {
                total: uptime,
                sinceReset: timeSinceReset
            },
            summary: this.generateSummary()
        };
    }

    generateSummary() {
        const totalApiCalls = this.metrics.apiCalls.single.count + this.metrics.apiCalls.bulk.count;
        const totalErrors = Object.values(this.metrics.errors).reduce((sum, count) => sum + count, 0);
        const errorRate = totalApiCalls > 0 ? (totalErrors / totalApiCalls * 100).toFixed(2) : 0;
        
        return {
            totalApiCalls,
            totalErrors,
            errorRate: `${errorRate}%`,
            avgApiResponseTime: {
                single: this.metrics.apiCalls.single.avgTime.toFixed(2) + 'ms',
                bulk: this.metrics.apiCalls.bulk.avgTime.toFixed(2) + 'ms'
            },
            avgDatabaseQueryTime: this.metrics.database.queries.avgTime.toFixed(2) + 'ms',
            avgTransactionTime: this.metrics.database.transactions.avgTime.toFixed(2) + 'ms'
        };
    }

    resetMetrics() {
        this.metrics = {
            apiCalls: {
                single: { count: 0, totalTime: 0, avgTime: 0 },
                bulk: { count: 0, totalTime: 0, avgTime: 0 }
            },
            database: {
                queries: { count: 0, totalTime: 0, avgTime: 0 },
                transactions: { count: 0, totalTime: 0, avgTime: 0 }
            },
            errors: {
                validation: 0,
                database: 0,
                network: 0,
                other: 0
            },
            performance: {
                startTime: this.metrics.performance.startTime,
                lastReset: Date.now()
            }
        };
        
        console.log('Performance metrics reset');
    }

    async generateReport() {
        const metrics = this.getMetrics();
        const report = {
            timestamp: new Date().toISOString(),
            metrics,
            recommendations: this.generateRecommendations(metrics)
        };
        
        const reportFile = path.join(__dirname, '../logs/performance-report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        console.log('Performance report generated:', reportFile);
        return report;
    }

    generateRecommendations(metrics) {
        const recommendations = [];
        
        // API Performance Recommendations
        if (metrics.apiCalls.single.avgTime > 100) {
            recommendations.push({
                type: 'performance',
                severity: 'warning',
                message: 'Single interest update API calls are slow (>100ms). Consider optimizing database queries.',
                metric: `Avg time: ${metrics.apiCalls.single.avgTime.toFixed(2)}ms`
            });
        }
        
        if (metrics.apiCalls.bulk.avgTime > 200) {
            recommendations.push({
                type: 'performance',
                severity: 'warning',
                message: 'Bulk interest update API calls are slow (>200ms). Consider batch processing optimization.',
                metric: `Avg time: ${metrics.apiCalls.bulk.avgTime.toFixed(2)}ms`
            });
        }
        
        // Database Performance Recommendations
        if (metrics.database.queries.avgTime > 50) {
            recommendations.push({
                type: 'database',
                severity: 'warning',
                message: 'Database queries are slow (>50ms). Consider adding indexes or optimizing queries.',
                metric: `Avg query time: ${metrics.database.queries.avgTime.toFixed(2)}ms`
            });
        }
        
        // Error Rate Recommendations
        if (metrics.summary.errorRate > 5) {
            recommendations.push({
                type: 'reliability',
                severity: 'critical',
                message: 'High error rate detected (>5%). Investigate error patterns and improve error handling.',
                metric: `Error rate: ${metrics.summary.errorRate}`
            });
        }
        
        // Transaction Performance
        if (metrics.database.transactions.avgTime > 100) {
            recommendations.push({
                type: 'database',
                severity: 'warning',
                message: 'Database transactions are slow (>100ms). Consider transaction optimization.',
                metric: `Avg transaction time: ${metrics.database.transactions.avgTime.toFixed(2)}ms`
            });
        }
        
        return recommendations;
    }

    // Middleware for Express
    middleware() {
        return (req, res, next) => {
            const startTime = this.startTimer();
            
            // Override res.json to capture response time
            const originalJson = res.json;
            res.json = function(data) {
                const duration = this.endTimer(startTime);
                const success = res.statusCode < 400;
                
                if (req.path.includes('/interests/')) {
                    if (req.path.includes('/bulk-priority')) {
                        this.recordApiCall('bulk', duration, success);
                    } else if (req.method === 'PUT') {
                        this.recordApiCall('single', duration, success);
                    }
                }
                
                return originalJson.call(this, data);
            }.bind(this);
            
            next();
        };
    }
}

// Database query monitoring
const originalQuery = pool.query;
pool.query = function(...args) {
    const monitor = global.performanceMonitor;
    if (monitor) {
        const startTime = monitor.startTimer();
        
        return originalQuery.apply(this, args)
            .then(result => {
                const duration = monitor.endTimer(startTime);
                monitor.recordDatabaseQuery(duration, true);
                return result;
            })
            .catch(error => {
                const duration = monitor.endTimer(startTime);
                monitor.recordDatabaseQuery(duration, false);
                monitor.recordError('database', error);
                throw error;
            });
    }
    
    return originalQuery.apply(this, args);
};

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();
global.performanceMonitor = performanceMonitor;

module.exports = performanceMonitor;

// CLI interface for monitoring
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'status':
            console.log('Current Performance Metrics:');
            console.log(JSON.stringify(performanceMonitor.getMetrics(), null, 2));
            break;
            
        case 'report':
            performanceMonitor.generateReport()
                .then(report => {
                    console.log('Performance Report Generated');
                    console.log(JSON.stringify(report, null, 2));
                })
                .catch(console.error);
            break;
            
        case 'reset':
            performanceMonitor.resetMetrics();
            break;
            
        default:
            console.log('Performance Monitor CLI');
            console.log('Usage:');
            console.log('  node performance-monitor.js status  - Show current metrics');
            console.log('  node performance-monitor.js report  - Generate performance report');
            console.log('  node performance-monitor.js reset   - Reset metrics');
            break;
    }
} 