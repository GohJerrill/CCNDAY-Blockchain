import { useNavigate } from "react-router-dom";
import Error404Image from "../assets/404Error.svg";
import "./NotFound.css";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <div className="not-found-image-wrapper">
          <img src={Error404Image} alt="404 page not found" />
        </div>

        <span className="not-found-eyebrow">404 Page not found</span>

        <h1>Looks like this page does not exist.</h1>

        <p>
          The link may be incorrect, removed, or not part of CareLink. Please
          return to your dashboard and continue from there.
        </p>

        <div className="not-found-actions">
          <button type="button" onClick={() => navigate("/UserDashboard")}>
            Back to dashboard
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => navigate(-1)}
          >
            Go back
          </button>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
