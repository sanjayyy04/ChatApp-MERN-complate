import { Navigate, useLocation } from "react-router-dom";
import { loginRedirectForInvitePath } from "../utils/groupInvite";

/** Sends guests with an invite link to login while preserving return URL. */
const GuestInviteGate = () => {
  const location = useLocation();
  const returnPath = `${location.pathname}${location.search}`;
  return <Navigate to={loginRedirectForInvitePath(returnPath)} replace />;
};

export default GuestInviteGate;
