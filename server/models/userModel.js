const mongoose = require("mongoose");

const notificationPreferencesSchema = new mongoose.Schema({
    emailSecurityAlerts: { type: Boolean, default: true },
    emailLoginAlerts: { type: Boolean, default: true },
    emailUnreadMessages: { type: Boolean, default: false },
}, { _id: false });

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    /** Legacy numeric phone — kept for backward compatibility */
    phone: {
        type: Number,
        required: true,
    },
    countryCode: {
        type: String,
        default: "91",
        trim: true,
    },
    phoneE164: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    phoneVerified: {
        type: Boolean,
        default: false,
    },
    /** When false, legacy account — skip verification gate until next credential reset */
    verificationRequired: {
        type: Boolean,
        default: true,
    },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    sessionVersion: { type: Number, default: 0 },
    lastUnreadEmailSentAt: { type: Date, default: null },
    unreadEmailDigest: {
        pendingCount: { type: Number, default: 0 },
        senderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        flushAfter: { type: Date, default: null },
    },
    notificationPreferences: {
        type: notificationPreferencesSchema,
        default: () => ({}),
    },
    bio: {
        type: String,
        default: "",
        maxlength: 280,
    },
    avatar: {
        type: String,
        default: "",
    },
    coverImage: {
        type: String,
        default: "",
    },
}, {
    timestamps: true,
});

userSchema.index({ phoneE164: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", userSchema);
