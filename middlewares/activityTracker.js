// middlewares/activityTracker.js
const User = require('../models/User/User');

// Track user activity on each request
const activityTracker = async (req, res, next) => {
  try {
    // Skip if no user is authenticated
    if (!req.user || !req.user.id) {
      return next();
    }

    // Skip for certain routes to avoid too many updates
    const skipRoutes = ['/heartbeat', '/online', '/sessions'];
    if (skipRoutes.some(route => req.path.includes(route))) {
      return next();
    }

    // Update last activity asynchronously
    const userId = req.user.id;
    const sessionId = req.user.sessionId;

    // Don't wait for this to complete
    User.findById(userId).then(user => {
      if (user && sessionId) {
        const session = user.sessions.find(s => s.sessionId === sessionId);
        if (session) {
          session.lastActivity = new Date();
          user.lastSeen = new Date();
          user.save().catch(err => {
            console.error('Failed to update activity:', err);
          });
        }
      }
    }).catch(err => {
      console.error('Activity tracker error:', err);
    });

    next();
  } catch (err) {
    console.error('Activity tracker middleware error:', err);
    next(); // Continue even if tracking fails
  }
};

module.exports = activityTracker;
