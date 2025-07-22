const { redisClient } = require('../redisClient');
const logger = require('../utils/logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: new Map(),
      userInteractions: new Map(),
      pageLoads: new Map(),
      errors: new Map(),
      systemMetrics: new Map()
    };
    
    // Flush metrics to Redis every 5 minutes
    setInterval(() => this.flushMetrics(), 5 * 60 * 1000);
  }

  /**
   * Track API call performance
   */
  async trackApiCall(endpoint, duration, status, userId = null) {
    try {
      const timestamp = Date.now();
      const key = `api:${endpoint}`;
      
      // Store in memory for quick access
      if (!this.metrics.apiCalls.has(key)) {
        this.metrics.apiCalls.set(key, {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          statusCodes: {},
          lastCall: null
        });
      }

      const metric = this.metrics.apiCalls.get(key);
      metric.count++;
      metric.totalDuration += duration;
      metric.avgDuration = metric.totalDuration / metric.count;
      metric.minDuration = Math.min(metric.minDuration, duration);
      metric.maxDuration = Math.max(metric.maxDuration, duration);
      metric.lastCall = timestamp;

      // Track status codes
      if (!metric.statusCodes[status]) {
        metric.statusCodes[status] = 0;
      }
      metric.statusCodes[status]++;

      // Store in Redis for persistence
      await this.storeMetric('api_calls', key, {
        endpoint,
        duration,
        status,
        userId,
        timestamp
      });

      // Log slow API calls
      if (duration > 1000) { // Log calls taking more than 1 second
        logger.warn(`Slow API call detected: ${endpoint} took ${duration}ms`, {
          endpoint,
          duration,
          status,
          userId
        });
      }

    } catch (error) {
      logger.error('Error tracking API call:', error);
    }
  }

  /**
   * Track user interaction performance
   */
  async trackUserInteraction(action, duration, userId = null, metadata = {}) {
    try {
      const timestamp = Date.now();
      const key = `interaction:${action}`;

      if (!this.metrics.userInteractions.has(key)) {
        this.metrics.userInteractions.set(key, {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          lastInteraction: null
        });
      }

      const metric = this.metrics.userInteractions.get(key);
      metric.count++;
      metric.totalDuration += duration;
      metric.avgDuration = metric.totalDuration / metric.count;
      metric.minDuration = Math.min(metric.minDuration, duration);
      metric.maxDuration = Math.max(metric.maxDuration, duration);
      metric.lastInteraction = timestamp;

      await this.storeMetric('user_interactions', key, {
        action,
        duration,
        userId,
        metadata,
        timestamp
      });

    } catch (error) {
      logger.error('Error tracking user interaction:', error);
    }
  }

  /**
   * Track page load performance
   */
  async trackPageLoad(page, loadTime, userId = null, metadata = {}) {
    try {
      const timestamp = Date.now();
      const key = `page:${page}`;

      if (!this.metrics.pageLoads.has(key)) {
        this.metrics.pageLoads.set(key, {
          count: 0,
          totalLoadTime: 0,
          avgLoadTime: 0,
          minLoadTime: Infinity,
          maxLoadTime: 0,
          lastLoad: null
        });
      }

      const metric = this.metrics.pageLoads.get(key);
      metric.count++;
      metric.totalLoadTime += loadTime;
      metric.avgLoadTime = metric.totalLoadTime / metric.count;
      metric.minLoadTime = Math.min(metric.minLoadTime, loadTime);
      metric.maxLoadTime = Math.max(metric.maxLoadTime, loadTime);
      metric.lastLoad = timestamp;

      await this.storeMetric('page_loads', key, {
        page,
        loadTime,
        userId,
        metadata,
        timestamp
      });

      // Log slow page loads
      if (loadTime > 3000) { // Log pages taking more than 3 seconds
        logger.warn(`Slow page load detected: ${page} took ${loadTime}ms`, {
          page,
          loadTime,
          userId
        });
      }

    } catch (error) {
      logger.error('Error tracking page load:', error);
    }
  }

  /**
   * Track system metrics
   */
  async trackSystemMetrics() {
    try {
      const timestamp = Date.now();
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const systemMetrics = {
        memory: {
          rss: memUsage.rss,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: process.uptime(),
        timestamp
      };

      await this.storeMetric('system_metrics', 'current', systemMetrics);

      // Log high memory usage
      const memoryUsageMB = memUsage.heapUsed / 1024 / 1024;
      if (memoryUsageMB > 500) { // Log if using more than 500MB
        logger.warn(`High memory usage detected: ${Math.round(memoryUsageMB)}MB`, {
          memoryUsage: systemMetrics.memory
        });
      }

    } catch (error) {
      logger.error('Error tracking system metrics:', error);
    }
  }

  /**
   * Track errors
   */
  async trackError(error, context = {}) {
    try {
      const timestamp = Date.now();
      const errorType = error.name || 'UnknownError';
      const key = `error:${errorType}`;

      if (!this.metrics.errors.has(key)) {
        this.metrics.errors.set(key, {
          count: 0,
          lastError: null,
          contexts: []
        });
      }

      const metric = this.metrics.errors.get(key);
      metric.count++;
      metric.lastError = timestamp;
      metric.contexts.push({
        message: error.message,
        stack: error.stack,
        context,
        timestamp
      });

      // Keep only last 10 error contexts
      if (metric.contexts.length > 10) {
        metric.contexts = metric.contexts.slice(-10);
      }

      await this.storeMetric('errors', key, {
        errorType,
        message: error.message,
        stack: error.stack,
        context,
        timestamp
      });

    } catch (err) {
      logger.error('Error tracking error:', err);
    }
  }

  /**
   * Store metric in Redis
   */
  async storeMetric(category, key, data) {
    try {
      const redisKey = `metrics:${category}:${key}`;
      const timestamp = Date.now();
      
      // Store the metric data
      await redisClient.hSet(redisKey, {
        data: JSON.stringify(data),
        timestamp: timestamp.toString()
      });

      // Set expiration (keep metrics for 24 hours)
      await redisClient.expire(redisKey, 24 * 60 * 60);

      // Add to time series for trending
      const timeSeriesKey = `timeseries:${category}:${key}`;
      await redisClient.zAdd(timeSeriesKey, {
        score: timestamp,
        value: JSON.stringify(data)
      });

      // Keep time series for 7 days
      await redisClient.expire(timeSeriesKey, 7 * 24 * 60 * 60);

    } catch (error) {
      logger.error('Error storing metric in Redis:', error);
    }
  }

  /**
   * Get performance metrics
   */
  async getMetrics(category = null, timeRange = '1h') {
    try {
      const metrics = {};

      if (!category || category === 'api_calls') {
        metrics.apiCalls = Object.fromEntries(this.metrics.apiCalls);
      }

      if (!category || category === 'user_interactions') {
        metrics.userInteractions = Object.fromEntries(this.metrics.userInteractions);
      }

      if (!category || category === 'page_loads') {
        metrics.pageLoads = Object.fromEntries(this.metrics.pageLoads);
      }

      if (!category || category === 'errors') {
        metrics.errors = Object.fromEntries(this.metrics.errors);
      }

      // Get system metrics from Redis
      if (!category || category === 'system_metrics') {
        const systemMetricsKey = 'metrics:system_metrics:current';
        const systemData = await redisClient.hGet(systemMetricsKey, 'data');
        if (systemData) {
          metrics.systemMetrics = JSON.parse(systemData);
        }
      }

      return metrics;

    } catch (error) {
      logger.error('Error getting metrics:', error);
      return {};
    }
  }

  /**
   * Get performance insights
   */
  async getInsights() {
    try {
      const insights = {
        slowestEndpoints: [],
        mostUsedFeatures: [],
        errorTrends: [],
        performanceAlerts: []
      };

      // Find slowest endpoints
      for (const [key, metric] of this.metrics.apiCalls) {
        if (metric.avgDuration > 500) { // Endpoints averaging more than 500ms
          insights.slowestEndpoints.push({
            endpoint: key.replace('api:', ''),
            avgDuration: metric.avgDuration,
            count: metric.count
          });
        }
      }

      // Find most used features
      for (const [key, metric] of this.metrics.userInteractions) {
        insights.mostUsedFeatures.push({
          action: key.replace('interaction:', ''),
          count: metric.count,
          avgDuration: metric.avgDuration
        });
      }

      // Sort by count
      insights.mostUsedFeatures.sort((a, b) => b.count - a.count);
      insights.slowestEndpoints.sort((a, b) => b.avgDuration - a.avgDuration);

      // Get error trends
      for (const [key, metric] of this.metrics.errors) {
        if (metric.count > 5) { // Errors occurring more than 5 times
          insights.errorTrends.push({
            errorType: key.replace('error:', ''),
            count: metric.count,
            lastError: metric.lastError
          });
        }
      }

      // Generate performance alerts
      const systemData = await redisClient.hGet('metrics:system_metrics:current', 'data');
      if (systemData) {
        const systemMetrics = JSON.parse(systemData);
        const memoryUsageMB = systemMetrics.memory.heapUsed / 1024 / 1024;
        
        if (memoryUsageMB > 500) {
          insights.performanceAlerts.push({
            type: 'high_memory_usage',
            message: `High memory usage: ${Math.round(memoryUsageMB)}MB`,
            severity: 'warning'
          });
        }
      }

      return insights;

    } catch (error) {
      logger.error('Error getting insights:', error);
      return {};
    }
  }

  /**
   * Flush metrics to persistent storage
   */
  async flushMetrics() {
    try {
      logger.info('Flushing performance metrics to persistent storage');
      
      // This could be extended to store in a time-series database
      // For now, we're using Redis which is sufficient for our needs
      
      // Reset in-memory counters but keep averages
      for (const [key, metric] of this.metrics.apiCalls) {
        metric.count = 0;
        metric.totalDuration = 0;
      }

      for (const [key, metric] of this.metrics.userInteractions) {
        metric.count = 0;
        metric.totalDuration = 0;
      }

      for (const [key, metric] of this.metrics.pageLoads) {
        metric.count = 0;
        metric.totalLoadTime = 0;
      }

    } catch (error) {
      logger.error('Error flushing metrics:', error);
    }
  }

  /**
   * Start periodic system monitoring
   */
  startSystemMonitoring(intervalMs = 60000) { // Default: every minute
    setInterval(() => {
      this.trackSystemMetrics();
    }, intervalMs);
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary() {
    try {
      const metrics = await this.getMetrics();
      const insights = await this.getInsights();

      return {
        summary: {
          totalApiCalls: Object.values(metrics.apiCalls || {}).reduce((sum, m) => sum + m.count, 0),
          avgApiResponseTime: Object.values(metrics.apiCalls || {}).reduce((sum, m) => sum + m.avgDuration, 0) / Math.max(Object.keys(metrics.apiCalls || {}).length, 1),
          totalUserInteractions: Object.values(metrics.userInteractions || {}).reduce((sum, m) => sum + m.count, 0),
          totalErrors: Object.values(metrics.errors || {}).reduce((sum, m) => sum + m.count, 0)
        },
        insights,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting performance summary:', error);
      return {};
    }
  }
}

module.exports = new PerformanceMonitor(); 