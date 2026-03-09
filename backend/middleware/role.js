const ApiError = require('../utils/ApiError');

/**
 * Role-based access control middleware.
 * @param  {...string} roles - Allowed roles (e.g., 'super_admin', 'content_admin')
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('Authentication required'));
        }

        if (!roles.includes(req.user.role)) {
            return next(
                ApiError.forbidden(`Access denied. Required role(s): ${roles.join(', ')}`)
            );
        }

        next();
    };
};

module.exports = { requireRole };
