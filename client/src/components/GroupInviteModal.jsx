import { createPortal } from "react-dom";
import { FiUsers, FiX } from "react-icons/fi";

const GroupInviteModal = ({
  open,
  preview,
  joining,
  errorMessage,
  onJoin,
  onDismiss,
}) => {
  if (!open || !preview) return null;

  return createPortal(
    <div
      className="crud-chat-group-invite-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !joining) onDismiss();
      }}
    >
      <div
        className="crud-chat-group-invite-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-invite-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="crud-chat-group-invite-modal__header">
          <div className="crud-chat-group-invite-modal__icon" aria-hidden="true">
            <FiUsers size={28} />
          </div>
          <button
            type="button"
            className="crud-chat-group-invite-modal__close"
            aria-label="Close"
            disabled={joining}
            onClick={onDismiss}
          >
            <FiX size={22} />
          </button>
        </header>
        <h2 id="group-invite-title" className="crud-chat-group-invite-modal__title">
          Join {preview.name}?
        </h2>
        <p className="crud-chat-group-invite-modal__meta">
          {preview.isPrivate === false ? "Public group" : "Private group"}
        </p>
        {preview.isPrivate !== false ? (
          <p className="crud-chat-group-invite-modal__hint">
            Private groups require you to be friends with the group admin. Send a friend request first if join fails.
          </p>
        ) : (
          <p className="crud-chat-group-invite-modal__hint">
            You&apos;ll be added as a member and can open the group chat right away.
          </p>
        )}
        {errorMessage ? (
          <p className="crud-chat-group-invite-modal__error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="crud-chat-group-invite-modal__actions">
          <button
            type="button"
            className="crud-chat-group-invite-modal__btn crud-chat-group-invite-modal__btn--ghost"
            disabled={joining}
            onClick={onDismiss}
          >
            Not now
          </button>
          <button
            type="button"
            className="crud-chat-group-invite-modal__btn crud-chat-group-invite-modal__btn--primary"
            disabled={joining}
            onClick={onJoin}
          >
            {joining ? "Joining…" : "Join group"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default GroupInviteModal;
