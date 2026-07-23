import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import CareLinkLoader from "../components/CareLinkLoader";
import EmptyStallImage from "../assets/EmptyStall.svg";
import "./OrganiserStallInformation.css";

const STALL_STATUS = {
  Pending: 0,
  Open: 1,
  Closed: 2,
  Rejected: 3,
};

const TRANSACTION_TYPE_LABELS = {
  0: "Payment received",
  1: "Refund issued",
  2: "Withdrawal",
};

const PRODUCT_STATUS_LABELS = {
  0: "Available",
  1: "Unavailable",
};

const STALL_TYPE_LABELS = {
  0: "Food & Beverages",
  1: "Games",
  2: "Gifts",
  3: "Pre-owned/Recycling",
  4: "Services",
  5: "Performance/Busking",
  6: "Others",
};

const SCHOOL_OPTIONS = [
  { label: "IIT", value: 0 },
  { label: "Business", value: 1 },
  { label: "Engineering", value: 2 },
  { label: "Design", value: 3 },
  { label: "Science", value: 4 },
  { label: "Humanities", value: 5 },
];

const SCHOOL_LABELS = {
  0: "IIT",
  1: "Business",
  2: "Engineering",
  3: "Design",
  4: "Science",
  5: "Humanities",
  6: "Others",
};

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
};

const toBigIntValue = (value) => {
  try {
    if (value === null || value === undefined) return 0n;
    if (typeof value === "bigint") return value;
    return BigInt(value.toString());
  } catch {
    return 0n;
  }
};

const formatWalletAddress = (walletAddress) => {
  if (!walletAddress) return "-";
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
};

