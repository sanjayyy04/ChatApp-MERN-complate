const buckets = new Map();

/**
 * Simple in-memory rate limiter (per key). Use Redis in multi-instance production.
 */
const hitRateLimit = (key, { windowMs = 60_000, max = 10 } = {}) => {
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
        bucket = { start: now, count: 0 };
        buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
        const retryAfterMs = windowMs - (now - bucket.start);
        return { limited: true, retryAfterMs: Math.max(retryAfterMs, 1000) };
    }
    return { limited: false };
};

module.exports = { hitRateLimit };
