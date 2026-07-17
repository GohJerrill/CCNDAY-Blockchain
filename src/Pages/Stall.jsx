import React, { useEffect, useState } from "react";
import CareLinkLoader from "../components/CareLinkLoader";
import { useWeb3 } from "../context/Web3Context";
import "./Stall.css";
import NoCCNDay from "../assets/NoCCNDay.svg";
import AddProduct from "../assets/AddProduct.png";
import EmptyStall from "../assets/EmptyStall.svg";
import CCNDAYTP from "../assets/CCNDAYTP.png";

const transactionTypeLabels = [
  "Payment received",
  "Refund issued",
  "Withdrawal",
];

const transactionStatusLabels = ["Received", "Refunded", "Withdrawn"];

const formatSignedWeiToEth = (signedWeiValue) => {
  const signedWei = BigInt(signedWeiValue);
  const isNegative = signedWei < 0n;
  const absoluteWei = isNegative ? -signedWei : signedWei;

  const ether = 10n ** 18n;
  const whole = absoluteWei / ether;
  const fraction = (absoluteWei % ether)
    .toString()
    .padStart(18, "0")
    .slice(0, 4);
  const cleanedFraction = fraction.replace(/0+$/, "");

  return `${isNegative ? "-" : "+"}${whole}${
    cleanedFraction ? `.${cleanedFraction}` : ""
  } ETH`;
};

const getTransactionDisplayId = (transaction) => {
  if (transaction.WithdrawalID > 0) {
    return `WDR-${transaction.WithdrawalID}`;
  }

  return `PAY-${transaction.PaymentID}`;
};

const mapStallTransactionFromContract = (transaction) => {
  const transactionTypeValue = toNumber(
    transaction.transactionType ?? transaction[9],
  );

  const paymentId = toNumber(transaction.PaymentID ?? transaction[0]);
  const withdrawalId = toNumber(transaction.WithdrawalID ?? transaction[1]);
  const customerWallet = transaction.CustomerWallet ?? transaction[4];
  const stallOwnerWallet = transaction.StallOwnerWallet ?? transaction[5];
  const signedAmount = (transaction.SignedAmount ?? transaction[7]).toString();
  const transactionAt = toNumber(transaction.TransactionAt ?? transaction[8]);

  const mappedTransaction = {
    PaymentID: paymentId,
    WithdrawalID: withdrawalId,
    StallID: toNumber(transaction.StallID ?? transaction[2]),
    CCNDayID: toNumber(transaction.CCNDayID ?? transaction[3]),
    CustomerWallet: customerWallet,
    StallOwnerWallet: stallOwnerWallet,
    SignedAmount: signedAmount,
    TransactionAt: transactionAt,
    transactionTypeValue,
    transactionType:
      transactionTypeLabels[transactionTypeValue] || "Transaction",
    status: transactionStatusLabels[transactionTypeValue] || "Recorded",
  };

  return {
    ...mappedTransaction,
    id: getTransactionDisplayId(mappedTransaction),
    wallet:
      mappedTransaction.transactionType === "Withdrawal"
        ? mappedTransaction.StallOwnerWallet
        : mappedTransaction.CustomerWallet,
    amount: formatSignedWeiToEth(mappedTransaction.SignedAmount),
    date: formatDateTime(mappedTransaction.TransactionAt),
    amountType:
      BigInt(mappedTransaction.SignedAmount) < 0n ? "negative" : "positive",
  };
};

const attachRefundAvailabilityToTransactions = (transactions) => {
  const refundedPaymentIds = new Set(
    transactions
      .filter((transaction) => {
        return (
          transaction.transactionTypeValue === 1 && transaction.PaymentID > 0
        );
      })
      .map((transaction) => transaction.PaymentID),
  );

  return transactions.map((transaction) => {
    const isPaidTransaction = transaction.transactionTypeValue === 0;
    const hasPaymentId = transaction.PaymentID > 0;
    const hasAlreadyBeenRefunded = refundedPaymentIds.has(
      transaction.PaymentID,
    );

    return {
      ...transaction,
      canRefund: isPaidTransaction && hasPaymentId && !hasAlreadyBeenRefunded,
    };
  });
};

const stallPageStates = {
  LOADING: "loading",
  NO_CCN_DAY: "noCcnDay",
  REGISTRATION_NOT_STARTED: "registrationNotStarted",
  CAN_APPLY: "canApply",
  PENDING_STALL: "pendingStall",
  HAS_STALL: "hasStall",
  REGISTRATION_ENDED: "registrationEnded",
  CCN_DAY_ENDED: "ccnDayEnded",
  CANNOT_APPLY: "cannotApply",
};

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
const productStatusLabels = ["Available", "Unavailable"];

const formatDateTime = (unixTimestamp) => {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(unixTimestamp * 1000));
};

const formatWalletAddress = (walletAddress) => {
  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
};

const toNumber = (value) => {
  if (value === undefined || value === null) return 0;
  return Number(value.toString());
};

const getBlockchainErrorMessage = (error) => {
  return [
    error?.reason,
    error?.shortMessage,
    error?.message,
    error?.info?.error?.message,
    error?.info?.error?.data?.message,
  ]
    .filter(Boolean)
    .join(" ");
};

const getBlockchainErrorData = (error) => {
  return [
    error?.data,
    error?.error?.data,
    error?.info?.error?.data,
    error?.info?.error?.data?.data,
  ].find((value) => typeof value === "string" && value.startsWith("0x"));
};

