const User = require("../models/userModel");
const { isUserOnline } = require("../utils/realtime");
const { sendUnreadMessagesDigestEmail } = require("./emailService");

const BATCH_DELAY_MS = Number(process.env.UNREAD_EMAIL_BATCH_MS) || 5 * 60 * 1000;
const MIN_INTERVAL_MS = Number(process.env.UNREAD_EMAIL_MIN_INTERVAL_MS) || 30 * 60 * 1000;
const MAX_SENDERS_IN_EMAIL = 8;

const flushTimers = new Map();

const clearFlushTimer = (userId) => {
    const key = String(userId);
    const existing = flushTimers.get(key);
    if (existing) {
        clearTimeout(existing);
        flushTimers.delete(key);
    }
};

const scheduleFlush = (userId, delayMs) => {
    const key = String(userId);
    clearFlushTimer(key);
    const timer = setTimeout(() => {
        flushTimers.delete(key);
        flushUnreadDigest(key).catch(() => {});
    }, Math.max(1000, delayMs));
    flushTimers.set(key, timer);
};

const resetDigestFields = async (userId) => {
    await User.updateOne(
        { _id: userId },
        {
            $set: {
                "unreadEmailDigest.pendingCount": 0,
                "unreadEmailDigest.senderIds": [],
                "unreadEmailDigest.flushAfter": null,
            },
        },
    );
};

/** Call when the user opens a live socket connection — skip pending offline emails. */
const cancelUnreadEmailDigest = async (userId) => {
    clearFlushTimer(userId);
    await resetDigestFields(userId);
};

const computeFlushDelay = (lastSentAt) => {
    const now = Date.now();
    let delay = BATCH_DELAY_MS;
    if (lastSentAt) {
        const nextAllowed = new Date(lastSentAt).getTime() + MIN_INTERVAL_MS;
        if (nextAllowed > now) {
            delay = Math.max(delay, nextAllowed - now);
        }
    }
    return delay;
};

const flushUnreadDigest = async (userId) => {
    if (isUserOnline(userId)) {
        await resetDigestFields(userId);
        return;
    }

    const recipient = await User.findById(userId).select(
        "name email emailVerified notificationPreferences unreadEmailDigest lastUnreadEmailSentAt",
    );
    if (!recipient?.email) {
        await resetDigestFields(userId);
        return;
    }
    if (recipient.notificationPreferences?.emailUnreadMessages !== true) {
        await resetDigestFields(userId);
        return;
    }

    const pendingCount = recipient.unreadEmailDigest?.pendingCount || 0;
    if (pendingCount <= 0) return;

    const lastSent = recipient.lastUnreadEmailSentAt;
    if (lastSent && Date.now() - new Date(lastSent).getTime() < MIN_INTERVAL_MS) {
        scheduleFlush(userId, computeFlushDelay(lastSent));
        return;
    }

    const senderIds = (recipient.unreadEmailDigest?.senderIds || []).slice(0, MAX_SENDERS_IN_EMAIL);
    const senders = senderIds.length
        ? await User.find({ _id: { $in: senderIds } }).select("name userName").lean()
        : [];

    await sendUnreadMessagesDigestEmail(recipient, {
        messageCount: pendingCount,
        senderNames: senders.map((s) => s.name || s.userName).filter(Boolean),
    }).catch(() => {});

    await User.updateOne(
        { _id: userId },
        {
            $set: {
                lastUnreadEmailSentAt: new Date(),
                "unreadEmailDigest.pendingCount": 0,
                "unreadEmailDigest.senderIds": [],
                "unreadEmailDigest.flushAfter": null,
            },
        },
    );
};

const queueUnreadMessageEmail = async (receiverId, senderId) => {
    const receiverKey = String(receiverId);
    const senderKey = String(senderId);
    if (receiverKey === senderKey) return;
    if (isUserOnline(receiverKey)) return;

    const recipient = await User.findById(receiverKey).select(
        "emailVerified notificationPreferences unreadEmailDigest lastUnreadEmailSentAt",
    );
    if (!recipient?.email) return;
    if (recipient.notificationPreferences?.emailUnreadMessages !== true) return;

    await User.updateOne(
        { _id: receiverKey },
        {
            $inc: { "unreadEmailDigest.pendingCount": 1 },
            $addToSet: { "unreadEmailDigest.senderIds": senderKey },
        },
    );

    const updated = await User.findById(receiverKey).select("lastUnreadEmailSentAt");
    const delay = computeFlushDelay(updated?.lastUnreadEmailSentAt);
    if (!flushTimers.has(receiverKey)) {
        scheduleFlush(receiverKey, delay);
    }
};

module.exports = {
    queueUnreadMessageEmail,
    cancelUnreadEmailDigest,
    flushUnreadDigest,
};
