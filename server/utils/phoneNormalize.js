/** Normalize to E.164-ish digits with leading + (best-effort for MVP). */
const normalizePhone = (countryCode, phoneRaw) => {
    const cc = String(countryCode || "").replace(/\D/g, "");
    let digits = String(phoneRaw || "").replace(/\D/g, "");
    if (!cc || !digits) return null;
    while (digits.startsWith("0") && digits.length > 1) {
        digits = digits.slice(1);
    }
    if (digits.startsWith(cc) && digits.length > cc.length + 6) {
        return `+${digits}`;
    }
    return `+${cc}${digits}`;
};

const normalizeLoginIdentifier = (identifier) => {
    const raw = String(identifier || "").trim();
    if (!raw) return { type: null, value: null };
    if (raw.includes("@")) {
        return { type: "email", value: raw.toLowerCase() };
    }
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 10) {
        return { type: "phone", value: digits.startsWith("+") ? raw : `+${digits}` };
    }
    return { type: "email", value: raw.toLowerCase() };
};

module.exports = { normalizePhone, normalizeLoginIdentifier };
