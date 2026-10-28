/** Path-only invite link (React Router, respects app basename). */
export const buildGroupInvitePath = (code) => {
  const trimmed = String(code || "").trim();
  return `/groups?invite=${encodeURIComponent(trimmed)}`;
};

/** Full shareable URL for clipboard / messaging apps. */
export const buildInviteUrl = (code) => {
  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "");
  const origin = window.location.origin;
  return `${origin}${basePath}${buildGroupInvitePath(code)}`;
};

export const loginRedirectForInvitePath = (pathWithSearch) => {
  const safe = pathWithSearch.startsWith("/") ? pathWithSearch : "/groups";
  return `/login?redirect=${encodeURIComponent(safe)}`;
};
