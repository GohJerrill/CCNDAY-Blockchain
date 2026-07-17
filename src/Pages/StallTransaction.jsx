import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CareLinkLoader from "../components/CareLinkLoader";
import { useWeb3 } from "../context/Web3Context";
import "./StallTransaction.css";

const stallTypeOptions = [
  "Food & Beverages",
  "Games",
  "Gifts",
  "Pre-owned / Recycling",
  "Services",
  "Performance / Busking",
  "Others",
];

const schoolLabels = [
  "IIT",
  "Business",
  "Engineering",
  "Design",
  "Science",
  "Humanities",
  "Others",
];

const stallStatusLabels = ["Pending", "Open", "Closed", "Rejected"];

const transactionTypeLabels = [
  "Payment received",
  "Refund issued",
  "Withdrawal",
];

const transactionStatusLabels = ["Paid", "Refunded", "Withdrawn"];

const toNumber = (value) => {
  if (value === undefined || value === null) return 0;
  return Number(value.toString());
};

const isZeroAddress = (walletAddress) => {
  return (
    !walletAddress ||
    walletAddress.toLowerCase() === "0x0000000000000000000000000000000000000000"
  );
};

const formatWalletAddress = (walletAddress) => {
  if (isZeroAddress(walletAddress)) return "-";
  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
};

const formatDateTime = (unixTimestamp) => {
  if (!unixTimestamp) return "-";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(unixTimestamp * 1000));
};

const formatWeiToEth = (weiValue) => {
  const weiString = weiValue.toString();
  const isNegative = weiString.startsWith("-");
  const cleanValue = isNegative ? weiString.slice(1) : weiString;

  const wei = BigInt(cleanValue);
  const ether = 10n ** 18n;
  const whole = wei / ether;
  const fraction = (wei % ether).toString().padStart(18, "0").slice(0, 4);
  const cleanedFraction = fraction.replace(/0+$/, "");

  return `${isNegative ? "-" : "+"}${whole}${
    cleanedFraction ? `.${cleanedFraction}` : ""
  } ETH`;
};

const formatPositiveWeiToEth = (weiValue) => {
  const wei = BigInt(weiValue.toString());
  const ether = 10n ** 18n;
  const whole = wei / ether;
  const fraction = (wei % ether).toString().padStart(18, "0").slice(0, 4);
  const cleanedFraction = fraction.replace(/0+$/, "");

  return `${whole}${cleanedFraction ? `.${cleanedFraction}` : ""} ETH`;
};

const mapStallFromContract = (stall) => {
  const stallTypeValue = toNumber(stall.stallType ?? stall[4]);
  const stallSchoolValue = toNumber(stall.StallSchool ?? stall[7]);
  const stallStatusValue = toNumber(stall.stallStatus ?? stall[10]);

  return {
    StallID: toNumber(stall.StallID ?? stall[0]),
    StallName: stall.StallName ?? stall[1],
    StallDescription: stall.StallDescription ?? stall[2],
    StallImage: stall.StallImage ?? stall[3],
    StallType: stallTypeOptions[stallTypeValue] || "Others",
    StallOwnerWallet: stall.StallOwnerWallet ?? stall[5],
    StallLocation: stall.StallLocation ?? stall[6],
    StallSchool: schoolLabels[stallSchoolValue] || "Others",
    NeedElectricalPort: Boolean(stall.NeedElectricalPort ?? stall[8]),
    CreatedAt: toNumber(stall.CreatedAt ?? stall[9]),
    StallStatus: stallStatusLabels[stallStatusValue] || "Unknown",
    AllowedWithdrawal: Boolean(stall.AllowedWithdrawal ?? stall[11]),
    CCNDayID: toNumber(stall.CCNDayID ?? stall[12]),
    WithdrawalCompleted: Boolean(stall.WithdrawalCompleted ?? stall[13]),
  };
};

