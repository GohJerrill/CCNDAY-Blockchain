import { useNavigate } from "react-router-dom";
import { mockArchivedStalls } from "../data/mockStallHistory";
import "./StallHistory.css";

const StallHistory = () => {
  const navigate = useNavigate();

  const handleViewTransactions = (stallId) => {
    navigate(`/StallTransactions/${stallId}`);
  };

  return (
    <main className="stall-history-page">
      <section className="stall-history-header">
        <span className="stall-history-kicker">Archived stalls</span>
        <h1>Stall History</h1>
        <p>
          View your previous completed stalls after their CCN Day has ended and
          withdrawal has been completed.
        </p>
      </section>

      <section className="stall-history-grid">
        {mockArchivedStalls.map((stall) => (
          <article
            key={stall.StallID}
            className="stall-history-card"
            onClick={() => handleViewTransactions(stall.StallID)}
          >
            <div className="stall-history-card-image-wrap">
              {stall.StallImage ? (
                <img
                  src={stall.StallImage}
                  alt={stall.StallName}
                  className="stall-history-card-image"
                />
              ) : (
                <div className="stall-history-card-image-placeholder">
                  No Image
                </div>
              )}
            </div>

            <div className="stall-history-card-content">
              <div className="stall-history-card-topline">
                <span>{stall.CCNDayName}</span>
                <span>{stall.WithdrawalStatus}</span>
              </div>

              <h2>{stall.StallName}</h2>

              <p>{stall.StallDescription}</p>

              <div className="stall-history-card-details">
                <span>{stall.StallType}</span>
                <span>{stall.StallSchool}</span>
                <span>{stall.TotalTransactions} transactions</span>
              </div>

              <div className="stall-history-card-footer">
                <strong>{stall.TotalEarned}</strong>
                <button type="button">View transactions</button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
};

export default StallHistory;
