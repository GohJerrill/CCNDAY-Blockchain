import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CareLinkLoader from "../components/CareLinkLoader";
import { useWeb3 } from "../context/Web3Context";
import "./StallHistory.css";

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

const toNumber = (value) => {
  if (value === undefined || value === null) return 0;
  return Number(value.toString());
};

const formatWeiToEth = (weiValue) => {
  const wei = BigInt(weiValue);
  const ether = 10n ** 18n;
  const whole = wei / ether;
  const fraction = (wei % ether).toString().padStart(18, "0").slice(0, 4);
  const cleanedFraction = fraction.replace(/0+$/, "");

  return `${whole}${cleanedFraction ? `.${cleanedFraction}` : ""} ETH`;
};

const formatSGDCents = (centsValue) => {
  const cents = BigInt(centsValue || "0");
  const dollars = cents / 100n;
  const centsPart = (cents % 100n).toString().padStart(2, "0");

  return `S$${dollars}.${centsPart}`;
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

const getTransactionNetEarnedTotals = (transactions) => {
  return transactions.reduce(
    (totals, transaction) => {
      const transactionTypeValue = toNumber(
        transaction.transactionType ?? transaction[11],
      );

      const signedAmountWei = BigInt(
        (transaction.SignedAmount ?? transaction[7] ?? "0").toString(),
      );

      const signedAmountSGDCents = BigInt(
        (transaction.SignedAmountSGDCents ?? transaction[9] ?? "0").toString(),
      );

      const isWithdrawalTransaction = transactionTypeValue === 2;

      if (isWithdrawalTransaction) {
        return totals;
      }

      return {
        totalWei: totals.totalWei + signedAmountWei,
        totalSGDCents: totals.totalSGDCents + signedAmountSGDCents,
      };
    },
    {
      totalWei: 0n,
      totalSGDCents: 0n,
    },
  );
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

  if (message.includes("WalletHasNotCreatedStall")) {
    return "You do not have any stall history yet.";
  }

  if (message.includes("WalletNotRegistered")) {
    return "Please register your wallet before viewing stall history.";
  }

  return "Unable to load your stall history from the blockchain. Please try again.";
};

const StallHistory = () => {
  const navigate = useNavigate();

  const {
    isConnected,
    walletAddress,
    stallsContract,
    ccnDayContract,
    paymentsContract,
  } = useWeb3();

  const [archivedStalls, setArchivedStalls] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const handleViewTransactions = (stallId) => {
    navigate(`/StallTransactions/${stallId}`);
  };

  useEffect(() => {
    const loadStallHistory = async () => {
      if (!isConnected || !walletAddress || !stallsContract) {
        setIsLoadingHistory(false);
        setArchivedStalls([]);
        setHistoryError(
          "Please connect your wallet to view your stall history.",
        );
        return;
      }

      try {
        setIsLoadingHistory(true);
        setHistoryError("");

        const contractStalls = await stallsContract.GetMyStallHistory();

        const mappedStalls = await Promise.all(
          contractStalls.map(async (contractStall) => {
            const mappedStall = mapStallFromContract(contractStall);

            let ccnDayName = `CCN Day #${mappedStall.CCNDayID}`;
            let totalTransactions = 0;
            let totalEarnedSGD = "S$0.00";
            let totalEarnedETH = "0 ETH";

            if (ccnDayContract && mappedStall.CCNDayID) {
              try {
                const contractCCNDay = await ccnDayContract.GetCCNDayByID(
                  mappedStall.CCNDayID,
                );

                ccnDayName =
                  contractCCNDay.CCNName ?? contractCCNDay[1] ?? ccnDayName;
              } catch (error) {
                console.error("CCN Day history name load error:", error);
              }
            }

            if (paymentsContract && mappedStall.StallID) {
              try {
                const contractTransactions =
                  await paymentsContract.GetStallTransactionHistory(
                    mappedStall.StallID,
                  );

                const earnedTotals =
                  getTransactionNetEarnedTotals(contractTransactions);

                totalTransactions = contractTransactions.length;
                totalEarnedSGD = formatSGDCents(earnedTotals.totalSGDCents);
                totalEarnedETH = formatWeiToEth(earnedTotals.totalWei);
              } catch (error) {
                console.error("Stall history transaction load error:", error);
              }
            }

            return {
              ...mappedStall,
              CCNDayName: ccnDayName,
              WithdrawalStatus: mappedStall.WithdrawalCompleted
                ? "Completed"
                : "Unresolved",
              TotalTransactions: totalTransactions,
              TotalEarnedSGD: totalEarnedSGD,
              TotalEarnedETH: totalEarnedETH,
            };
          }),
        );

        setArchivedStalls(mappedStalls);
      } catch (error) {
        console.error("Stall history load error:", error);
        setArchivedStalls([]);
        setHistoryError(getFriendlyErrorMessage(error));
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadStallHistory();
  }, [
    isConnected,
    walletAddress,
    stallsContract,
    ccnDayContract,
    paymentsContract,
  ]);

  return (
    <main className="stall-history-page">
      <section className="stall-history-header">
        <span className="stall-history-kicker">Archived stalls</span>

        <h1>Stall History</h1>

        <p className="BRUH">
          View your previous completed stalls after their CCN Day has ended and
          withdrawal has been completed.
        </p>
      </section>

      {isLoadingHistory ? (
        <section className="stall-history-empty-state">
          <CareLinkLoader
            label="Loading stall history..."
            sublabel="Please wait while CareLink loads your archived stalls."
          />
        </section>
      ) : historyError ? (
        <section className="stall-history-empty-state">
          <h2>Unable to load stall history</h2>
          <p>{historyError}</p>
        </section>
      ) : archivedStalls.length === 0 ? (
        <section className="stall-history-empty-state">
          <h2>No stall history found</h2>
          <p>
            You do not have any completed archived stalls yet. Once a CCN Day
            has ended and withdrawal has been completed, your stall will appear
            here.
          </p>
        </section>
      ) : (
        <section className="stall-history-grid">
          {archivedStalls.map((stall) => (
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
                  <div className="stall-history-earned-amount">
                    <strong>{stall.TotalEarnedSGD}</strong>
                    <span>{stall.TotalEarnedETH}</span>
                  </div>

                  <button type="button">View transactions</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
};

export default StallHistory;
