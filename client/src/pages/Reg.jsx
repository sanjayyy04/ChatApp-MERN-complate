import RegForm from "../components/RegForm";
import { APP_NAME } from "../constants/app";

const Reg = () => {
  return (
    <div className="crud-chat-auth">
      <header className="crud-chat-auth__header">
        <h1>{APP_NAME}</h1>
        <p>Sign in to see your chats and connect with friends.</p>
      </header>
      <RegForm />
    </div>
  );
};

export default Reg;
