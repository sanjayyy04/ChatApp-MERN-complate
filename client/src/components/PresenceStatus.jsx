const PresenceStatus = ({ online, typing, className = "" }) => {
  if (typing) {
    return (
      <span className={`crud-chat-presence crud-chat-presence--typing${className ? ` ${className}` : ""}`}>
        typing…
      </span>
    );
  }

  if (online) {
    return (
      <span className={`crud-chat-presence crud-chat-presence--online${className ? ` ${className}` : ""}`}>
        <span className="crud-chat-presence-dot" aria-hidden="true" />
        online
      </span>
    );
  }

  return null;
};

export default PresenceStatus;
