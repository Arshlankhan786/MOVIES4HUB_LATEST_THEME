const ApiError = require('./ApiError');

const validators = {
    email(value) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value || !regex.test(value)) {
            throw ApiError.badRequest('Invalid email address');
        }
        return value.toLowerCase().trim();
    },

    password(value) {
        if (!value || value.length < 6) {
            throw ApiError.badRequest('Password must be at least 6 characters');
        }
        return value;
    },

    requiredString(value, fieldName) {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            throw ApiError.badRequest(`${fieldName} is required`);
        }
        return value.trim();
    },

    enumValue(value, allowed, fieldName) {
        if (!allowed.includes(value)) {
            throw ApiError.badRequest(`${fieldName} must be one of: ${allowed.join(', ')}`);
        }
        return value;
    },

    positiveInt(value, fieldName) {
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
            throw ApiError.badRequest(`${fieldName} must be a positive integer`);
        }
        return num;
    },

    uuid(value, fieldName = 'ID') {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!value || !regex.test(value)) {
            throw ApiError.badRequest(`Invalid ${fieldName} format`);
        }
        return value;
    },
};

module.exports = validators;