const formatDisplayDateTimeFromUnix = (unixSeconds) => {
  const timestamp = toNumber(unixSeconds);

  if (!timestamp) return "-";

  return new Date(timestamp * 1000).toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatWeiToEth = (weiValue) => {
  const value = toBigIntValue(weiValue);
  const absoluteValue = value < 0n ? -value : value;

  return `${ethers.formatEther(absoluteValue)} ETH`;
};

const formatSignedWeiToEth = (weiValue) => {
  const value = toBigIntValue(weiValue);
  const sign = value < 0n ? "-" : "+";

  return `${sign}${formatWeiToEth(value)}`;
};

const formatSGDCents = (centsValue) => {
  const cents = toBigIntValue(centsValue);
  const dollars = cents / 100n;
  const centsPart = (cents % 100n).toString().padStart(2, "0");

  return `S$${dollars}.${centsPart}`;
};

const formatSignedSGDCents = (signedCentsValue) => {
  const value = toBigIntValue(signedCentsValue);
  const sign = value < 0n ? "-" : "+";
  const absoluteValue = value < 0n ? -value : value;

  return `${sign}${formatSGDCents(absoluteValue)}`;
};

const getStallStatusLabel = (stallStatus) => {
  const statusValue = toNumber(stallStatus);

  if (statusValue === STALL_STATUS.Pending) return "Pending";
  if (statusValue === STALL_STATUS.Open) return "Approved / Open";
  if (statusValue === STALL_STATUS.Closed) return "Approved / Closed";
  if (statusValue === STALL_STATUS.Rejected) return "Rejected";

  return "Unknown";
};

const getReadableError = (error) => {
  const rawMessage =
    error?.reason || error?.shortMessage || error?.message || "";

  if (rawMessage.includes("OnlyPendingStallCanBeApproved")) {
    return "Only pending stalls can be approved.";
  }

  if (rawMessage.includes("OnlyPendingStallCanBeRejected")) {
    return "Only pending stalls can be rejected.";
  }

  if (rawMessage.includes("EmptyStallLocation")) {
    return "Please enter a stall location before approving.";
  }

  if (rawMessage.includes("StallLocationTooLong")) {
    return "Stall location must be 120 characters or less.";
  }

  if (rawMessage.includes("EligibleSchoolCannotBeOthers")) {
    return "Please select a valid stall school.";
  }

  if (rawMessage.includes("CurrentCCNDayNotActive")) {
    return "This CCN Day is no longer active, so this stall cannot be approved.";
  }

  if (rawMessage.includes("StallNotFromCurrentCCNDay")) {
    return "Only stalls from the current CCN Day can be approved or rejected.";
  }

  if (rawMessage.includes("CCNDayNotEnded")) {
    return "Withdrawal can only be allowed after the CCN Day has ended.";
  }

  if (rawMessage.includes("WithdrawalAlreadyAllowed")) {
    return "Withdrawal has already been allowed for this stall.";
  }

  if (rawMessage.includes("CannotDeleteStallDuringCCNDay")) {
    return "This stall cannot be deleted while the CCN Day is ongoing.";
  }

  if (rawMessage.includes("CCNDayAlreadyStarted")) {
    return "Stall deletion is only available before CCN Day starts. Once CCN Day has started, the stall becomes part of the event record.";
  }

  if (rawMessage.includes("StallHasUnsettledPaidPayments")) {
    return "This stall has unsettled paid payments, so it cannot be deleted.";
  }

  if (rawMessage.includes("StallDoesNotExist")) {
    return "This stall could not be found.";
  }

  if (rawMessage.includes("NotOrganiser")) {
    return "Only the organiser wallet can perform this action.";
  }

  if (rawMessage.toLowerCase().includes("user rejected")) {
    return "Transaction was rejected in MetaMask.";
  }

  return rawMessage || "Something went wrong. Please try again.";
};

const mapCCNDayFromContract = (ccnDay) => {
  return {
    id: toNumber(ccnDay.CCNDayID ?? ccnDay[0]),
    name: ccnDay.CCNName ?? ccnDay[1],
    startTime: toNumber(ccnDay.StartDateTime ?? ccnDay[3]),
    endTime: toNumber(ccnDay.EndDateTime ?? ccnDay[4]),
  };
};

const mapStallFromContract = (stall) => {
  const stallStatus = toNumber(stall.stallStatus ?? stall[10]);

  return {
    id: toNumber(stall.StallID ?? stall[0]),
    name: stall.StallName ?? stall[1],
    description: stall.StallDescription ?? stall[2],
    image: stall.StallImage ?? stall[3],
    type: STALL_TYPE_LABELS[toNumber(stall.stallType ?? stall[4])] || "Unknown",
    ownerWallet: stall.StallOwnerWallet ?? stall[5],
    location: stall.StallLocation ?? "",
    school: SCHOOL_LABELS[toNumber(stall.StallSchool ?? stall[7])] || "Unknown",
    needElectricalPort: Boolean(stall.NeedElectricalPort ?? stall[8]),
    createdAt: formatDisplayDateTimeFromUnix(stall.CreatedAt ?? stall[9]),
    status: stallStatus,
    statusLabel: getStallStatusLabel(stallStatus),
    allowedWithdrawal: Boolean(stall.AllowedWithdrawal ?? stall[11]),
    ccnDayId: toNumber(stall.CCNDayID ?? stall[12]),
    withdrawalCompleted: Boolean(stall.WithdrawalCompleted ?? stall[13]),
  };
};

const mapTransactionFromContract = (transaction, index) => {
  const paymentId = toNumber(transaction.PaymentID ?? transaction[0]);
  const withdrawalId = toNumber(transaction.WithdrawalID ?? transaction[1]);

  const transactionType = toNumber(
    transaction.transactionType ?? transaction[11],
  );

  const signedAmount = (
    transaction.SignedAmount ??
    transaction[7] ??
    "0"
  ).toString();

  const amountSGDCents = (
    transaction.AmountSGDCents ??
    transaction[8] ??
    "0"
  ).toString();

  const signedAmountSGDCents = (
    transaction.SignedAmountSGDCents ??
    transaction[9] ??
    "0"
  ).toString();

  const transactionAtUnix = toNumber(
    transaction.TransactionAt ?? transaction[10],
  );

  const hasSGDAmount = toBigIntValue(signedAmountSGDCents) !== 0n;

  const amountType = hasSGDAmount
    ? toBigIntValue(signedAmountSGDCents) < 0n
      ? "negative"
      : "positive"
    : toBigIntValue(signedAmount) < 0n
      ? "negative"
      : "positive";

  return {
    id: `${paymentId}-${withdrawalId}-${transactionType}-${index}`,
    paymentId,
    withdrawalId,
    customerWallet: transaction.CustomerWallet ?? transaction[4],
    amount: transaction.Amount ?? transaction[6],
    signedAmount,
    amountSGDCents,
    signedAmountSGDCents,
    displayAmount: hasSGDAmount
      ? formatSignedSGDCents(signedAmountSGDCents)
      : formatSignedWeiToEth(signedAmount),
    ethAmount: hasSGDAmount ? formatSignedWeiToEth(signedAmount) : "",
    transactionAtUnix,
    transactionAt: formatDisplayDateTimeFromUnix(transactionAtUnix),
    transactionType,
    transactionTypeLabel:
      TRANSACTION_TYPE_LABELS[transactionType] || "Unknown transaction",
    amountType,
  };
};

const mapProductFromContract = (product) => {
  const productStatus = toNumber(product.productStatus ?? product[6]);

  return {
    id: toNumber(product.ProductID ?? product[0]),
    stallId: toNumber(product.StallID ?? product[1]),
    name: product.ProductName ?? product[2],
    description: product.ProductDescription ?? product[3],
    image: product.ProductImage ?? product[4],
    priceSGDCents: (
      product.ProductPriceSGDCents ??
      product[5] ??
      "0"
    ).toString(),
    status: productStatus,
    statusLabel: PRODUCT_STATUS_LABELS[productStatus] || "Unknown",
  };
};

const OrganiserStallInformation = () => {
  const navigate = useNavigate();
  const { ccnDayId, stallId } = useParams();
  const { ccnDayContract, stallsContract, paymentsContract } = useWeb3();

  const selectedCCNDayId = toNumber(ccnDayId);
  const selectedStallId = toNumber(stallId);

  const [ccnDay, setCcnDay] = useState(null);
  const [stall, setStall] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [withdrawableBalance, setWithdrawableBalance] = useState(0n);
  const [isCCNDayEnded, setIsCCNDayEnded] = useState(false);

  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);
  const [pageError, setPageError] = useState("");

  const [activeModal, setActiveModal] = useState(null);
  const [modalMessage, setModalMessage] = useState("");

  const [approveLocation, setApproveLocation] = useState("");
  const [approveSchool, setApproveSchool] = useState("");
  const [approveFormError, setApproveFormError] = useState("");

  const isPendingStall = stall?.status === STALL_STATUS.Pending;
  const isApprovedStall =
    stall?.status === STALL_STATUS.Open ||
    stall?.status === STALL_STATUS.Closed;
  const isRejectedStall = stall?.status === STALL_STATUS.Rejected;

  const currentUnixTimestamp = Math.floor(Date.now() / 1000);

  const hasCCNDayStarted =
    Boolean(ccnDay) && currentUnixTimestamp >= ccnDay.startTime;

  const hasCCNDayEnded =
    Boolean(ccnDay) && currentUnixTimestamp >= ccnDay.endTime;

  const canDecidePendingStall =
    isPendingStall && Boolean(ccnDay) && !hasCCNDayStarted;

  const isPendingDecisionWindowClosed =
    isPendingStall && Boolean(ccnDay) && hasCCNDayStarted;

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((first, second) => {
      return second.transactionAtUnix - first.transactionAtUnix;
    });
  }, [transactions]);

  const canAllowWithdrawal =
    isApprovedStall &&
    isCCNDayEnded &&
    !stall?.allowedWithdrawal &&
    !stall?.withdrawalCompleted;

  const canDeleteStall =
    isApprovedStall &&
    Boolean(ccnDay) &&
    Math.floor(Date.now() / 1000) < ccnDay.startTime &&
    !stall?.withdrawalCompleted;

  const loadStallInformation = useCallback(async () => {
    if (!ccnDayContract || !stallsContract) {
      setPageError("Smart contracts are not ready yet.");
      setIsLoadingPage(false);
      return;
    }

    if (!selectedCCNDayId || !selectedStallId) {
      setPageError("Invalid CCN Day or stall selected.");
      setIsLoadingPage(false);
      return;
    }

    try {
      setIsLoadingPage(true);
      setPageError("");

      const [selectedCCNDay, selectedStall, hasCCNDayEnded] = await Promise.all(
        [
          ccnDayContract.GetCCNDayByID(selectedCCNDayId),
          stallsContract.GetStallDetails(selectedStallId),
          stallsContract.IsStallCCNDayEnded(selectedStallId),
        ],
      );

      const mappedStall = mapStallFromContract(selectedStall);

      let mappedTransactions = [];
      let mappedProducts = [];
      let stallWithdrawableBalance = 0n;

      const productIds =
        await stallsContract.GetProductIDsByStallID(selectedStallId);

      if (productIds.length > 0) {
        const productResults = await Promise.all(
          productIds.map((productId) => stallsContract.Products(productId)),
        );

        mappedProducts = productResults.map(mapProductFromContract);
      }

      if (paymentsContract && mappedStall.status !== STALL_STATUS.Pending) {
        const [transactionHistory, withdrawableBalanceResult] =
          await Promise.all([
            paymentsContract.GetStallTransactionHistory(selectedStallId),
            paymentsContract.GetStallWithdrawableBalance(selectedStallId),
          ]);

        mappedTransactions = transactionHistory.map(mapTransactionFromContract);
        stallWithdrawableBalance = toBigIntValue(withdrawableBalanceResult);
      }

      setCcnDay(mapCCNDayFromContract(selectedCCNDay));
      setStall(mappedStall);
      setTransactions(mappedTransactions);
      setProducts(mappedProducts);
      setWithdrawableBalance(stallWithdrawableBalance);
      setIsCCNDayEnded(Boolean(hasCCNDayEnded));
    } catch (error) {
      console.error("Load organiser stall information error:", error);
      setPageError(getReadableError(error));
      setCcnDay(null);
      setStall(null);
      setTransactions([]);
      setProducts([]);
      setWithdrawableBalance(0n);
      setIsCCNDayEnded(false);
    } finally {
      setIsLoadingPage(false);
    }
  }, [
    ccnDayContract,
    stallsContract,
    paymentsContract,
    selectedCCNDayId,
    selectedStallId,
  ]);

  useEffect(() => {
    loadStallInformation();
  }, [loadStallInformation]);

  const closeModal = () => {
    if (isSubmittingTransaction) return;

    setActiveModal(null);
    setModalMessage("");
    setApproveFormError("");
  };

  const openApproveModal = () => {
    setApproveLocation("");
    setApproveSchool("");
    setApproveFormError("");
    setActiveModal("approve");
  };

  const showSuccessModal = (message) => {
    setModalMessage(message);
    setActiveModal("success");
  };

  const showErrorModal = (message) => {
    setModalMessage(message);
    setActiveModal("error");
  };

  const handleBreadcrumbToStallManagement = () => {
    navigate("/Organiser/StallManagement");
  };

  const handleBreadcrumbToCCNDayStalls = () => {
    navigate(`/Organiser/StallManagement/${selectedCCNDayId}`);
  };

  const handleApproveStall = async () => {
    if (!ccnDay || Math.floor(Date.now() / 1000) >= ccnDay.startTime) {
      showErrorModal(
        "This stall can no longer be approved because the CCN Day has already started.",
      );
      return;
    }

    const trimmedLocation = approveLocation.trim();

    if (!trimmedLocation) {
      setApproveFormError("Please enter the stall location.");
      return;
    }

    if (trimmedLocation.length > 120) {
      setApproveFormError("Stall location must be 120 characters or less.");
      return;
    }

    if (approveSchool === "") {
      setApproveFormError("Please select the stall school place.");
      return;
    }

    try {
      setIsSubmittingTransaction(true);

      const transaction = await stallsContract.ApproveStall(
        selectedStallId,
        trimmedLocation,
        Number(approveSchool),
      );

      await transaction.wait();

      await loadStallInformation();

      showSuccessModal("Stall has been approved successfully.");
    } catch (error) {
      console.error("Approve stall error:", error);
      showErrorModal(getReadableError(error));
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  const handleRejectStall = async () => {
    if (!ccnDay || Math.floor(Date.now() / 1000) >= ccnDay.startTime) {
      showErrorModal(
        "This stall can no longer be rejected because the CCN Day has already started.",
      );
      return;
    }

    try {
      setIsSubmittingTransaction(true);

      const transaction = await stallsContract.RejectStall(selectedStallId);

      await transaction.wait();

      await loadStallInformation();

      showSuccessModal("Stall has been rejected successfully.");
    } catch (error) {
      console.error("Reject stall error:", error);
      showErrorModal(getReadableError(error));
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  const handleDeleteStall = async () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const isDeleteStillAllowed =
      isApprovedStall &&
      Boolean(ccnDay) &&
      currentTimestamp < ccnDay.startTime &&
      !stall?.withdrawalCompleted;

    if (!isDeleteStillAllowed) {
      showErrorModal(
        "Stall deletion is only available before CCN Day starts. Once CCN Day has started, the stall becomes part of the event record.",
      );
      return;
    }

    try {
      setIsSubmittingTransaction(true);

      const transaction = await stallsContract.DeleteStall(selectedStallId);

      await transaction.wait();

      navigate(`/Organiser/StallManagement/${selectedCCNDayId}`, {
        replace: true,
      });
    } catch (error) {
      console.error("Delete stall error:", error);
      showErrorModal(getReadableError(error));
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  const handleAllowWithdrawal = async () => {
    try {
      setIsSubmittingTransaction(true);

      const transaction =
        await stallsContract.AllowStallWithdrawal(selectedStallId);

      await transaction.wait();

      await loadStallInformation();

      showSuccessModal("Withdrawal has been allowed for this stall.");
    } catch (error) {
      console.error("Allow withdrawal error:", error);
      showErrorModal(getReadableError(error));
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  const renderHeroActions = () => {
    if (!stall || !isApprovedStall) {
      return null;
    }

    return (
      <div className="organiser-stall-info-hero-actions">
        {canAllowWithdrawal && (
          <button
            type="button"
            className="organiser-stall-info-primary-button"
            onClick={() => setActiveModal("withdrawal")}
          >
            Allow Withdrawal
          </button>
        )}

        {canDeleteStall && (
          <button
            type="button"
            className="organiser-stall-info-danger-button"
            onClick={() => setActiveModal("delete")}
          >
            Delete Stall
          </button>
        )}
      </div>
    );
  };

  const renderActionPanel = () => {
    if (!stall) return null;

    if (isPendingDecisionWindowClosed) {
      return (
        <section className="organiser-stall-info-action-card">
          <span>Decision Window Closed</span>

          <h2>This stall application can no longer be approved.</h2>

          <p>
            {hasCCNDayEnded
              ? "The CCN Day has already ended, so this pending stall cannot be approved or rejected anymore."
              : "The CCN Day has already started, so this pending stall cannot be approved or rejected anymore."}
          </p>
        </section>
      );
    }

    if (canDecidePendingStall) {
      return (
        <section className="organiser-stall-info-action-card">
          <span>Pending Application</span>
          <h2>Review this stall application</h2>
          <p>
            This stall has not been approved yet. Approving will require the
            organiser to assign a stall location and school place.
          </p>

          <div className="organiser-stall-info-action-row">
            <button
              type="button"
              className="organiser-stall-info-primary-button"
              onClick={openApproveModal}
            >
              Approve Stall
            </button>

            <button
              type="button"
              className="organiser-stall-info-danger-button"
              onClick={() => setActiveModal("reject")}
            >
              Reject Stall
            </button>
          </div>
        </section>
      );
    }

    if (isRejectedStall) {
      return (
        <section className="organiser-stall-info-action-card">
          <span>Rejected Stall</span>
          <h2>This stall application was rejected.</h2>
          <p>No further organiser action is available for this stall.</p>
        </section>
      );
    }

    return null;
  };

  const renderTransactions = () => {
    if (!isApprovedStall) {
      return null;
    }

    return (
      <section className="organiser-stall-info-panel">
        <div className="organiser-stall-info-panel-header">
          <div>
            <span>Transactions</span>
            <h2>Stall transaction history</h2>
          </div>

          <p>{transactions.length} record(s)</p>
        </div>

        {transactions.length === 0 ? (
          <div className="organiser-stall-info-empty-transactions">
            <span>No Transactions</span>
            <h3>No transactions have been made for this stall yet.</h3>
            <p>
              Once customers pay this stall, the transaction records will appear
              here.
            </p>
          </div>
        ) : (
          <div className="organiser-stall-info-table-wrapper">
            <table className="organiser-stall-info-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Reference</th>
                </tr>
              </thead>

              <tbody>
                {sortedTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.transactionTypeLabel}</td>
                    <td className={transaction.amountType}>
                      <strong>{transaction.displayAmount}</strong>

                      {transaction.ethAmount && (
                        <small>{transaction.ethAmount}</small>
                      )}
                    </td>
                    <td title={transaction.customerWallet}>
                      {transaction.customerWallet ===
                      "0x0000000000000000000000000000000000000000"
                        ? "-"
                        : formatWalletAddress(transaction.customerWallet)}
                    </td>
                    <td>{transaction.transactionAt}</td>
                    <td>
                      {transaction.paymentId
                        ? `Payment #${transaction.paymentId}`
                        : `Withdrawal #${transaction.withdrawalId}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  const renderProducts = () => {
    return (
      <section className="organiser-stall-info-panel">
        <div className="organiser-stall-info-panel-header">
          <div>
            <span>Products</span>
            <h2>Stall product catalogue</h2>
          </div>

          <p>{products.length} product(s)</p>
        </div>

        {products.length === 0 ? (
          <div className="organiser-stall-info-empty-transactions">
            <span>No Products</span>
            <h3>No products have been added for this stall yet.</h3>
            <p>
              Products created by the stall owner will appear here for organiser
              viewing.
            </p>
          </div>
        ) : (
          <div className="organiser-stall-info-products-grid">
            {products.map((product) => (
              <article
                className="organiser-stall-info-product-card"
                key={product.id}
              >
                <div className="organiser-stall-info-product-image-wrap">
                  <img src={product.image} alt={product.name} />

                  <span
                    className={
                      product.status === 0
                        ? "organiser-stall-info-product-status available"
                        : "organiser-stall-info-product-status unavailable"
                    }
                  >
                    {product.statusLabel}
                  </span>
                </div>

                <div className="organiser-stall-info-product-body">
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>

                  <div className="organiser-stall-info-product-price">
                    <span>Price</span>
                    <strong>{formatSGDCents(product.priceSGDCents)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <main className="organiser-stall-info-page">
      <section className="organiser-stall-info-hero">
        <nav
          className="organiser-stall-info-breadcrumb"
          aria-label="Breadcrumb"
        >
          <button type="button" onClick={handleBreadcrumbToStallManagement}>
            Stall Management
          </button>

          <span>/</span>

          <button type="button" onClick={handleBreadcrumbToCCNDayStalls}>
            CCN Day #{ccnDay?.id || selectedCCNDayId}
          </button>

          <span>/</span>

          <strong>Stall #{stall?.id || selectedStallId}</strong>
        </nav>

        <div className="organiser-stall-info-hero-main">
          <div>
            <h1>{stall?.name || "Stall Information"}</h1>
            <p>
              View stall details, review approval status, and manage organiser
              actions for this stall.
            </p>
          </div>

          {renderHeroActions()}
        </div>
      </section>

      {isLoadingPage ? (
        <section className="organiser-stall-info-loader-state">
          <CareLinkLoader />
          <p>Loading stall information...</p>
        </section>
      ) : pageError ? (
        <section className="organiser-stall-info-empty-state">
          <img src={EmptyStallImage} alt="Unable to load stall" />
          <span>Unable To Load Stall</span>
          <h2>Something went wrong.</h2>
          <p>{pageError}</p>

          <button
            type="button"
            className="organiser-stall-info-primary-button"
            onClick={loadStallInformation}
          >
            Try Again
          </button>
        </section>
      ) : (
        <>
          <section className="organiser-stall-info-main-grid single-column">
            <article className="organiser-stall-info-profile-card">
              <div className="organiser-stall-info-image-wrap">
                <img src={stall.image} alt={stall.name} />
              </div>

              <div className="organiser-stall-info-profile-body">
                <h2>{stall.name}</h2>
                <p>{stall.description}</p>

                <div className="organiser-stall-info-status-row">
                  <span
                    className={`organiser-stall-info-status-pill status-${stall.status}`}
                  >
                    {stall.statusLabel}
                  </span>
                </div>

                <div className="organiser-stall-info-detail-grid">
                  <div>
                    <span>Stall Type</span>
                    <strong>{stall.type}</strong>
                  </div>

                  <div>
                    <span>Owner Wallet</span>
                    <strong title={stall.ownerWallet}>
                      {formatWalletAddress(stall.ownerWallet)}
                    </strong>
                  </div>

                  <div>
                    <span>Location</span>
                    <strong>{stall.location || "-"}</strong>
                  </div>

                  <div>
                    <span>School Place</span>
                    <strong>{stall.school}</strong>
                  </div>

                  <div>
                    <span>Electrical Port</span>
                    <strong>
                      {stall.needElectricalPort ? "Needed" : "Not Needed"}
                    </strong>
                  </div>

                  <div>
                    <span>Created At</span>
                    <strong>{stall.createdAt}</strong>
                  </div>
                </div>

                {isApprovedStall && (
                  <div className="organiser-stall-info-withdrawal-box inline">
                    <div>
                      <span>CCN Day Ended</span>
                      <strong>{isCCNDayEnded ? "Yes" : "No"}</strong>
                    </div>

                    <div>
                      <span>Withdrawable Balance</span>
                      <strong>{formatWeiToEth(withdrawableBalance)}</strong>
                    </div>

                    <div>
                      <span>Withdrawal Allowed</span>
                      <strong>{stall.allowedWithdrawal ? "Yes" : "No"}</strong>
                    </div>

                    <div>
                      <span>Completed</span>
                      <strong>
                        {stall.withdrawalCompleted ? "Yes" : "No"}
                      </strong>
                    </div>
                  </div>
                )}

                {isApprovedStall &&
                  isCCNDayEnded &&
                  !stall.allowedWithdrawal && (
                    <p className="organiser-stall-info-note">
                      {withdrawableBalance > 0n
                        ? "This stall has funds. After withdrawal is allowed, the stall owner can withdraw the funds."
                        : "This stall has no funds. After withdrawal is allowed, the stall owner can complete the stall without withdrawing funds."}
                    </p>
                  )}
              </div>
            </article>
          </section>

          {!isApprovedStall && renderActionPanel()}

          {isApprovedStall && (
            <>
              {renderProducts()}

              {renderTransactions()}
            </>
          )}
        </>
      )}

      {activeModal === "approve" && (
        <div className="organiser-stall-info-modal-backdrop">
          <div className="organiser-stall-info-modal-card large">
            <div className="organiser-stall-info-modal-header">
              <div>
                <span>Approve Stall</span>
                <h2>Assign stall location and school place</h2>
                <p>
                  This will approve the stall and change its status to open.
                </p>
              </div>

              <button
                type="button"
                className="organiser-stall-info-modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <label className="organiser-stall-info-field">
              <span>Stall Location</span>
              <input
                type="text"
                value={approveLocation}
                onChange={(event) => {
                  setApproveLocation(event.target.value);
                  setApproveFormError("");
                }}
                placeholder="Example: Block 10, Booth A3"
                maxLength={120}
              />
            </label>

            <label className="organiser-stall-info-field">
              <span>Stall School Place</span>
              <select
                value={approveSchool}
                onChange={(event) => {
                  setApproveSchool(event.target.value);
                  setApproveFormError("");
                }}
              >
                <option value="">Select stall school place</option>
                {SCHOOL_OPTIONS.map((school) => (
                  <option key={school.value} value={school.value}>
                    {school.label}
                  </option>
                ))}
              </select>
            </label>

            {approveFormError && (
              <div className="organiser-stall-info-inline-error">
                {approveFormError}
              </div>
            )}

            <div className="organiser-stall-info-action-row">
              <button
                type="button"
                className="organiser-stall-info-primary-button"
                onClick={handleApproveStall}
                disabled={isSubmittingTransaction}
              >
                {isSubmittingTransaction ? "Approving..." : "Approve Stall"}
              </button>

              <button
                type="button"
                className="organiser-stall-info-secondary-button"
                onClick={closeModal}
                disabled={isSubmittingTransaction}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "reject" && (
        <div className="organiser-stall-info-modal-backdrop">
          <div className="organiser-stall-info-modal-card">
            <div className="organiser-stall-info-modal-header">
              <div>
                <span>Reject Stall</span>
                <h2>Reject this stall application?</h2>
                <p>
                  This will move the stall out of the pending approval state.
                </p>
              </div>
            </div>

            <div className="organiser-stall-info-action-row">
              <button
                type="button"
                className="organiser-stall-info-danger-button"
                onClick={handleRejectStall}
                disabled={isSubmittingTransaction}
              >
                {isSubmittingTransaction ? "Rejecting..." : "Reject Stall"}
              </button>

              <button
                type="button"
                className="organiser-stall-info-secondary-button"
                onClick={closeModal}
                disabled={isSubmittingTransaction}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "delete" && (
        <div className="organiser-stall-info-modal-backdrop">
          <div className="organiser-stall-info-modal-card">
            <div className="organiser-stall-info-modal-header">
              <div>
                <span>Delete Stall</span>
                <h2>Delete this approved stall?</h2>
                <p>
                  This action is only available before CCN Day starts. Once CCN
                  Day has started, the stall becomes part of the event record.
                </p>
              </div>
            </div>

            <div className="organiser-stall-info-action-row">
              <button
                type="button"
                className="organiser-stall-info-secondary-button"
                onClick={closeModal}
                disabled={isSubmittingTransaction}
              >
                Cancel
              </button>

              <button
                type="button"
                className="organiser-stall-info-danger-button"
                onClick={handleDeleteStall}
                disabled={isSubmittingTransaction}
              >
                {isSubmittingTransaction ? "Deleting..." : "Delete Stall"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "withdrawal" && (
        <div className="organiser-stall-info-modal-backdrop">
          <div className="organiser-stall-info-modal-card">
            <div className="organiser-stall-info-modal-header">
              <div>
                <span>Allow Withdrawal</span>
                <h2>Allow this stall to settle?</h2>
                <p>
                  {withdrawableBalance > 0n
                    ? "The stall owner will be able to withdraw their funds."
                    : "The stall owner will be able to complete this stall without withdrawing funds."}
                </p>
              </div>
            </div>

            <div className="organiser-stall-info-action-row">
              <button
                type="button"
                className="organiser-stall-info-secondary-button"
                onClick={closeModal}
                disabled={isSubmittingTransaction}
              >
                Cancel
              </button>
              <button
                type="button"
                className="organiser-stall-info-primary-button"
                onClick={handleAllowWithdrawal}
                disabled={isSubmittingTransaction}
              >
                {isSubmittingTransaction ? "Allowing..." : "Allow Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(activeModal === "success" || activeModal === "error") && (
        <div className="organiser-stall-info-modal-backdrop">
          <div className="organiser-stall-info-modal-card">
            <div className="organiser-stall-info-modal-header">
              <div>
                <span>{activeModal === "success" ? "Success" : "Error"}</span>
                <h2>
                  {activeModal === "success"
                    ? "Transaction Completed"
                    : "Transaction Failed"}
                </h2>
                <p>{modalMessage}</p>
              </div>
            </div>

            <div className="organiser-stall-info-action-row">
              <button
                type="button"
                className="organiser-stall-info-primary-button"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default OrganiserStallInformation;
