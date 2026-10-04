import { NavLink } from "react-router-dom";
import PageHero from "../components/PageHero";
import Chat from "../components/Chat";

const Home = () => {
  return (
    <div className="page-shell">
      <PageHero
        title="A quieter way to stay connected"
        description="Keep conversations, people, and everyday updates in one welcoming space."
        current="Home"
      />

      <NavLink className="home-cta" to="/chat">Chat Now</NavLink>
    </div>
  );
};

export default Home;
