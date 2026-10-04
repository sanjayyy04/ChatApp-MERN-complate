const configuredApiUrl = import.meta.env.VITE_API_URL;
const productionApiDefault = "https://chatapp-mern-complate.onrender.com";

export const API_URL = configuredApiUrl === ""
  ? ""
  : (configuredApiUrl ||
    (import.meta.env.PROD ? productionApiDefault : "http://localhost:3000"));

export const fileUrl = (relativePath) => {
  if (!relativePath) return "";
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  return `${API_URL}${relativePath.startsWith("/") ? "" : "/"}${relativePath}`;
};

export const userAvatarUrl = (person) =>
  fileUrl(person?.avatar) ||
  `https://i.pravatar.cc/320?u=${encodeURIComponent(person?._id || person?.id || person?.userName || "guest")}`;