const mapTransactionFromContract = (transaction) => {
  const transactionTypeValue = toNumber(
    transaction.transactionType ?? transaction[9],
  );

  const paymentId = toNumber(transaction.PaymentID ?? transaction[0]);
  const withdrawalId = toNumber(transaction.WithdrawalID ?? transaction[1]);
  const customerWallet = transaction.CustomerWallet ?? transaction[4];
  const stallOwnerWallet = transaction.StallOwnerWallet ?? transaction[5];
  const signedAmount = (transaction.SignedAmount ?? transaction[7]).toString();
  const transactionAt = toNumber(transaction.TransactionAt ?? transaction[8]);

  const isNegative = BigInt(signedAmount) < 0n;
  const isWithdrawal = transactionTypeValue === 2;

  return {
    TransactionID: isWithdrawal ? `WDR-${withdrawalId}` : `PAY-${paymentId}`,
    PaymentID: paymentId,
    WithdrawalID: withdrawalId,
    StallID: toNumber(transaction.StallID ?? transaction[2]),
    CCNDayID: toNumber(transaction.CCNDayID ?? transaction[3]),
    CustomerWallet: customerWallet,
    StallOwnerWallet: stallOwnerWallet,
    Wallet: isWithdrawal ? stallOwnerWallet : customerWallet,
    Amount: signedAmount,
    DisplayAmount: formatWeiToEth(signedAmount),
    TransactionAt: transactionAt,
    Type: transactionTypeLabels[transactionTypeValue] || "Transaction",
    Status: transactionStatusLabels[transactionTypeValue] || "Recorded",
    amountType: isNegative ? "negative" : "positive",
    statusType: isNegative ? "negative" : "positive",
  };
};

const getTransactionNetEarned = (transactions) => {
  return transactions.reduce((total, transaction) => {
    const isWithdrawal = transaction.WithdrawalID > 0;

    if (isWithdrawal) {
      return total;
    }

    return total + BigInt(transaction.Amount);
  }, 0n);
};

const getFriendlyErrorMessage = (error) => {
  const message = [
    error?.reason,
    error?.shortMessage,
    error?.message,
    error?.info?.error?.message,
    error?.info?.error?.data?.message,
  ]
    .filter(Boolean)
    .join(" ");

  if (message.includes("StallDoesNotExist")) {
    return "The selected stall could not be found on the blockchain.";
  }

  if (message.includes("NotAllowedToViewStallTransactions")) {
    return "You are not allowed to view transactions for this stall.";
  }

  if (message.includes("WalletNotRegistered")) {
    return "Please register your wallet before viewing stall transactions.";
  }

  return "Unable to load this stall transaction page from the blockchain. Please try again.";
};

