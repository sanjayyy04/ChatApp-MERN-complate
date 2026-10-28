/** Fields safe to expose in search and public profile views. */
const PUBLIC_USER_SELECT = "userName name avatar bio";

const toPublicUser = (doc) => {
    if (!doc) return null;
    const raw = doc.toObject ? doc.toObject() : doc;
    return {
        _id: raw._id,
        userName: raw.userName,
        name: raw.name,
        avatar: raw.avatar || "",
        bio: raw.bio || "",
    };
};

module.exports = {
    PUBLIC_USER_SELECT,
    toPublicUser,
};
