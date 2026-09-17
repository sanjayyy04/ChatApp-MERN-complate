import React from "react";
import RegForm from "../components/RegForm";
import PageHero from "../components/PageHero";

const Reg = () => {
  return (
    <div className="page-shell">
      <PageHero
        eyebrow="Join the conversation"
        title="Create your account"
        description="Start building your profile and connect with your people."
        current="Register"
      />
      <RegForm />
    </div>
  );
};

export default Reg;
