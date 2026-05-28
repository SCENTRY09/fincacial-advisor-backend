const express = require('express');
const router = express.Router();

// In-memory analytics storage (in production, use a database)
const analyticsData = {
  totalCommands: 0,
  successfulCommands: 0,
  failedCommands: 0,
  averageResponseTime: 0,
  commandTypes: {},
  userSessions: {},
  errors: [],
  performance: {
    cacheHits: 0,
    cacheMisses: 0,
    llmCalls: 0,
    fallbackUsage: 0
  },
  popularCommands: {},
  hourlyUsage: {},
  dailyUsage: {}
};

// Analytics middleware
const trackAnalytics = (req, res, next) => {
  const startTime = Date.now();
  
  // Track request
  analyticsData.totalCommands++;
  
  // Override res.json to track response
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Track success/failure
    if (data.action && data.action.type !== 'error') {
      analyticsData.successfulCommands++;
    } else {
      analyticsData.failedCommands++;
    }
    
    // Track response time
    analyticsData.averageResponseTime = 
      (analyticsData.averageResponseTime * (analyticsData.totalCommands - 1) + responseTime) / analyticsData.totalCommands;
    
    // Track command type
    if (data.action && data.action.type) {
      analyticsData.commandTypes[data.action.type] = 
        (analyticsData.commandTypes[data.action.type] || 0) + 1;
    }
    
    // Track popular commands
    const command = req.body.command;
    if (command) {
      analyticsData.popularCommands[command] = 
        (analyticsData.popularCommands[command] || 0) + 1;
    }
    
    // Track hourly usage
    const hour = new Date().getHours();
    analyticsData.hourlyUsage[hour] = (analyticsData.hourlyUsage[hour] || 0) + 1;
    
    // Track daily usage
    const today = new Date().toDateString();
    analyticsData.dailyUsage[today] = (analyticsData.dailyUsage[today] || 0) + 1;
    
    // Track performance metrics
    if (data.cacheHit) {
      analyticsData.performance.cacheHits++;
    } else {
      analyticsData.performance.cacheMisses++;
    }
    
    if (data.llmUsed) {
      analyticsData.performance.llmCalls++;
    }
    
    if (data.fallbackUsed) {
      analyticsData.performance.fallbackUsage++;
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Track user session
const trackUserSession = (userId) => {
  if (!analyticsData.userSessions[userId]) {
    analyticsData.userSessions[userId] = {
      firstSeen: new Date(),
      lastSeen: new Date(),
      commandCount: 0,
      totalTime: 0
    };
  } else {
    analyticsData.userSessions[userId].lastSeen = new Date();
    analyticsData.userSessions[userId].commandCount++;
  }
};

// Track error
const trackError = (error, context) => {
  analyticsData.errors.push({
    timestamp: new Date(),
    error: error.message || error,
    context: context,
    stack: error.stack
  });
  
  // Keep only last 100 errors
  if (analyticsData.errors.length > 100) {
    analyticsData.errors = analyticsData.errors.slice(-100);
  }
};

// Analytics endpoints
router.get('/dashboard', (req, res) => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Calculate success rate
  const successRate = analyticsData.totalCommands > 0 
    ? (analyticsData.successfulCommands / analyticsData.totalCommands * 100).toFixed(2)
    : 0;
  
  // Calculate cache hit rate
  const totalCacheRequests = analyticsData.performance.cacheHits + analyticsData.performance.cacheMisses;
  const cacheHitRate = totalCacheRequests > 0
    ? (analyticsData.performance.cacheHits / totalCacheRequests * 100).toFixed(2)
    : 0;
  
  // Get top commands
  const topCommands = Object.entries(analyticsData.popularCommands)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([command, count]) => ({ command, count }));
  
  // Get recent errors
  const recentErrors = analyticsData.errors
    .filter(error => error.timestamp > last24Hours)
    .slice(-10);
  
  // Get active users (last 24 hours)
  const activeUsers = Object.entries(analyticsData.userSessions)
    .filter(([, session]) => session.lastSeen > last24Hours)
    .length;
  
  res.json({
    overview: {
      totalCommands: analyticsData.totalCommands,
      successfulCommands: analyticsData.successfulCommands,
      failedCommands: analyticsData.failedCommands,
      successRate: `${successRate}%`,
      averageResponseTime: `${analyticsData.averageResponseTime.toFixed(2)}ms`,
      activeUsers: activeUsers
    },
    performance: {
      cacheHitRate: `${cacheHitRate}%`,
      cacheHits: analyticsData.performance.cacheHits,
      cacheMisses: analyticsData.performance.cacheMisses,
      llmCalls: analyticsData.performance.llmCalls,
      fallbackUsage: analyticsData.performance.fallbackUsage
    },
    commandTypes: analyticsData.commandTypes,
    topCommands: topCommands,
    hourlyUsage: analyticsData.hourlyUsage,
    dailyUsage: analyticsData.dailyUsage,
    recentErrors: recentErrors
  });
});

// Detailed analytics
router.get('/detailed', (req, res) => {
  const { startDate, endDate, type } = req.query;
  
  let filteredData = { ...analyticsData };
  
  // Filter by date range if provided
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter errors
    filteredData.errors = analyticsData.errors.filter(error => 
      error.timestamp >= start && error.timestamp <= end
    );
  }
  
  // Filter by type if provided
  if (type) {
    filteredData.commandTypes = { [type]: analyticsData.commandTypes[type] || 0 };
  }
  
  res.json(filteredData);
});

