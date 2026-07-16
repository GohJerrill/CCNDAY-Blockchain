import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  mockArchivedStalls,
  mockStallTransactions,
} from "../data/mockStallHistory";
import "./StallTransaction.css";

const StallTransaction = () => {
  const { stallId } = useParams();
  const navigate = useNavigate();

  const selectedStall = useMemo(() => {
    return mockArchivedStalls.find(
      (stall) => String(stall.StallID) === String(stallId),
    );
  }, [stallId]);

  const stallTransactions = useMemo(() => {
    return mockStallTransactions.filter(
      (transaction) => String(transaction.StallID) === String(stallId),
    );
  }, [stallId]);

  if (!selectedStall) {
    return (
      <main className="stall-transaction-page">
        <section className="stall-transaction-empty">
          <h1>Stall not found</h1>
          <p>The selected stall could not be found.</p>
          <button type="button" onClick={() => navigate("/StallHistory")}>
            Back to Stall History
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="stall-transaction-page">
      <button
        type="button"
        className="stall-transaction-back-button"
        onClick={() => navigate("/StallHistory")}
      >
        ← Back to Stall History
      </button>

      <section className="stall-transaction-hero">
        <div className="stall-transaction-image-wrap">
          {selectedStall.StallImage ? (
            <img
              src={selectedStall.StallImage}
              alt={selectedStall.StallName}
              className="stall-transaction-image"
            />
          ) : (
            <div className="stall-transaction-image-placeholder">No Image</div>
          )}
        </div>

        <div className="stall-transaction-details">
          <span className="stall-transaction-kicker">
            {selectedStall.CCNDayName}
          </span>

          <h1>{selectedStall.StallName}</h1>

          <p>{selectedStall.StallDescription}</p>

          <div className="stall-transaction-info-grid">
            <div>
              <span>Type</span>
              <strong>{selectedStall.StallType}</strong>
            </div>

            <div>
              <span>Location</span>
              <strong>{selectedStall.StallLocation}</strong>
            </div>

            <div>
              <span>School</span>
              <strong>{selectedStall.StallSchool}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{selectedStall.StallStatus}</strong>
            </div>

            <div>
              <span>Withdrawal</span>
              <strong>{selectedStall.WithdrawalStatus}</strong>
            </div>

            <div>
              <span>Total earned</span>
              <strong>{selectedStall.TotalEarned}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="stall-transaction-table-section">
        <div className="stall-transaction-table-header">
          <div>
            <span className="stall-transaction-kicker">
              Transaction records
            </span>
            <h2>Stall Transaction History</h2>
          </div>

          <span>{stallTransactions.length} records</span>
        </div>

        <div className="stall-transaction-table-wrap">
          <table className="stall-transaction-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Type</th>
                <th>Wallet</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {stallTransactions.map((transaction) => (
                <tr key={transaction.TransactionID}>
                  <td>{transaction.TransactionID}</td>
                  <td>{transaction.Type}</td>
                  <td>{transaction.Wallet}</td>
                  <td>{transaction.Amount}</td>
                  <td>
                    <span className="stall-transaction-status">
                      {transaction.Status}
                    </span>
                  </td>
                  <td>{transaction.Date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default StallTransaction;
