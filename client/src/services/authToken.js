const STORAGE_KEY = "chatapp_auth_token";

const readToken = () => {
  let token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = sessionStorage.getItem(STORAGE_KEY);
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
  return token;
};

export const getAuthToken = () => readToken();

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
};
