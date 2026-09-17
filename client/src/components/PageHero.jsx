import { NavLink } from "react-router-dom";

const PageHero = ({ eyebrow = "Chat App", title, description, current }) => {
  return (
    <section className="page-hero" aria-labelledby="page-hero-title">
      <div className="page-hero__grid">
        <div className="page-hero__content">
          <span className="page-hero__eyebrow">{eyebrow}</span>

          <h1 id="page-hero-title" className="page-hero__title">
            {title}
          </h1>

          {description && (
            <p className="page-hero__description">{description}</p>
          )}
        </div>

        <nav className="page-hero__breadcrumb" aria-label="Breadcrumb">
          <NavLink to="/">Home</NavLink>

          <span aria-hidden="true">/</span>

          <span aria-current="page">{current || title}</span>
        </nav>
      </div>

      <div className="page-hero__line" />
    </section>
  );
};

export default PageHero;
