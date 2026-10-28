import { createPortal } from "react-dom";
import { FiLock, FiUnlock, FiX } from "react-icons/fi";

const CreateGroupModal = ({
  open,
  name,
  isPrivate,
  creating,
  error,
  onNameChange,
  onPrivateChange,
  onSubmit,
  onClose,
}) => {
  if (!open) return null;

  return createPortal(
    <div
      className="crud-chat-group-create-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !creating) onClose();
      }}
    >
      <div
        className="crud-chat-group-create-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-group-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="crud-chat-group-create-modal__header">
          <h2 id="create-group-title">Create group</h2>
          <button
            type="button"
            className="crud-chat-group-create-modal__close"
            aria-label="Close"
            disabled={creating}
            onClick={onClose}
          >
            <FiX size={22} />
          </button>
        </header>

        <form className="crud-chat-group-create-modal__form" onSubmit={onSubmit}>
          <label className="crud-chat-group-create-modal__field">
            <span>Group name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="e.g. Family, Work team…"
              maxLength={100}
              autoFocus
              disabled={creating}
            />
          </label>

          <p className="crud-chat-group-create-modal__field-label">Group type</p>
          <div className="crud-chat-group-create-modal__type-grid">
            <button
              type="button"
              className={`crud-chat-group-create-modal__type${isPrivate ? " crud-chat-group-create-modal__type--active" : ""}`}
              disabled={creating}
              onClick={() => onPrivateChange(true)}
            >
              <FiLock aria-hidden="true" />
              <strong>Private</strong>
              <small>Only people you add can join</small>
            </button>
            <button
              type="button"
              className={`crud-chat-group-create-modal__type${!isPrivate ? " crud-chat-group-create-modal__type--active" : ""}`}
              disabled={creating}
              onClick={() => onPrivateChange(false)}
            >
              <FiUnlock aria-hidden="true" />
              <strong>Public</strong>
              <small>Friends can discover this group</small>
            </button>
          </div>

          <p className="crud-chat-group-create-modal__note">
            After creating, open group settings to add members and choose who can send messages.
          </p>

          {error ? <p className="crud-chat-group-create-modal__error" role="alert">{error}</p> : null}

          <div className="crud-chat-group-create-modal__actions">
            <button
              type="button"
              className="crud-chat-group-create-modal__btn crud-chat-group-create-modal__btn--ghost"
              disabled={creating}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="crud-chat-group-create-modal__btn crud-chat-group-create-modal__btn--primary"
              disabled={creating || !name.trim()}
            >
              {creating ? "Creating…" : "Create group"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default CreateGroupModal;
