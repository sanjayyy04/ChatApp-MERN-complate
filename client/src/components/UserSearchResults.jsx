import { FiSearch } from "react-icons/fi";
import { userAvatarUrl } from "../api";

const UserSearchResults = ({
  results,
  loading,
  error,
  query,
  minLength = 2,
  friendIds,
  pendingRequestIds,
  onOpenProfile,
  onOpenChat,
  onSendRequest,
  onCancelRequest,
  compact = false,
}) => {
  const trimmed = query.trim();

  if (!trimmed.length && compact) {
    return null;
  }

  if (!trimmed.length) {
    return (
      <p className="crud-chat-user-search__hint">
        Start typing a username to see matches.
      </p>
    );
  }

  if (trimmed.length > 0 && trimmed.length < minLength) {
    return (
      <p className={compact ? "crud-chat-sidebar__hint" : "crud-chat-user-search__hint"}>
        Keep typing to search by username…
      </p>
    );
  }

  if (loading) {
    return (
      <p className={compact ? "crud-chat-sidebar__hint" : "crud-chat-user-search__hint"}>
        Searching…
      </p>
    );
  }

  if (error) {
    return (
      <p className={compact ? "crud-chat-sidebar__hint crud-chat-user-search__error" : "crud-chat-user-search__error"} role="alert">
        {error}
      </p>
    );
  }

  if (!results.length) {
    return (
      <p className={compact ? "crud-chat-sidebar__hint" : "crud-chat-user-search__hint"}>
        No users found for &ldquo;{trimmed.replace(/^@/, "")}&rdquo;.
      </p>
    );
  }

  return (
    <ul className={`crud-chat-user-search-results${compact ? " crud-chat-user-search-results--compact" : ""}`} aria-label="User search results">
      {results.map((person) => {
        const pid = String(person._id);
        const isFriend = friendIds.has(pid);
        const requested = pendingRequestIds.has(pid);

        let actionLabel = "Add";
        let actionHandler = (event) => onSendRequest?.(person._id, event);
        let actionDisabled = false;

        if (isFriend) {
          actionLabel = "Chat";
          actionHandler = (event) => {
            event.stopPropagation();
            onOpenChat?.(person);
          };
        } else if (requested) {
          actionLabel = "Requested";
          actionHandler = (event) => onCancelRequest?.(person._id, event);
        }

        return (
          <li key={person._id} className="crud-chat-user-search-results__item">
            <button
              type="button"
              className="crud-chat-user-search-results__main"
              onClick={() => onOpenProfile(person)}
            >
              <img src={userAvatarUrl(person)} alt="" />
              <span className="crud-chat-user-search-results__meta">
                <strong>{person.name || person.userName}</strong>
                <small>@{person.userName}</small>
              </span>
            </button>
            <button
              type="button"
              className={`crud-chat-user-search-results__action${isFriend ? " crud-chat-user-search-results__action--chat" : ""}${requested ? " crud-chat-user-search-results__action--requested" : ""}`}
              disabled={actionDisabled}
              onClick={actionHandler}
            >
              {actionLabel}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const UserSearchField = ({ value, onChange, id = "user-search", autoFocus = false, className = "" }) => (
  <label className={`crud-chat-user-search-field${className ? ` ${className}` : ""}`} htmlFor={id}>
    <FiSearch aria-hidden="true" />
    <input
      id={id}
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Enter username"
      autoComplete="off"
      autoFocus={autoFocus}
    />
  </label>
);

export { UserSearchField };
export default UserSearchResults;
