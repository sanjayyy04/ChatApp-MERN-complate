const getAppBaseUrl = () => process.env.APP_BASE_URL || process.env.CLIENT_ORIGIN?.split(",")[0] || "http://localhost:5173";

const sendEmail = async ({ to, subject, text, html }) => {
    const provider = process.env.EMAIL_PROVIDER || "console";

    if (provider === "console" || process.env.NODE_ENV !== "production") {
        if (process.env.LOG_EMAIL !== "false") {
            console.info("[email:dev]", { to, subject, text: text?.slice(0, 200) });
        }
        return { ok: true, provider: "console" };
    }

    if (provider === "resend") {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
        const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ from, to, subject, text, html }),
        });
        if (!response.ok) {
            throw new Error("Email delivery failed.");
        }
        return { ok: true, provider: "resend" };
    }

    throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
};

const sendUnreadMessagesDigestEmail = async (user, { messageCount, senderNames }) => {
    if (user.notificationPreferences?.emailUnreadMessages !== true) {
        return { ok: true, skipped: true };
    }
    if (!user.emailVerified) return { ok: true, skipped: true };

    const appUrl = getAppBaseUrl();
    const count = Math.max(1, Number(messageCount) || 1);
    const names = (senderNames || []).slice(0, 8);
    let fromLine = "someone";
    if (names.length === 1) fromLine = names[0];
    else if (names.length === 2) fromLine = `${names[0]} and ${names[1]}`;
    else if (names.length > 2) fromLine = `${names[0]}, ${names[1]}, and others`;

    const subject = count === 1
        ? "You have a new message"
        : `You have ${count} unread messages`;
    const text = `Hi ${user.name},\n\nYou have ${count} unread message${count === 1 ? "" : "s"}`
        + (names.length ? ` from ${fromLine}` : "")
        + `. Open the app to read them — message content is not included in this email.\n\n${appUrl}/chats\n\n`
        + "You can turn off these emails in Profile → Notifications.";

    return sendEmail({ to: user.email, subject, text });
};

module.exports = {
    sendEmail,
    sendUnreadMessagesDigestEmail,
};
