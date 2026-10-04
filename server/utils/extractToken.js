const extractToken = (req) => {
    if (req.cookies?.token) {
        return req.cookies.token;
    }

    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
        return header.slice(7).trim();
    }

    return null;
};

module.exports = { extractToken };
