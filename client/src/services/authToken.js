const STORAGE_KEY = "chatapp_auth_token";

export const getAuthToken = () => sessionStorage.getItem(STORAGE_KEY);

export const setAuthToken = (token) => {
  if (token) {
    sessionStorage.setItem(STORAGE_KEY, token);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
};

export const clearAuthToken = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};
