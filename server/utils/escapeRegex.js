/** Escape user input for safe use inside MongoDB $regex. */
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { escapeRegex };
