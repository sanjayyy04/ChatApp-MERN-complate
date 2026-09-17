import PageHero from "../components/PageHero";

const About = () => {
  return (
    <div className="page-shell">
      <PageHero
        eyebrow="Our space"
        title="Built for genuine connection"
        description="Chat App keeps your community simple, personal, and easy to navigate."
        current="About"
      />
    </div>
  );
};

export default About;