const getFriendlyBlockchainErrorMessage = (error, fallbackMessage) => {
  const rawMessage = getBlockchainErrorMessage(error);
  const errorData = getBlockchainErrorData(error);

  if (
    rawMessage.includes("user rejected") ||
    rawMessage.includes("User rejected") ||
    rawMessage.includes("ACTION_REJECTED") ||
    rawMessage.includes("denied transaction signature")
  ) {
    return "Transaction was cancelled in MetaMask.";
  }

  if (
    rawMessage.includes("CannotDeleteStallDuringCCNDay") ||
    rawMessage.includes("0x08027567") ||
    errorData === "0x08027567"
  ) {
    return "This stall cannot be deleted while CCN Day is ongoing.";
  }

  if (rawMessage.includes("StallHasUnsettledPaidPayments")) {
    return "This stall cannot be deleted because it still has unsettled paid payments.";
  }

  if (rawMessage.includes("OnlyOpenOrClosedCanBeDeleted")) {
    return "Only approved open or closed stalls can be deleted.";
  }

  if (rawMessage.includes("OnlyOpenOrClosedCanBeUpdated")) {
    return "Only approved open or closed stalls can update their status.";
  }

  if (rawMessage.includes("OwnerCanOnlySetOpenOrClosed")) {
    return "You can only set your stall status to Open or Closed.";
  }

  if (rawMessage.includes("OnlyStallOwner")) {
    return "Only the stall owner can perform this action.";
  }

  if (rawMessage.includes("NotApprovedStallOwner")) {
    return "Your stall must be approved before you can perform this action.";
  }

  if (rawMessage.includes("StallNotReadyForWithdrawal")) {
    return "This stall is not ready for withdrawal yet. The organiser must allow withdrawal after CCN Day has ended.";
  }

  if (rawMessage.includes("NoWithdrawablePayments")) {
    return "There are no paid payments available to withdraw for this stall.";
  }

  if (rawMessage.includes("StallHasWithdrawablePayments")) {
    return "This stall still has withdrawable payments. Please withdraw the balance instead of completing it without withdrawal.";
  }

  if (rawMessage.includes("TransferFailed")) {
    return "The withdrawal transfer failed. Please try again.";
  }

  if (rawMessage.includes("PaymentDoesNotExist")) {
    return "This payment record does not exist.";
  }

  if (
    rawMessage.includes("PaymentAlreadyRefunded") ||
    rawMessage.includes("AlreadyRefunded")
  ) {
    return "This payment has already been refunded.";
  }

  if (rawMessage.includes("OnlyPaidPaymentCanBeRefunded")) {
    return "Only paid transactions can be refunded.";
  }

  if (rawMessage.includes("NotAllowedToRefundPayment")) {
    return "You are not allowed to refund this payment.";
  }

  if (
    rawMessage.includes("execution reverted (unknown custom error)") ||
    rawMessage.includes("CALL_EXCEPTION")
  ) {
    return fallbackMessage;
  }

  return rawMessage || fallbackMessage;
};

const getBlockchainErrorType = (error) => {
  const message = getBlockchainErrorMessage(error);

  if (message.includes("NoCurrentCCNDay")) return "no-current-ccn-day";
  if (message.includes("WalletHasNotCreatedStall"))
    return "wallet-has-not-created-stall";
  if (message.includes("StallRegistrationNotOpen"))
    return "stall-registration-not-open";
  if (message.includes("WalletAlreadyCreatedStall"))
    return "wallet-already-created-stall";
  if (message.includes("SchoolNotEligible")) return "school-not-eligible";
  if (message.includes("WalletNotRegistered")) return "wallet-not-registered";

  return "unknown-error";
};

const mapCCNDayFromContract = (ccnDay) => {
  return {
    CCNDayID: toNumber(ccnDay.CCNDayID ?? ccnDay[0]),
    CCNName: ccnDay.CCNName ?? ccnDay[1],
    CCNDescription: ccnDay.CCNDescription ?? ccnDay[2],
    StartDateTime: toNumber(ccnDay.StartDateTime ?? ccnDay[3]),
    EndDateTime: toNumber(ccnDay.EndDateTime ?? ccnDay[4]),
    StallRegistrationStartDateTime: toNumber(
      ccnDay.StallRegistrationStartDateTime ?? ccnDay[5],
    ),
    StallRegistrationEndDateTime: toNumber(
      ccnDay.StallRegistrationEndDateTime ?? ccnDay[6],
    ),
  };
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
    stallType: stallTypeOptions[stallTypeValue] || "Others",
    StallOwnerWallet: stall.StallOwnerWallet ?? stall[5],
    StallLocation: stall.StallLocation ?? stall[6],
    StallSchool: schoolLabels[stallSchoolValue] || "Others",
    NeedElectricalPort: Boolean(stall.NeedElectricalPort ?? stall[8]),
    CreatedAt: toNumber(stall.CreatedAt ?? stall[9]),
    stallStatus: stallStatusLabels[stallStatusValue] || "Unknown",
    AllowedWithdrawal: Boolean(stall.AllowedWithdrawal ?? stall[11]),
    CCNDayID: toNumber(stall.CCNDayID ?? stall[12]),
    WithdrawalCompleted: Boolean(stall.WithdrawalCompleted ?? stall[13]),
  };
};

const mapProductFromContract = (product) => {
  const productStatusValue = toNumber(product.productStatus ?? product[6]);

  return {
    ProductID: toNumber(product.ProductID ?? product[0]),
    StallID: toNumber(product.StallID ?? product[1]),
    ProductName: product.ProductName ?? product[2],
    ProductDescription: product.ProductDescription ?? product[3],
    ProductImage: product.ProductImage ?? product[4],
    ProductPrice: (product.ProductPrice ?? product[5]).toString(),
    productStatus: productStatusLabels[productStatusValue] || "Unavailable",
  };
};

// const handleSubmitStallApplication = (event) => {
//   event.preventDefault();
//   console.log("Mock stall application submitted:", stallForm);
// };

const formatWeiToEth = (weiValue) => {
  const wei = BigInt(weiValue);
  const ether = 10n ** 18n;
  const whole = wei / ether;
  const fraction = (wei % ether).toString().padStart(18, "0").slice(0, 4);
  const cleanedFraction = fraction.replace(/0+$/, "");

  return `${whole}${cleanedFraction ? `.${cleanedFraction}` : ""} ETH`;
};

const normaliseWeiInput = (weiValue) => {
  const cleanedValue = weiValue.trim();

  if (!/^\d+$/.test(cleanedValue)) {
    throw new Error("Product price must be a whole number in wei.");
  }

  if (BigInt(cleanedValue) <= 0n) {
    throw new Error("Product price must be more than 0 wei.");
  }

  return cleanedValue;
};

const validateProductForm = (form) => {
  const productName = form.ProductName.trim();
  const productDescription = form.ProductDescription.trim();
  const productImage = form.ProductImage.trim();
  const productPrice = form.ProductPrice.trim();

  if (!productName) {
    return {
      isValid: false,
      message: "Product name is required.",
    };
  }

  if (productName.length > 80) {
    return {
      isValid: false,
      message: "Product name must be 80 characters or less.",
    };
  }

  if (!productDescription) {
    return {
      isValid: false,
      message: "Product description is required.",
    };
  }

  if (productDescription.length > 500) {
    return {
      isValid: false,
      message: "Product description must be 500 characters or less.",
    };
  }

  if (!productImage) {
    return {
      isValid: false,
      message: "Product image URL is required.",
    };
  }

  if (productImage.length > 300) {
    return {
      isValid: false,
      message: "Product image URL must be 300 characters or less.",
    };
  }

  if (!productPrice) {
    return {
      isValid: false,
      message: "Product price is required.",
    };
  }

  try {
    const productPriceInWei = normaliseWeiInput(productPrice);

    return {
      isValid: true,
      productPriceInWei,
    };
  } catch (error) {
    return {
      isValid: false,
      message: error.message,
    };
  }
};

