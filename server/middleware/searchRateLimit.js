const searchHits = new Map();
const WINDOW_MS = 60_000;
const MAX_HITS = 40;

/** Basic per-user rate limit for username search (privacy / abuse). */
const searchRateLimit = (req, res, next) => {
    const userId = req.user?._id ? String(req.user._id) : req.ip;
    const now = Date.now();
    let bucket = searchHits.get(userId);
    if (!bucket || now - bucket.start > WINDOW_MS) {
        bucket = { start: now, count: 0 };
        searchHits.set(userId, bucket);
    }
    bucket.count += 1;
    if (bucket.count > MAX_HITS) {
        return res.status(429).json({
            message: "Too many search requests. Please wait a moment.",
        });
    }
    next();
};

module.exports = searchRateLimit;
