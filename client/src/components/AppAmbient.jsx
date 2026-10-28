/** Fixed decorative layers behind the app (no interaction). */
const AppAmbient = () => (
  <div className="crud-chat-ambient" aria-hidden="true">
    <div className="crud-chat-ambient__orb crud-chat-ambient__orb--gold" />
    <div className="crud-chat-ambient__orb crud-chat-ambient__orb--warm" />
    <div className="crud-chat-ambient__orb crud-chat-ambient__orb--deep" />
    <div className="crud-chat-ambient__mesh" />
    <div className="crud-chat-ambient__grain" />
  </div>
);

export default AppAmbient;
