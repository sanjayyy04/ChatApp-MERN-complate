const getClientOrigins = () => {
    if (process.env.CLIENT_ORIGINS) {
        return process.env.CLIENT_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
    }

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ];
};

module.exports = { getClientOrigins };