// Performance metrics
router.get('/performance', (req, res) => {
  try {
    const performanceMetrics = {
      responseTime: {
        average: analyticsData.averageResponseTime,
        p50: calculatePercentile(analyticsData.responseTimes, 50),
        p95: calculatePercentile(analyticsData.responseTimes, 95),
        p99: calculatePercentile(analyticsData.responseTimes, 99)
      },
      cache: {
        hitRate: analyticsData.performance.cacheHits / (analyticsData.performance.cacheHits + analyticsData.performance.cacheMisses),
        hits: analyticsData.performance.cacheHits,
        misses: analyticsData.performance.cacheMisses
      },
      llm: {
        calls: analyticsData.performance.llmCalls,
        successRate: calculateLLMSuccessRate(),
        averageTokens: calculateAverageTokens()
      },
      errors: {
        total: analyticsData.errors.length,
        byType: groupErrorsByType(),
        recent: analyticsData.errors.slice(-10)
      }
    };
    
    res.json(performanceMetrics);
  } catch (err) {
    console.error('Performance metrics error:', err);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// User analytics
router.get('/users', (req, res) => {
  try {
    const userAnalytics = {
      totalUsers: Object.keys(analyticsData.userSessions).length,
      activeUsers: calculateActiveUsers(),
      userEngagement: calculateUserEngagement(),
      topUsers: getTopUsers(),
      userJourney: analyzeUserJourney()
    };
    
    res.json(userAnalytics);
  } catch (err) {
    console.error('User analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// Real-time analytics
router.get('/realtime', (req, res) => {
  try {
    const now = new Date();
    const lastMinute = new Date(now.getTime() - 60 * 1000);
    const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);
    
    const realtimeData = {
      currentMinute: {
        commands: countCommandsInTimeRange(lastMinute, now),
        errors: countErrorsInTimeRange(lastMinute, now),
        activeUsers: countActiveUsersInTimeRange(lastMinute, now)
      },
      last5Minutes: {
        commands: countCommandsInTimeRange(last5Minutes, now),
        errors: countErrorsInTimeRange(last5Minutes, now),
        activeUsers: countActiveUsersInTimeRange(last5Minutes, now)
      },
      currentHour: analyticsData.hourlyUsage[now.getHours()] || 0,
      today: analyticsData.dailyUsage[now.toDateString()] || 0
    };
    
    res.json(realtimeData);
  } catch (err) {
    console.error('Real-time analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch real-time analytics' });
  }
});

// Export analytics data
router.get('/export', (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(analyticsData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=voice-analytics.csv');
      res.send(csvData);
    } else {
      res.json(analyticsData);
    }
  } catch (err) {
    console.error('Export analytics error:', err);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// Reset analytics (admin only)
router.post('/reset', (req, res) => {
  try {
    // In production, add authentication here
    Object.keys(analyticsData).forEach(key => {
      if (Array.isArray(analyticsData[key])) {
        analyticsData[key] = [];
      } else if (typeof analyticsData[key] === 'object') {
        analyticsData[key] = {};
      } else {
        analyticsData[key] = 0;
      }
    });
    
    res.json({ message: 'Analytics data reset successfully' });
  } catch (err) {
    console.error('Reset analytics error:', err);
    res.status(500).json({ error: 'Failed to reset analytics' });
  }
});

// Helper functions
function calculatePercentile(values, percentile) {
  if (!values || values.length === 0) return 0;
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

function calculateLLMSuccessRate() {
  // This would need to be tracked separately
  return 0.95; // Placeholder
}

function calculateAverageTokens() {
  // This would need to be tracked separately
  return 150; // Placeholder
}

function groupErrorsByType() {
  const errorTypes = {};
  analyticsData.errors.forEach(error => {
    const type = error.error.split(':')[0] || 'Unknown';
    errorTypes[type] = (errorTypes[type] || 0) + 1;
  });
  return errorTypes;
}

function calculateActiveUsers() {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return Object.values(analyticsData.userSessions)
    .filter(session => session.lastSeen > last24Hours).length;
}

function calculateUserEngagement() {
  const sessions = Object.values(analyticsData.userSessions);
  if (sessions.length === 0) return 0;
  
  const totalCommands = sessions.reduce((sum, session) => sum + session.commandCount, 0);
  return totalCommands / sessions.length;
}

function getTopUsers() {
  return Object.entries(analyticsData.userSessions)
    .sort(([,a], [,b]) => b.commandCount - a.commandCount)
    .slice(0, 10)
    .map(([userId, session]) => ({
      userId,
      commandCount: session.commandCount,
      lastSeen: session.lastSeen
    }));
}

function analyzeUserJourney() {
  // This would analyze common command sequences
  return {
    commonPaths: [],
    dropoffPoints: [],
    conversionRates: {}
  };
}

function countCommandsInTimeRange(start, end) {
  // This would need to be tracked with timestamps
  return 0; // Placeholder
}

function countErrorsInTimeRange(start, end) {
  return analyticsData.errors.filter(error => 
    error.timestamp >= start && error.timestamp <= end
  ).length;
}

function countActiveUsersInTimeRange(start, end) {
  return Object.values(analyticsData.userSessions)
    .filter(session => session.lastSeen >= start && session.lastSeen <= end).length;
}

function convertToCSV(data) {
  // Simple CSV conversion
  const rows = [];
  
  // Add headers
  rows.push(['Metric', 'Value']);
  
  // Add data
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object') {
      rows.push([key, JSON.stringify(value)]);
    } else {
      rows.push([key, value]);
    }
  });
  
  return rows.map(row => row.join(',')).join('\n');
}

module.exports = {
  router,
  trackAnalytics,
  trackUserSession,
  trackError
};
