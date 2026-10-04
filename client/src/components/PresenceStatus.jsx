const PresenceStatus = ({ online, typing, className = "" }) => {
  if (typing) {
    return (
      <span className={`presence-status presence-status--typing${className ? ` ${className}` : ""}`}>
        typing…
      </span>
    );
  }

  if (online) {
    return (
      <span className={`presence-status presence-status--online${className ? ` ${className}` : ""}`}>
        <span className="presence-dot" aria-hidden="true" />
        online
      </span>
    );
  }

  return null;
};

export default PresenceStatus;
