import { useProfileSheet } from "../context/ProfileSheetContext";

const UsernameLink = ({ person, className = "", showAt = true, onClick }) => {
  const { openProfile } = useProfileSheet();

  if (!person?.userName) return null;

  const handleClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    onClick?.(event);
    openProfile(person);
  };

  return (
    <button
      type="button"
      className={`username-link${className ? ` ${className}` : ""}`}
      onClick={handleClick}
    >
      {showAt ? `@${person.userName}` : person.userName}
    </button>
  );
};

export default UsernameLink;
