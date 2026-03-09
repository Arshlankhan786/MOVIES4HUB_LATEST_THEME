const ApiError = require('../utils/ApiError');
const config = require('../config/env');

const errorHandler = (err, req, res, _next) => {
    // Log error in development
    if (config.nodeEnv === 'development') {
        console.error('❌ Error:', err);
    }

    // Handle known operational errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(err.details && { details: err.details }),
        });
    }

    // Handle MySQL duplicate entry
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: 'Resource already exists',
        });
    }

    // Handle MySQL foreign key constraint
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            success: false,
            message: 'Referenced resource not found',
        });
    }

    // Handle JSON parse errors
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON payload',
        });
    }

    // Fallback for unknown errors
    return res.status(500).json({
        success: false,
        message: config.nodeEnv === 'production'
            ? 'An unexpected error occurred'
            : err.message || 'Internal server error',
    });
};

module.exports = errorHandler;