const Stall = () => {
  const {
    walletAddress,
    usersContract,
    ccnDayContract,
    stallsContract,
    paymentsContract,
    isConnected,
  } = useWeb3();

  const [stallPageState, setStallPageState] = useState(stallPageStates.LOADING);

  const [currentCCNDay, setCurrentCCNDay] = useState(null);
  const [pageMessage, setPageMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeStallTab, setActiveStallTab] = useState("products");

  const [stallForm, setStallForm] = useState({
    StallName: "",
    StallDescription: "",
    StallImage: "",
    stallType: "Food & Beverages",
    NeedElectricalPort: false,
  });

  const [ownedStall, setOwnedStall] = useState(null);
  const [products, setProducts] = useState([]);

  const [stallTransactions, setStallTransactions] = useState([]);
  const [isLoadingStallTransactions, setIsLoadingStallTransactions] =
    useState(false);
  const [stallTransactionsError, setStallTransactionsError] = useState("");

  const [activeModal, setActiveModal] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [productFormError, setProductFormError] = useState("");

  const [stallStatusForm, setStallStatusForm] = useState("Open");

  const [productForm, setProductForm] = useState({
    ProductName: "",
    ProductDescription: "",
    ProductImage: "",
    ProductPrice: "",
    productStatus: "Available",
  });
  const [canWithdrawStallPayments, setCanWithdrawStallPayments] =
    useState(false);
  const [
    canCompleteStallWithoutWithdrawal,
    setCanCompleteStallWithoutWithdrawal,
  ] = useState(false);
  const [withdrawableBalance, setWithdrawableBalance] = useState("0");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isCompletingStall, setIsCompletingStall] = useState(false);
  const [isRefundingPayment, setIsRefundingPayment] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const [isUpdatingStall, setIsUpdatingStall] = useState(false);
  const [isDeletingStall, setIsDeletingStall] = useState(false);

  const [transactionModalStatus, setTransactionModalStatus] =
    useState("success");
  const [modalErrorMessage, setModalErrorMessage] = useState("");

  useEffect(() => {
    const loadStallPageData = async () => {
      if (
        !isConnected ||
        !walletAddress ||
        !usersContract ||
        !ccnDayContract ||
        !stallsContract
      ) {
        setStallPageState(stallPageStates.LOADING);
        return;
      }

      try {
        setPageMessage("");
        setStallPageState(stallPageStates.LOADING);

        const contractCCNDay = await ccnDayContract.GetCurrentCCNDay();
        const mappedCCNDay = mapCCNDayFromContract(contractCCNDay);

        if (!mappedCCNDay.CCNDayID) {
          setCurrentCCNDay(null);
          setOwnedStall(null);
          setProducts([]);
          setWithdrawableBalance("0");
          setCanWithdrawStallPayments(false);
          setCanCompleteStallWithoutWithdrawal(false);
          setStallPageState(stallPageStates.NO_CCN_DAY);
          setStallTransactions([]);
          setStallTransactionsError("");
          setIsLoadingStallTransactions(false);
          return;
        }

        setCurrentCCNDay(mappedCCNDay);

        let mappedOwnedStall = null;

        try {
          const contractOwnedStall = await stallsContract.GetMyStall();
          mappedOwnedStall = mapStallFromContract(contractOwnedStall);
        } catch (error) {
          const errorType = getBlockchainErrorType(error);

          if (errorType !== "wallet-has-not-created-stall") {
            throw error;
          }
        }

        if (mappedOwnedStall) {
          setOwnedStall(mappedOwnedStall);
          setStallStatusForm(
            mappedOwnedStall.stallStatus === "Closed" ? "Closed" : "Open",
          );

          let withdrawableAmount = 0n;

          if (paymentsContract) {
            withdrawableAmount =
              await paymentsContract.GetStallWithdrawableBalance(
                mappedOwnedStall.StallID,
              );
          }

          const withdrawableAmountBigInt = BigInt(
            withdrawableAmount.toString(),
          );

          setWithdrawableBalance(withdrawableAmountBigInt.toString());
          setCanWithdrawStallPayments(
            mappedOwnedStall.AllowedWithdrawal && withdrawableAmountBigInt > 0n,
          );
          setCanCompleteStallWithoutWithdrawal(
            Boolean(paymentsContract) &&
              mappedOwnedStall.AllowedWithdrawal &&
              withdrawableAmountBigInt === 0n,
          );

          try {
            const productIds = await stallsContract.GetProductIDsByStallID(
              mappedOwnedStall.StallID,
            );

            const mappedProducts = await Promise.all(
              productIds.map(async (productId) => {
                const contractProduct =
                  await stallsContract.Products(productId);
                return mapProductFromContract(contractProduct);
              }),
            );

            setProducts(mappedProducts);
          } catch (error) {
            console.error("Product load error:", error);
            setProducts([]);
          }

          try {
            setIsLoadingStallTransactions(true);
            setStallTransactionsError("");

            if (!paymentsContract) {
              setStallTransactions([]);
              setStallTransactionsError(
                "Payment contract is not connected yet. Please refresh and try again.",
              );
            } else {
              const contractTransactions =
                await paymentsContract.GetStallTransactionHistory(
                  mappedOwnedStall.StallID,
                );

              const mappedTransactions = attachRefundAvailabilityToTransactions(
                contractTransactions.map(mapStallTransactionFromContract),
              ).sort((firstTransaction, secondTransaction) => {
                return (
                  secondTransaction.TransactionAt -
                  firstTransaction.TransactionAt
                );
              });

              setStallTransactions(mappedTransactions);
            }
          } catch (error) {
            console.error("Stall transaction load error:", error);
            setStallTransactions([]);
            setStallTransactionsError(
              "Unable to load stall transactions from the blockchain. Please try again.",
            );
          } finally {
            setIsLoadingStallTransactions(false);
          }

          if (mappedOwnedStall.stallStatus === "Pending") {
            setStallPageState(stallPageStates.PENDING_STALL);
            return;
          }

          setStallPageState(stallPageStates.HAS_STALL);
          return;
        }

        setOwnedStall(null);
        setProducts([]);
        setStallTransactions([]);
        setStallTransactionsError("");
        setWithdrawableBalance("0");
        setCanWithdrawStallPayments(false);
        setCanCompleteStallWithoutWithdrawal(false);
        setCanWithdrawStallPayments(false);

        const currentTimestamp = Math.floor(Date.now() / 1000);

        if (currentTimestamp > mappedCCNDay.EndDateTime) {
          setPageMessage(
            "There is no CCN Day upcoming, please apply again another time.",
          );
          setStallPageState(stallPageStates.CCN_DAY_ENDED);
          return;
        }

        if (currentTimestamp < mappedCCNDay.StallRegistrationStartDateTime) {
          setPageMessage(
            "Stall registration has not opened yet. Please come back when applications begin.",
          );
          setStallPageState(stallPageStates.REGISTRATION_NOT_STARTED);
          return;
        }

        if (currentTimestamp > mappedCCNDay.StallRegistrationEndDateTime) {
          setPageMessage(
            "Stall registration has ended for this CCN Day. New stall applications are no longer accepted.",
          );
          setStallPageState(stallPageStates.REGISTRATION_ENDED);
          return;
        }

        const canApply =
          await stallsContract.CanWalletCreateStall(walletAddress);

        if (canApply) {
          setStallPageState(stallPageStates.CAN_APPLY);
          return;
        }

        setPageMessage(
          "Your wallet is not eligible to create a stall for this CCN Day.",
        );
        setStallPageState(stallPageStates.CANNOT_APPLY);
      } catch (error) {
        console.error("Stall page load error:", error);

        const errorType = getBlockchainErrorType(error);

        if (errorType === "no-current-ccn-day") {
          setCurrentCCNDay(null);
          setOwnedStall(null);
          setProducts([]);
          setStallPageState(stallPageStates.NO_CCN_DAY);
          setStallTransactions([]);
          setStallTransactionsError("");
          setIsLoadingStallTransactions(false);
          return;
        }

        setPageMessage(
          "Unable to load your stall page from the blockchain. Please try again.",
        );
        setStallPageState(stallPageStates.CANNOT_APPLY);
      }
    };

    loadStallPageData();
  }, [
    isConnected,
    walletAddress,
    usersContract,
    ccnDayContract,
    stallsContract,
    paymentsContract,
    refreshKey,
  ]);

  const displayedCCNDay = currentCCNDay;

  const refreshStallPage = () => {
    setRefreshKey((currentKey) => currentKey + 1);
  };

  const showSuccessModal = (message) => {
    setTransactionModalStatus("success");
    setSuccessMessage(message);
    setModalErrorMessage("");
    setActiveModal("success");
  };

  const showErrorModal = (message, errorMessage) => {
    setTransactionModalStatus("error");
    setSuccessMessage(message);
    setModalErrorMessage(errorMessage);
    setActiveModal("success");
  };

  const renderCCNDayHero = () => (
    <section className="stall-event-hero">
      <div className="stall-event-image-wrapper">
        <img src={CCNDAYTP} alt={displayedCCNDay.CCNName} />
      </div>

      <div className="stall-event-content">
        <span className="stall-section-eyebrow">CCN Day</span>

        <h1>{displayedCCNDay.CCNName}</h1>

        <p>{displayedCCNDay.CCNDescription}</p>

        <div className="stall-event-date-grid">
          <div>
            <span>CCN starts</span>
            <strong>{formatDateTime(displayedCCNDay.StartDateTime)}</strong>
          </div>

          <div>
            <span>CCN ends</span>
            <strong>{formatDateTime(displayedCCNDay.EndDateTime)}</strong>
          </div>

          <div>
            <span>Registration opens</span>
            <strong>
              {formatDateTime(displayedCCNDay.StallRegistrationStartDateTime)}
            </strong>
          </div>

          <div>
            <span>Registration closes</span>
            <strong>
              {formatDateTime(displayedCCNDay.StallRegistrationEndDateTime)}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setStallForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;

    setStallForm((currentForm) => ({
      ...currentForm,
      [name]: checked,
    }));
  };

  const handleSubmitStallApplication = async (event) => {
    event.preventDefault();

    if (!stallsContract) {
      showErrorModal(
        "Unable to submit stall application.",
        "Please reconnect your wallet and try again.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const stallTypeValue = stallTypeOptions.indexOf(stallForm.stallType);

      const tx = await stallsContract.CreateStall(
        stallForm.StallName.trim(),
        stallForm.StallDescription.trim(),
        stallForm.StallImage.trim(),
        stallTypeValue,
        stallForm.NeedElectricalPort,
      );

      await tx.wait();

      setStallForm({
        StallName: "",
        StallDescription: "",
        StallImage: "",
        stallType: "Food & Beverages",
        NeedElectricalPort: false,
      });

      showSuccessModal(
        "Stall application has been submitted successfully. It is now pending organiser approval.",
      );
      refreshStallPage();
    } catch (error) {
      console.error("Create stall error:", error);
      showErrorModal(
        "Unable to submit stall application.",
        getFriendlyBlockchainErrorMessage(
          error,
          "Unable to submit stall application. Please try again.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawStallPayments = async () => {
    if (!paymentsContract || !ownedStall) {
      showErrorModal(
        "Unable to withdraw.",
        "Please reconnect your wallet and try again.",
      );
      return;
    }

    try {
      setIsWithdrawing(true);

      const tx = await paymentsContract.WithdrawStallPayments(
        ownedStall.StallID,
      );

      await tx.wait();

      showSuccessModal("Stall payments have been withdrawn successfully.");
      refreshStallPage();
    } catch (error) {
      console.error("Withdraw stall payments error:", error);

      showErrorModal(
        "Unable to withdraw.",
        getFriendlyBlockchainErrorMessage(
          error,
          "Unable to withdraw stall payments. Please try again.",
        ),
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleCompleteStallWithoutWithdrawal = async () => {
    if (!paymentsContract || !ownedStall) {
      showErrorModal(
        "Unable to complete stall.",
        "Please reconnect your wallet and try again.",
      );
      return;
    }

    try {
      setIsCompletingStall(true);

      const tx = await paymentsContract.CompleteStallWithoutWithdrawal(
        ownedStall.StallID,
      );

      await tx.wait();

      showSuccessModal("Stall has been completed successfully.");
      refreshStallPage();
    } catch (error) {
      console.error("Complete stall without withdrawal error:", error);

      showErrorModal(
        "Unable to complete stall.",
        getFriendlyBlockchainErrorMessage(
          error,
          "Unable to complete this stall. Please try again.",
        ),
      );
    } finally {
      setIsCompletingStall(false);
    }
  };

  const openRefundPaymentModal = (transaction) => {
    setSelectedTransaction(transaction);
    setActiveModal("refundPayment");
  };

  const handleConfirmRefundPayment = async () => {
    if (!paymentsContract || !selectedTransaction) {
      showErrorModal(
        "Unable to refund payment.",
        "Please reconnect your wallet and try again.",
      );
      return;
    }

    try {
      setIsRefundingPayment(true);

      const tx = await paymentsContract.RefundPayment(
        selectedTransaction.PaymentID,
      );

      await tx.wait();

      showSuccessModal("Payment has been refunded successfully.");
      refreshStallPage();
    } catch (error) {
      console.error("Refund payment error:", error);

      showErrorModal(
        "Unable to refund payment.",
        getFriendlyBlockchainErrorMessage(
          error,
          "Unable to refund this payment. Please try again.",
        ),
      );
    } finally {
      setIsRefundingPayment(false);
    }
  };

  const closeModal = () => {
    if (
      isSavingProduct ||
      isDeletingProduct ||
      isUpdatingStall ||
      isDeletingStall ||
      isWithdrawing ||
      isCompletingStall ||
      isRefundingPayment
    ) {
      return;
    }

    setActiveModal(null);
    setSelectedProduct(null);
    setSelectedTransaction(null);
    setProductFormError("");
    setModalErrorMessage("");
  };

  const openEditStallModal = () => {
    setStallStatusForm(ownedStall.stallStatus);
    setActiveModal("editStall");
  };

  const openDeleteStallModal = () => {
    setActiveModal("deleteStall");
  };

  const handleUpdateStallStatus = async (event) => {
    event.preventDefault();

    if (!stallsContract || !ownedStall) {
      showErrorModal(
        "Unable to update stall status.",
        "Please reconnect your wallet and try again.",
      );
      return;
    }

    if (stallStatusForm === ownedStall.stallStatus) {
      closeModal();
      return;
    }

    try {
      setIsUpdatingStall(true);

      const stallStatusValue = stallStatusLabels.indexOf(stallStatusForm);

      const tx = await stallsContract.UpdateMyStallOpenStatus(
        ownedStall.StallID,
        stallStatusValue,
      );

      await tx.wait();

      showSuccessModal("Stall status has been updated successfully.");
      refreshStallPage();
    } catch (error) {
      console.error("Update stall status error:", error);

      showErrorModal(
        "Unable to update stall status.",
        getFriendlyBlockchainErrorMessage(
          error,
          "The stall status could not be updated. Please try again.",
        ),
      );
    } finally {
      setIsUpdatingStall(false);
    }
  };

  const handleConfirmDeleteStall = async () => {
    if (!stallsContract || !ownedStall) {
      showErrorModal(
        "Unable to delete stall.",
        "Please reconnect your wallet and try again.",
      );
      return;
    }

    try {
      setIsDeletingStall(true);

      const tx = await stallsContract.DeleteMyStall(ownedStall.StallID);

      await tx.wait();

      showSuccessModal("Stall has been deleted successfully.");
      refreshStallPage();
    } catch (error) {
      console.error("Delete stall error:", error);

      showErrorModal(
        "Unable to delete stall.",
        getFriendlyBlockchainErrorMessage(
          error,
          "The stall could not be deleted. Please try again.",
        ),
      );
    } finally {
      setIsDeletingStall(false);
    }
  };

  const openEditProductModal = (product) => {
    setSelectedProduct(product);
    setProductFormError("");

    setProductForm({
      ProductName: product.ProductName,
      ProductDescription: product.ProductDescription,
      ProductImage: product.ProductImage,
      ProductPrice: product.ProductPrice,
      productStatus: product.productStatus,
    });

    setActiveModal("editProduct");
  };

  const openDeleteProductModal = (product) => {
    setSelectedProduct(product);
    setActiveModal("deleteProduct");
  };

  const openCreateProductModal = () => {
    setSelectedProduct(null);
    setProductFormError("");

    setProductForm({
      ProductName: "",
      ProductDescription: "",
      ProductImage: "",
      ProductPrice: "",
      productStatus: "Available",
    });

    setActiveModal("createProduct");
  };

  const handleProductFormChange = (event) => {
    const { name, value } = event.target;

    if (productFormError) {
      setProductFormError("");
    }

    setProductForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault();

    if (!stallsContract || !selectedProduct) {
      setProductFormError("Please reconnect your wallet and try again.");
      return;
    }

    if (isEditProductUnchanged) {
      closeModal();
      return;
    }

    const validationResult = validateProductForm(productForm);

    if (!validationResult.isValid) {
      setProductFormError(validationResult.message);
      return;
    }

    try {
      setIsSavingProduct(true);
      setProductFormError("");

      const productStatusValue = productStatusLabels.indexOf(
        productForm.productStatus,
      );

      const tx = await stallsContract.EditProduct(
        selectedProduct.ProductID,
        productForm.ProductName.trim(),
        productForm.ProductDescription.trim(),
        productForm.ProductImage.trim(),
        validationResult.productPriceInWei,
        productStatusValue,
      );

      await tx.wait();

      showSuccessModal("Product has been updated successfully.");
      refreshStallPage();
    } catch (error) {
      console.error("Edit product error:", error);

      setProductFormError(
        getFriendlyBlockchainErrorMessage(
          error,
          error?.message || "Unable to update product. Please try again.",
        ),
      );
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();

    if (!stallsContract || !ownedStall) {
      setProductFormError("Please reconnect your wallet and try again.");
      return;
    }

    const validationResult = validateProductForm(productForm);

    if (!validationResult.isValid) {
      setProductFormError(validationResult.message);
      return;
    }

    try {
      setIsSavingProduct(true);
      setProductFormError("");

      const productStatusValue = productStatusLabels.indexOf(
        productForm.productStatus,
      );

      const tx = await stallsContract.CreateProduct(
        ownedStall.StallID,
        productForm.ProductName.trim(),
        productForm.ProductDescription.trim(),
        productForm.ProductImage.trim(),
        validationResult.productPriceInWei,
        productStatusValue,
      );

      await tx.wait();

      setProductForm({
        ProductName: "",
        ProductDescription: "",
        ProductImage: "",
        ProductPrice: "",
        productStatus: "Available",
      });

      showSuccessModal("Product has been created successfully.");
      refreshStallPage();
    } catch (error) {
      console.error("Create product error:", error);

      setProductFormError(
        getFriendlyBlockchainErrorMessage(
          error,
          error?.message || "Unable to create product. Please try again.",
        ),
      );
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!stallsContract || !selectedProduct) {
      showErrorModal(
        "Unable to delete product.",
        "Please reconnect your wallet and try again.",
      );
      return;
    }

    try {
      setIsDeletingProduct(true);

      const tx = await stallsContract.DeleteProduct(selectedProduct.ProductID);

      await tx.wait();

      showSuccessModal("Product has been deleted successfully.");
      refreshStallPage();
    } catch (error) {
      console.error("Delete product error:", error);

      showErrorModal(
        "Unable to delete product.",
        getFriendlyBlockchainErrorMessage(
          error,
          "Unable to delete product. Please try again.",
        ),
      );
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const isProductActionInProgress = isSavingProduct || isDeletingProduct;
  const isStallActionInProgress = isUpdatingStall || isDeletingStall;

  const isStallStatusUnchanged =
    ownedStall && stallStatusForm === ownedStall.stallStatus;

  const isEditProductUnchanged =
    selectedProduct &&
    productForm.ProductName.trim() === selectedProduct.ProductName &&
    productForm.ProductDescription.trim() ===
      selectedProduct.ProductDescription &&
    productForm.ProductImage.trim() === selectedProduct.ProductImage &&
    productForm.ProductPrice.trim() === selectedProduct.ProductPrice &&
    productForm.productStatus === selectedProduct.productStatus;

  return (
    <div className="stall-page">
      {stallPageState === stallPageStates.LOADING && (
        <section className="stall-centered-state">
          <CareLinkLoader
            label="Loading stall page..."
            sublabel="Please wait while CareLink checks your wallet and CCN Day status."
          />
        </section>
      )}
      {stallPageState === stallPageStates.NO_CCN_DAY && (
        <section className="stall-centered-state">
          <img src={NoCCNDay} alt="" className="stall-centered-state-image" />

          <h1>No CCN Day available</h1>

          <p>
            There is currently no active CCN Day, so stall applications are not
            open at the moment.
          </p>
        </section>
      )}

      {stallPageState === stallPageStates.CANNOT_APPLY && (
        <>
          {renderCCNDayHero()}

          <section className="stall-restriction-card">
            <img
              className="stall-centered-state-image"
              src={NoCCNDay}
              alt=""
            ></img>
            <h2>You are unable to create a stall application</h2>

            <p>
              {pageMessage ||
                "You are unable to create a stall application for this CCN Day. Please contact the organiser if you believe you should have access."}
            </p>
          </section>
        </>
      )}

      {stallPageState === stallPageStates.REGISTRATION_NOT_STARTED && (
        <>
          {renderCCNDayHero()}

          <section className="stall-restriction-card">
            <img className="stall-centered-state-image" src={NoCCNDay} alt="" />

            <h2>Stall registration has not started</h2>

            <p>{pageMessage}</p>
          </section>
        </>
      )}

      {stallPageState === stallPageStates.REGISTRATION_ENDED && (
        <>
          {renderCCNDayHero()}

          <section className="stall-restriction-card">
            <img className="stall-centered-state-image" src={NoCCNDay} alt="" />

            <h2>Stall registration has ended</h2>

            <p>{pageMessage}</p>
          </section>
        </>
      )}

      {stallPageState === stallPageStates.CCN_DAY_ENDED && (
        <>
          {renderCCNDayHero()}

          <section className="stall-restriction-card">
            <img className="stall-centered-state-image" src={NoCCNDay} alt="" />

            <h2>CCN Day has ended</h2>

            <p>{pageMessage}</p>
          </section>
        </>
      )}

      {stallPageState === stallPageStates.PENDING_STALL && ownedStall && (
        <>
          {renderCCNDayHero()}

          <section className="stall-pending-panel">
            <div className="stall-pending-header">
              <div className="stall-pending-status-icon">
                <span />
              </div>

              <div>
                <span className="stall-section-eyebrow">
                  Pending organiser review
                </span>

                <h2>Your stall application is waiting for approval</h2>

                <p>
                  Your stall has been submitted successfully. Products,
                  payments, refunds, and withdrawals will be available after the
                  organiser approves your stall.
                </p>
              </div>
            </div>

            <div className="stall-pending-content">
              <div className="stall-pending-image-wrapper">
                <img src={ownedStall.StallImage} alt={ownedStall.StallName} />
              </div>

              <div className="stall-pending-details">
                <div className="stall-owned-pills">
                  <span>{ownedStall.stallType}</span>
                  <span>
                    {ownedStall.NeedElectricalPort
                      ? "Electrical needed"
                      : "No electrical port"}
                  </span>
                  <span>{ownedStall.stallStatus}</span>
                </div>

                <h3>{ownedStall.StallName}</h3>

                <p>{ownedStall.StallDescription}</p>

                <div className="stall-pending-meta-grid">
                  <div>
                    <span>Location</span>
                    <strong>Pending organiser assignment</strong>
                  </div>

                  <div>
                    <span>Stall school</span>
                    <strong>Pending organiser assignment</strong>
                  </div>

                  <div>
                    <span>Owner wallet</span>
                    <strong title={ownedStall.StallOwnerWallet}>
                      {formatWalletAddress(ownedStall.StallOwnerWallet)}
                    </strong>
                  </div>

                  <div>
                    <span>Next step</span>
                    <strong>Wait for organiser approval</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {stallPageState === stallPageStates.CAN_APPLY && (
        <>
          {renderCCNDayHero()}

          <section className="stall-application-card">
            <div className="stall-section-heading">
              <span className="stall-section-eyebrow">Stall application</span>

              <h2>Register your stall</h2>

              <p>
                Submit your stall details for organiser review. Location and
                stall school will be assigned by the organiser after approval.
              </p>
            </div>

            <form
              className="stall-application-form"
              onSubmit={handleSubmitStallApplication}
            >
              <label className="stall-form-field">
                <span>Stall name</span>
                <input
                  type="text"
                  name="StallName"
                  placeholder="Stall Name"
                  value={stallForm.StallName}
                  onChange={handleFormChange}
                />
              </label>

              <label className="stall-form-field">
                <span>Stall type</span>
                <select
                  name="stallType"
                  value={stallForm.stallType}
                  onChange={handleFormChange}
                >
                  {stallTypeOptions.map((stallType) => (
                    <option value={stallType} key={stallType}>
                      {stallType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stall-form-field full">
                <span>Stall image URL</span>
                <input
                  type="text"
                  name="StallImage"
                  placeholder="Paste an image URL for your stall"
                  value={stallForm.StallImage}
                  onChange={handleFormChange}
                />
              </label>

              <label className="stall-form-field full">
                <span>Stall description</span>
                <textarea
                  name="StallDescription"
                  placeholder="Describe what your stall is selling or offering..."
                  value={stallForm.StallDescription}
                  onChange={handleFormChange}
                  rows="5"
                />
              </label>

              <label className="stall-checkbox-field">
                <input
                  type="checkbox"
                  name="NeedElectricalPort"
                  checked={stallForm.NeedElectricalPort}
                  onChange={handleCheckboxChange}
                />

                <span>I need an electrical port for this stall.</span>
              </label>

              <div className="stall-form-actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit stall application"}
                </button>
              </div>
            </form>
          </section>
        </>
      )}

      {stallPageState === stallPageStates.HAS_STALL && ownedStall && (
        <>
          <div className="stall-owner-action-bar">
            <div>
              <h1>{ownedStall.StallName}</h1>
            </div>

            <div className="stall-owner-actions">
              {canWithdrawStallPayments && (
                <button
                  type="button"
                  className="stall-primary-button"
                  onClick={handleWithdrawStallPayments}
                  disabled={isWithdrawing}
                  title={`Withdrawable balance: ${formatWeiToEth(withdrawableBalance)}`}
                >
                  {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                </button>
              )}

              {canCompleteStallWithoutWithdrawal && (
                <button
                  type="button"
                  className="stall-primary-button"
                  onClick={handleCompleteStallWithoutWithdrawal}
                  disabled={isCompletingStall}
                  title="This stall has no remaining balance to withdraw."
                >
                  {isCompletingStall ? "Completing..." : "Complete Stall"}
                </button>
              )}

              <button
                type="button"
                className="stall-secondary-button"
                onClick={openEditStallModal}
                disabled={isStallActionInProgress}
              >
                Update Stall Status
              </button>

              <button
                type="button"
                className="stall-danger-button"
                onClick={openDeleteStallModal}
                disabled={isStallActionInProgress}
              >
                Delete stall
              </button>
            </div>
          </div>

          <section className="stall-owned-card">
            <div className="stall-owned-image-wrapper">
              <img src={ownedStall.StallImage} alt={ownedStall.StallName} />
            </div>

            <div className="stall-owned-content">
              <div className="stall-owned-pills">
                <span>{ownedStall.stallType}</span>
                <span>{ownedStall.StallSchool}</span>
                <span>{ownedStall.stallStatus}</span>
              </div>

              <h2>{ownedStall.StallName}</h2>

              <p>{ownedStall.StallDescription}</p>

              <div className="stall-owned-meta-grid">
                <div>
                  <span>Location</span>
                  <strong>{ownedStall.StallLocation}</strong>
                </div>

                <div>
                  <span>Electrical port</span>
                  <strong>
                    {ownedStall.NeedElectricalPort ? "Needed" : "Not needed"}
                  </strong>
                </div>

                <div>
                  <span>Owner wallet</span>
                  <strong title={ownedStall.StallOwnerWallet}>
                    {formatWalletAddress(ownedStall.StallOwnerWallet)}
                  </strong>
                </div>

                <div>
                  <span>Withdrawal allowed</span>
                  <strong>{ownedStall.AllowedWithdrawal ? "Yes" : "No"}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="stall-products-section">
            <div className="stall-products-heading">
              <div>
                <span className="stall-section-eyebrow">
                  {activeStallTab === "products" ? "Products" : "Transactions"}
                </span>

                <h2>
                  {activeStallTab === "products"
                    ? "Stall products"
                    : "Stall transactions"}
                </h2>
              </div>

              <span>
                {activeStallTab === "products"
                  ? `${products.length} products`
                  : isLoadingStallTransactions
                    ? "Loading transactions..."
                    : `${stallTransactions.length} transactions`}
              </span>
            </div>

            <div className="stall-tab-toggle">
              <button
                type="button"
                className={activeStallTab === "products" ? "active" : ""}
                onClick={() => setActiveStallTab("products")}
              >
                Products
              </button>

              <button
                type="button"
                className={activeStallTab === "transactions" ? "active" : ""}
                onClick={() => setActiveStallTab("transactions")}
              >
                Transactions
              </button>
            </div>

            {activeStallTab === "products" ? (
              products.length === 0 ? (
                <div className="stall-empty-products-state">
                  <img
                    src={EmptyStall}
                    alt=""
                    className="stall-empty-products-image"
                  />
                  <h3>No products added yet</h3>
                  <p>
                    This stall does not have any products yet. Add your first
                    product using the green plus button.
                  </p>
                </div>
              ) : (
                <div className="stall-product-grid">
                  {products.map((product) => (
                    <article
                      className="stall-product-card"
                      key={product.ProductID}
                    >
                      <div className="stall-product-image-wrapper">
                        <img
                          src={product.ProductImage}
                          alt={product.ProductName}
                          loading="lazy"
                        />

                        <div className="stall-product-card-actions">
                          <button
                            type="button"
                            className="stall-product-edit-button"
                            onClick={() => openEditProductModal(product)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="stall-product-delete-button"
                            onClick={() => openDeleteProductModal(product)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="stall-product-content">
                        <div className="stall-product-status-row">
                          <span>{product.productStatus}</span>
                          <strong>
                            {formatWeiToEth(product.ProductPrice)}
                          </strong>
                        </div>

                        <h3>{product.ProductName}</h3>

                        <p>{product.ProductDescription}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )
            ) : (
              <>
                {isLoadingStallTransactions ? (
                  <div className="stall-empty-transactions-state">
                    <CareLinkLoader
                      label="Loading transactions..."
                      sublabel="Please wait while CareLink loads this stall's transaction history."
                    />
                  </div>
                ) : stallTransactionsError ? (
                  <div className="stall-empty-transactions-state">
                    <h3>Unable to load transactions</h3>
                    <p>{stallTransactionsError}</p>
                  </div>
                ) : stallTransactions.length === 0 ? (
                  <div className="stall-empty-transactions-state">
                    <h3>No transactions found</h3>
                    <p>
                      This stall does not have any payment, refund, or
                      withdrawal records yet.
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
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {stallTransactions.map((transaction) => (
                          <tr
                            key={`${transaction.id}-${transaction.TransactionAt}`}
                          >
                            <td>{transaction.id}</td>

                            <td>{transaction.transactionType}</td>

                            <td title={transaction.wallet}>
                              {formatWalletAddress(transaction.wallet)}
                            </td>

                            <td
                              className={
                                transaction.amountType === "negative"
                                  ? "stall-transaction-amount negative"
                                  : "stall-transaction-amount positive"
                              }
                            >
                              {transaction.amount}
                            </td>

                            <td>
                              <span
                                className={
                                  transaction.amountType === "negative"
                                    ? "stall-transaction-status negative"
                                    : "stall-transaction-status positive"
                                }
                              >
                                {transaction.status}
                              </span>
                            </td>

                            <td>{transaction.date}</td>

                            <td className="stall-transaction-action-cell">
                              {transaction.canRefund ? (
                                <button
                                  type="button"
                                  className="stall-transaction-refund-button"
                                  onClick={() =>
                                    openRefundPaymentModal(transaction)
                                  }
                                  disabled={isRefundingPayment}
                                  title={`Refund ${transaction.id}`}
                                >
                                  Refund
                                </button>
                              ) : (
                                <span className="stall-transaction-no-action">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          {activeStallTab === "products" && (
            <button
              type="button"
              className="stall-floating-add-product"
              aria-label="Add product"
              onClick={openCreateProductModal}
            >
              <img src={AddProduct} alt="" />
            </button>
          )}
        </>
      )}
      {activeModal === "editStall" && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card">
            <div className="stall-modal-heading">
              <span>Edit stall</span>
              <h2>Update stall status</h2>
              <p>
                You can only change whether your approved stall is open or
                closed.
              </p>
            </div>

            <form
              onSubmit={handleUpdateStallStatus}
              className="stall-modal-form"
            >
              <label className="stall-form-field full">
                <span>Stall status</span>
                <select
                  value={stallStatusForm}
                  onChange={(event) => setStallStatusForm(event.target.value)}
                >
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </label>

              <div className="stall-modal-actions">
                <button
                  type="button"
                  className="stall-modal-cancel-button"
                  onClick={closeModal}
                  disabled={isUpdatingStall}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="stall-modal-save-button"
                  disabled={isUpdatingStall}
                >
                  {isUpdatingStall ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "createProduct" && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card wide">
            <div className="stall-modal-heading">
              <span>Create product</span>
              <h2>Add a new product</h2>
            </div>

            <form onSubmit={handleCreateProduct} className="stall-modal-form">
              {/* <label className="stall-form-field">
                <span>Stall ID</span>
                <input type="text" value={ownedStall.StallID} disabled />
              </label> */}

              <label className="stall-form-field">
                <span>Product price in wei</span>
                <input
                  type="text"
                  name="ProductPrice"
                  placeholder="Example: 5000000000000000"
                  value={productForm.ProductPrice}
                  onChange={handleProductFormChange}
                />
              </label>

              <label className="stall-form-field">
                <span>Product status</span>
                <select
                  name="productStatus"
                  value={productForm.productStatus}
                  onChange={handleProductFormChange}
                >
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </label>

              <label className="stall-form-field full">
                <span>Product name</span>
                <input
                  type="text"
                  name="ProductName"
                  placeholder="Example: Chocolate Brownie"
                  value={productForm.ProductName}
                  onChange={handleProductFormChange}
                />
              </label>

              <label className="stall-form-field full">
                <span>Product image URL</span>
                <input
                  type="text"
                  name="ProductImage"
                  placeholder="Paste an image URL for your product"
                  value={productForm.ProductImage}
                  onChange={handleProductFormChange}
                />
              </label>

              <label className="stall-form-field full">
                <span>Product description</span>
                <textarea
                  name="ProductDescription"
                  rows="5"
                  placeholder="Describe your product..."
                  value={productForm.ProductDescription}
                  onChange={handleProductFormChange}
                />
              </label>

              {productFormError && (
                <div className="stall-product-form-error" role="alert">
                  {productFormError}
                </div>
              )}

              <div className="stall-modal-actions">
                <button
                  type="button"
                  className="stall-modal-cancel-button"
                  onClick={closeModal}
                  disabled={isSavingProduct}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="stall-modal-save-button"
                  disabled={isSavingProduct}
                >
                  {isSavingProduct ? "Creating..." : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "editProduct" && selectedProduct && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card wide">
            <div className="stall-modal-heading">
              <span>Edit product</span>
              <h2>Update product details</h2>
            </div>

            <form onSubmit={handleUpdateProduct} className="stall-modal-form">
              <label className="stall-form-field">
                <span>Product name</span>
                <input
                  type="text"
                  name="ProductName"
                  value={productForm.ProductName}
                  onChange={handleProductFormChange}
                />
              </label>

              <label className="stall-form-field">
                <span>Product status</span>
                <select
                  name="productStatus"
                  value={productForm.productStatus}
                  onChange={handleProductFormChange}
                >
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </label>

              <label className="stall-form-field">
                <span>Product price in wei</span>
                <input
                  type="text"
                  name="ProductPrice"
                  value={productForm.ProductPrice}
                  onChange={handleProductFormChange}
                />
              </label>

              <label className="stall-form-field full">
                <span>Product image URL</span>
                <input
                  type="text"
                  name="ProductImage"
                  value={productForm.ProductImage}
                  onChange={handleProductFormChange}
                />
              </label>

              <label className="stall-form-field full">
                <span>Product description</span>
                <textarea
                  name="ProductDescription"
                  rows="5"
                  value={productForm.ProductDescription}
                  onChange={handleProductFormChange}
                />
              </label>

              {productFormError && (
                <div className="stall-product-form-error" role="alert">
                  {productFormError}
                </div>
              )}

              <div className="stall-modal-actions">
                <button
                  type="button"
                  className="stall-modal-cancel-button"
                  onClick={closeModal}
                  disabled={isSavingProduct}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="stall-modal-save-button"
                  disabled={isSavingProduct}
                >
                  {isSavingProduct ? "Saving..." : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "deleteStall" && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card confirm">
            <div className="stall-modal-heading">
              <span>Delete stall</span>
              <h2>Are you sure?</h2>
              <p>
                This will attempt to delete your stall from the blockchain.
                Deletion is not allowed while CCN Day is ongoing or when the
                stall still has unsettled paid payments.
              </p>
            </div>

            <div className="stall-modal-actions">
              <button
                type="button"
                className="stall-modal-cancel-button"
                onClick={closeModal}
                disabled={isDeletingStall}
              >
                Cancel
              </button>

              <button
                type="button"
                className="stall-modal-delete-button"
                onClick={handleConfirmDeleteStall}
                disabled={isDeletingStall}
              >
                {isDeletingStall ? "Confirming delete..." : "Confirm delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "deleteProduct" && selectedProduct && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card confirm">
            <div className="stall-modal-heading">
              <span>Delete product</span>
              <h2>Delete {selectedProduct.ProductName}?</h2>
              <p>
                This product will be removed from the mock product list. In the
                real blockchain flow, this will call DeleteProduct.
              </p>
            </div>

            <div className="stall-modal-actions">
              <button
                type="button"
                className="stall-modal-cancel-button"
                onClick={closeModal}
                disabled={isDeletingProduct}
              >
                Cancel
              </button>

              <button
                type="button"
                className="stall-modal-delete-button"
                onClick={handleConfirmDeleteProduct}
                disabled={isDeletingProduct}
              >
                {isDeletingProduct ? "Confirming delete..." : "Confirm delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "refundPayment" && selectedTransaction && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card confirm">
            <div className="stall-modal-heading">
              <span>Refund payment</span>

              <h2>Refund {selectedTransaction.id}?</h2>

              <p>
                This will refund the selected paid transaction on the
                blockchain. The refund will also appear in this stall's
                transaction history.
              </p>
            </div>

            <div className="stall-owned-meta-grid">
              <div>
                <span>Customer wallet</span>
                <strong title={selectedTransaction.CustomerWallet}>
                  {formatWalletAddress(selectedTransaction.CustomerWallet)}
                </strong>
              </div>

              <div>
                <span>Refund amount</span>
                <strong>{selectedTransaction.amount}</strong>
              </div>
            </div>

            <div className="stall-modal-actions">
              <button
                type="button"
                className="stall-modal-cancel-button"
                onClick={closeModal}
                disabled={isRefundingPayment}
              >
                Cancel
              </button>

              <button
                type="button"
                className="stall-modal-delete-button"
                onClick={handleConfirmRefundPayment}
                disabled={isRefundingPayment}
              >
                {isRefundingPayment ? "Refunding..." : "Confirm refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "success" && (
        <div className="stall-modal-backdrop">
          <div className="stall-modal-card confirm">
            <div className={`stall-modal-heading ${transactionModalStatus}`}>
              <span>
                {transactionModalStatus === "success" ? "Success" : "Error"}
              </span>

              <h2>{successMessage}</h2>

              <p
                className={
                  transactionModalStatus === "error"
                    ? "stall-modal-error-text"
                    : ""
                }
              >
                {transactionModalStatus === "success"
                  ? "Your blockchain transaction has been completed successfully."
                  : modalErrorMessage}
              </p>
            </div>

            <div className="stall-modal-actions">
              <button
                type="button"
                className="stall-modal-save-button"
                onClick={closeModal}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stall;
