/**
 * Circuit Breaker for external API providers.
 * 3 failures → disable provider for 5 minutes.
 */
const cacheService = require('./cacheService');

const FAILURE_THRESHOLD = 3;
const RESET_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// In-memory state (reset on server restart)
const circuits = {};

function getCircuit(provider) {
    if (!circuits[provider]) {
        circuits[provider] = {
            failures: 0,
            lastFailure: 0,
            state: 'CLOSED', // CLOSED = healthy, OPEN = tripped
        };
    }
    return circuits[provider];
}

const circuitBreaker = {
    isOpen(provider) {
        const circuit = getCircuit(provider);
        if (circuit.state === 'OPEN') {
            // Check if reset timeout has elapsed
            if (Date.now() - circuit.lastFailure >= RESET_TIMEOUT_MS) {
                circuit.state = 'HALF_OPEN';
                circuit.failures = 0;
                return false; // Allow one attempt
            }
            return true; // Still tripped
        }
        return false;
    },

    recordSuccess(provider) {
        const circuit = getCircuit(provider);
        circuit.failures = 0;
        circuit.state = 'CLOSED';
    },

    recordFailure(provider) {
        const circuit = getCircuit(provider);
        circuit.failures += 1;
        circuit.lastFailure = Date.now();

        if (circuit.failures >= FAILURE_THRESHOLD) {
            circuit.state = 'OPEN';
            console.warn(`⚡ Circuit OPEN for provider: ${provider} (${FAILURE_THRESHOLD} failures)`);
        }
    },

    getStatus() {
        const status = {};
        for (const [provider, circuit] of Object.entries(circuits)) {
            status[provider] = {
                state: circuit.state,
                failures: circuit.failures,
                lastFailure: circuit.lastFailure
                    ? new Date(circuit.lastFailure).toISOString()
                    : null,
            };
        }
        return status;
    },

    reset(provider) {
        if (circuits[provider]) {
            circuits[provider] = { failures: 0, lastFailure: 0, state: 'CLOSED' };
        }
    },
};

module.exports = circuitBreaker;