const StallTransaction = () => {
  const { stallId } = useParams();
  const navigate = useNavigate();

  const {
    isConnected,
    walletAddress,
    stallsContract,
    ccnDayContract,
    paymentsContract,
  } = useWeb3();

  const [selectedStall, setSelectedStall] = useState(null);
  const [ccnDayName, setCcnDayName] = useState("");
  const [stallTransactions, setStallTransactions] = useState([]);
  const [totalEarned, setTotalEarned] = useState("0 ETH");

  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const loadStallTransactionPage = async () => {
      if (
        !isConnected ||
        !walletAddress ||
        !stallsContract ||
        !paymentsContract
      ) {
        setIsLoadingPage(false);
        setSelectedStall(null);
        setStallTransactions([]);
        setPageError(
          "Please connect your wallet to view this stall transaction history.",
        );
        return;
      }

      try {
        setIsLoadingPage(true);
        setPageError("");

        const numericStallId = Number(stallId);

        if (!numericStallId) {
          setSelectedStall(null);
          setStallTransactions([]);
          setPageError("Invalid stall selected.");
          return;
        }

        const contractStall =
          await stallsContract.GetStallDetails(numericStallId);

        const mappedStall = mapStallFromContract(contractStall);

        let resolvedCCNDayName = `CCN Day #${mappedStall.CCNDayID}`;

        if (ccnDayContract && mappedStall.CCNDayID) {
          try {
            const contractCCNDay = await ccnDayContract.GetCCNDayByID(
              mappedStall.CCNDayID,
            );

            resolvedCCNDayName =
              contractCCNDay.CCNName ?? contractCCNDay[1] ?? resolvedCCNDayName;
          } catch (error) {
            console.error("CCN Day name load error:", error);
          }
        }

        const contractTransactions =
          await paymentsContract.GetStallTransactionHistory(numericStallId);

        const mappedTransactions = contractTransactions
          .map(mapTransactionFromContract)
          .sort((firstTransaction, secondTransaction) => {
            return (
              secondTransaction.TransactionAt - firstTransaction.TransactionAt
            );
          });

        setSelectedStall(mappedStall);
        setCcnDayName(resolvedCCNDayName);
        setStallTransactions(mappedTransactions);
        setTotalEarned(
          formatPositiveWeiToEth(getTransactionNetEarned(mappedTransactions)),
        );
      } catch (error) {
        console.error("Stall transaction page load error:", error);

        setSelectedStall(null);
        setStallTransactions([]);
        setPageError(getFriendlyErrorMessage(error));
      } finally {
        setIsLoadingPage(false);
      }
    };

    loadStallTransactionPage();
  }, [
    isConnected,
    walletAddress,
    stallId,
    stallsContract,
    ccnDayContract,
    paymentsContract,
  ]);

  if (isLoadingPage) {
    return (
      <main className="stall-transaction-page">
        <section className="stall-transaction-empty">
          <CareLinkLoader
            label="Loading stall transactions..."
            sublabel="Please wait while CareLink loads this stall's blockchain records."
          />
        </section>
      </main>
    );
  }

  if (pageError || !selectedStall) {
    return (
      <main className="stall-transaction-page">
        <section className="stall-transaction-empty">
          <h1>Stall transaction unavailable</h1>

          <p>{pageError || "The selected stall could not be found."}</p>

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
          <span className="stall-transaction-kicker">{ccnDayName}</span>

          <h1>{selectedStall.StallName}</h1>

          <p>{selectedStall.StallDescription}</p>

          <div className="stall-transaction-info-grid">
            <div>
              <span>Type</span>
              <strong>{selectedStall.StallType}</strong>
            </div>

            <div>
              <span>Location</span>
              <strong>{selectedStall.StallLocation || "-"}</strong>
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
              <strong>
                {selectedStall.WithdrawalCompleted
                  ? "Completed"
                  : selectedStall.AllowedWithdrawal
                    ? "Allowed"
                    : "Not allowed"}
              </strong>
            </div>

            <div>
              <span>Total earned</span>
              <strong>{totalEarned}</strong>
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

        {stallTransactions.length === 0 ? (
          <div className="stall-transaction-empty">
            <h1>No transaction records found</h1>

            <p>
              This stall does not have any payment, refund, or withdrawal
              records yet.
            </p>
          </div>
        ) : (
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
                  <tr
                    key={`${transaction.TransactionID}-${transaction.TransactionAt}`}
                  >
                    <td>{transaction.TransactionID}</td>

                    <td>{transaction.Type}</td>

                    <td title={transaction.Wallet}>
                      {formatWalletAddress(transaction.Wallet)}
                    </td>

                    <td
                      className={
                        transaction.amountType === "negative"
                          ? "negative"
                          : "positive"
                      }
                    >
                      {transaction.DisplayAmount}
                    </td>

                    <td>
                      <span
                        className={
                          transaction.statusType === "negative"
                            ? "stall-transaction-status negative"
                            : "stall-transaction-status positive"
                        }
                      >
                        {transaction.Status}
                      </span>
                    </td>

                    <td>{formatDateTime(transaction.TransactionAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

export default StallTransaction;
