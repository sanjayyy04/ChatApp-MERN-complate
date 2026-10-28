import { createPortal } from "react-dom";
import {
  FiCheck,
  FiCopy,
  FiLink,
  FiRefreshCw,
  FiShield,
  FiUserMinus,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { userAvatarUrl } from "../api";
import { buildInviteUrl } from "../utils/groupInvite";

const GroupSettingsModal = ({
  open,
  group,
  isAdmin,
  userId,
  saving,
  addMemberQuery,
  addMemberResults,
  onClose,
  onGroupChange,
  onSave,
  onAddMemberQuery,
  onAddMember,
  onRemoveMember,
  onApproveRequest,
  onRejectRequest,
  onRegenerateInvite,
  onDeleteGroup,
  onOpenProfile,
}) => {
  if (!open || !group) return null;

  const inviteCode = group.inviteCode;
  const inviteUrl = inviteCode ? buildInviteUrl(inviteCode) : "";
  const joinRequests = group.joinRequests || [];
  const pendingCount = joinRequests.length;

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied.");
    } catch {
      toast.info("Copy the link manually from the box below.");
    }
  };

  return createPortal(
    <div
      className="crud-chat-group-settings-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="crud-chat-group-settings-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crud-chat-group-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="crud-chat-group-settings-modal__header">
          <div>
            <h2 id="crud-chat-group-settings-title">{group.name}</h2>
            <p className="crud-chat-group-settings-modal__subtitle">
              {group.members?.length || 0} members · {group.isPrivate === false ? "Public" : "Private"}
            </p>
          </div>
          <button type="button" className="crud-chat-group-settings-modal__close" aria-label="Close" onClick={onClose}>
            <FiX size={22} />
          </button>
        </header>

        <div className="crud-chat-group-settings-modal__body">
          {isAdmin ? (
            <section className="crud-chat-group-settings-section">
              <h3><FiShield aria-hidden="true" /> General</h3>
              <label className="crud-chat-group-settings-field">
                <span>Group name</span>
                <input
                  value={group.name}
                  maxLength={100}
                  onChange={(e) => onGroupChange({ ...group, name: e.target.value })}
                />
              </label>
              <div className="crud-chat-group-settings-toggle-grid">
                <label className="crud-chat-group-settings-toggle">
                  <input
                    type="radio"
                    checked={group.isPrivate !== false}
                    onChange={() => onGroupChange({ ...group, isPrivate: true, requireJoinApproval: true })}
                  />
                  <span>
                    <strong>Private</strong>
                    <small>Invite or admin approval only</small>
                  </span>
                </label>
                <label className="crud-chat-group-settings-toggle">
                  <input
                    type="radio"
                    checked={group.isPrivate === false}
                    onChange={() => onGroupChange({ ...group, isPrivate: false, requireJoinApproval: false })}
                  />
                  <span>
                    <strong>Public</strong>
                    <small>Discoverable in group list</small>
                  </span>
                </label>
              </div>
              <label className="crud-chat-group-settings-check">
                <input
                  type="checkbox"
                  checked={Boolean(group.requireJoinApproval)}
                  onChange={(e) => onGroupChange({ ...group, requireJoinApproval: e.target.checked })}
                />
                Require admin approval before new members join
              </label>
              <label className="crud-chat-group-settings-check">
                <input
                  type="checkbox"
                  checked={Boolean(group.onlyAdminCanSend)}
                  onChange={(e) => onGroupChange({ ...group, onlyAdminCanSend: e.target.checked })}
                />
                Only admin can send messages
              </label>
              <button type="button" className="crud-chat-group-settings-btn crud-chat-group-settings-btn--primary" disabled={saving} onClick={onSave}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </section>
          ) : (
            <section className="crud-chat-group-settings-section crud-chat-group-settings-section--muted">
              <p>
                {group.isPrivate === false ? "Public group" : "Private group"}
                {group.requireJoinApproval ? " · Join requests required" : " · Open join"}
                {group.onlyAdminCanSend ? " · Admin-only messaging" : " · Everyone can chat"}
              </p>
            </section>
          )}

          <section className="crud-chat-group-settings-section">
            <h3><FiUsers aria-hidden="true" /> Members</h3>
            <ul className="crud-chat-group-settings-members">
              {(group.members || []).map((member) => {
                const memberId = String(member._id || member);
                const memberIsAdmin = String(group.admin._id || group.admin) === memberId;
                return (
                  <li key={memberId}>
                    <button type="button" className="crud-chat-group-settings-members__row" onClick={() => onOpenProfile(member)}>
                      <img src={userAvatarUrl(member)} alt="" />
                      <span>@{member.userName}{memberIsAdmin ? " · admin" : ""}</span>
                    </button>
                    {isAdmin && !memberIsAdmin && (
                      <button type="button" className="crud-chat-group-settings-icon-btn" aria-label="Remove" onClick={() => onRemoveMember(memberId)}>
                        <FiUserMinus />
                      </button>
                    )}
                    {!isAdmin && memberId === String(userId) && !memberIsAdmin && (
                      <button type="button" className="crud-chat-group-settings-text-btn" onClick={() => onRemoveMember(memberId)}>
                        Leave
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {isAdmin && (
              <>
                <label className="crud-chat-group-settings-field">
                  <span>Add friend by username</span>
                  <input
                    value={addMemberQuery}
                    placeholder="Search friends only"
                    onChange={(e) => onAddMemberQuery(e.target.value)}
                  />
                </label>
                {addMemberResults.map((person) => (
                  <button key={person._id} type="button" className="crud-chat-group-settings-add" onClick={() => onAddMember(person._id)}>
                    <FiUserPlus aria-hidden="true" /> @{person.userName}
                  </button>
                ))}
              </>
            )}
          </section>

          {isAdmin && (
            <section className="crud-chat-group-settings-section">
              <h3><FiLink aria-hidden="true" /> Invite link</h3>
              <p className="crud-chat-group-settings-hint">
                Share this link. Anyone with an account can open it and choose Join group.
                Private groups still require friendship with the admin.
              </p>
              {inviteUrl ? (
                <div className="crud-chat-group-settings-invite-box">
                  <code className="crud-chat-group-settings-invite-url">{inviteUrl}</code>
                  <div className="crud-chat-group-settings-invite-actions">
                    <button type="button" className="crud-chat-group-settings-icon-btn" aria-label="Copy link" onClick={copyInvite}>
                      <FiCopy />
                    </button>
                    <button type="button" className="crud-chat-group-settings-icon-btn" aria-label="Rotate link" onClick={onRegenerateInvite}>
                      <FiRefreshCw />
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="crud-chat-group-settings-btn" onClick={onRegenerateInvite}>
                  Generate invite link
                </button>
              )}
            </section>
          )}

          {isAdmin && pendingCount > 0 && (
            <section className="crud-chat-group-settings-section">
              <h3>Join requests ({pendingCount})</h3>
              <ul className="crud-chat-group-settings-requests">
                {joinRequests.map((request) => {
                  const person = request.user;
                  const pid = String(person?._id || request.user);
                  return (
                    <li key={request._id || pid}>
                      <button type="button" className="crud-chat-group-settings-members__row" onClick={() => person && onOpenProfile(person)}>
                        <img src={userAvatarUrl(person || { _id: pid })} alt="" />
                        <span>@{person?.userName || "user"}</span>
                      </button>
                      <button type="button" className="crud-chat-group-settings-icon-btn crud-chat-group-settings-icon-btn--ok" aria-label="Approve" onClick={() => onApproveRequest(pid)}>
                        <FiCheck />
                      </button>
                      <button type="button" className="crud-chat-group-settings-icon-btn crud-chat-group-settings-icon-btn--danger" aria-label="Reject" onClick={() => onRejectRequest(pid)}>
                        <FiX />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {isAdmin && (
            <section className="crud-chat-group-settings-section crud-chat-group-settings-section--danger">
              <button type="button" className="crud-chat-group-settings-btn crud-chat-group-settings-btn--danger" onClick={onDeleteGroup}>
                Delete group
              </button>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default GroupSettingsModal;
