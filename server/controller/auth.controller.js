const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const { normalizePhone, normalizeLoginIdentifier } = require("../utils/phoneNormalize");
const { hitRateLimit } = require("../utils/rateLimitStore");
const {
    signSessionToken,
    setSessionCookie,
} = require("../services/authSessionService");

const genericAuthError = () => ({ message: "Invalid credentials." });

const rateKey = (prefix, req, id) => `${prefix}:${req.ip}:${id || "anon"}`;

const register = async (req, res) => {
    try {
        const limit = hitRateLimit(rateKey("register", req), { windowMs: 60_000, max: 5 });
        if (limit.limited) {
            return res.status(429).json({ message: "Too many registration attempts. Try again shortly." });
        }

        const { userName, name, email, password, phone, countryCode } = req.body;
        if (!userName?.trim() || !name?.trim() || !email?.trim() || !password || !phone) {
            return res.status(400).json({ message: "All fields are required." });
        }
        if (String(password).length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const phoneE164 = normalizePhone(countryCode || "91", phone);
        if (!phoneE164) {
            return res.status(400).json({ message: "Enter a valid mobile number with country code." });
        }

        const duplicate = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { userName: userName.trim() },
                { phoneE164 },
            ],
        });
        if (duplicate) {
            return res.status(409).json({ message: "An account with these details may already exist." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const numericPhone = Number(String(phone).replace(/\D/g, "").slice(-15)) || 0;

        const newUser = await User.create({
            userName: userName.trim(),
            name: name.trim(),
            email: normalizedEmail,
            phone: numericPhone,
            countryCode: String(countryCode || "91").replace(/\D/g, ""),
            phoneE164,
            password: hashedPassword,
        });

        const sessionToken = signSessionToken(newUser);
        setSessionCookie(res, sessionToken);

        return res.status(201).json({
            message: "Account created successfully.",
            token: sessionToken,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Registration failed." });
    }
};

const login = async (req, res) => {
    try {
        const limit = hitRateLimit(rateKey("login", req), { windowMs: 60_000, max: 10 });
        if (limit.limited) {
            return res.status(429).json({ message: "Too many login attempts. Try again shortly." });
        }

        const { identifier, email, password } = req.body;
        const loginId = normalizeLoginIdentifier(identifier || email);
        if (!loginId.value || !password) {
            return res.status(400).json({ message: "Email or phone and password are required." });
        }

        let existingUser = null;
        if (loginId.type === "email") {
            existingUser = await User.findOne({ email: loginId.value });
        } else {
            existingUser = await User.findOne({ phoneE164: loginId.value });
        }

        if (!existingUser) {
            return res.status(401).json(genericAuthError());
        }

        const isMatch = await bcrypt.compare(password, existingUser.password);
        if (!isMatch) {
            return res.status(401).json(genericAuthError());
        }

        const sessionToken = signSessionToken(existingUser);
        setSessionCookie(res, sessionToken);

        return res.json({
            message: "Login successful.",
            token: sessionToken,
        });
    } catch (error) {
        return res.status(500).json({ message: "Login failed." });
    }
};

module.exports = {
    register,
    login,
    loginStart: login,
};
