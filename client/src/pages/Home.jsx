import PageHero from "../components/PageHero";

const Home = () => {
  return (
    <div className="page-shell">
      <PageHero
        title="A quieter way to stay connected"
        description="Keep conversations, people, and everyday updates in one welcoming space."
        current="Home"
      />
    </div>
  );
};

export default Home;
