/** Cookie options for JWT auth (GitHub Pages → Render needs SameSite=None in production). */
const getAuthCookieOptions = () => {
    const crossSite =
        process.env.NODE_ENV === "production" ||
        Boolean(process.env.RENDER) ||
        (process.env.CLIENT_ORIGINS || "").includes("github.io");
    return {
        httpOnly: true,
        maxAge: 60 * 60 * 1000,
        path: "/",
        ...(crossSite ? { secure: true, sameSite: "none" } : { sameSite: "lax" }),
    };
};

module.exports = { getAuthCookieOptions };
