import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CareLinkLoader from "../components/CareLinkLoader";
import { useWeb3 } from "../context/Web3Context";
import CareLinkLogo from "../assets/carelink-icon.svg";
import "./PaymentPage.css";

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
  const wei = BigInt(weiValue || "0");
  const ether = 10n ** 18n;
  const whole = wei / ether;
  const fraction = (wei % ether).toString().padStart(18, "0").slice(0, 4);
  const cleanedFraction = fraction.replace(/0+$/, "");

  return `${whole}${cleanedFraction ? `.${cleanedFraction}` : ""} ETH`;
};

const formatWalletAddress = (walletAddress) => {
  if (!walletAddress) return "Unknown wallet";
  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
};

const isSameWalletAddress = (firstWallet, secondWallet) => {
  if (!firstWallet || !secondWallet) return false;
  return firstWallet.toLowerCase() === secondWallet.toLowerCase();
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

const mapCCNDayFromContract = (ccnDay) => {
  return {
    CCNDayID: toNumber(ccnDay.CCNDayID ?? ccnDay[0]),
    CCNName: ccnDay.CCNName ?? ccnDay[1],
    CCNDescription: ccnDay.CCNDescription ?? ccnDay[2],
    StartDateTime: toNumber(ccnDay.StartDateTime ?? ccnDay[3]),
    EndDateTime: toNumber(ccnDay.EndDateTime ?? ccnDay[4]),
  };
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

const getFriendlyPaymentErrorMessage = (error) => {
  const rawMessage = getBlockchainErrorMessage(error);

  if (
    rawMessage.includes("user rejected") ||
    rawMessage.includes("User rejected") ||
    rawMessage.includes("ACTION_REJECTED") ||
    rawMessage.includes("denied transaction signature")
  ) {
    return "Transaction was cancelled in MetaMask.";
  }

  if (rawMessage.includes("CannotPayOwnStall")) {
    return "You cannot pay to your own stall.";
  }

  if (rawMessage.includes("OrganiserCannotPay")) {
    return "The organiser cannot make stall payments.";
  }

  if (rawMessage.includes("StallNotOpen")) {
    return "This stall is not open for payment.";
  }

  if (rawMessage.includes("CCNDayNotActive")) {
    return "CCN Day is not active right now, so payment is unavailable.";
  }

  if (rawMessage.includes("PaymentAmountMustBeMoreThanZero")) {
    return "Payment amount must be more than 0 wei.";
  }

  if (
    rawMessage.includes("execution reverted") ||
    rawMessage.includes("CALL_EXCEPTION")
  ) {
    return "The payment could not be completed. Please check the stall, CCN Day status, and payment amount.";
  }

  return rawMessage || "Unable to complete payment. Please try again.";
};

const getCCNDayPaymentState = (currentCCNDay) => {
  if (!currentCCNDay || !currentCCNDay.CCNDayID) {
    return {
      isOpen: false,
      message: "There is currently no active CCN Day.",
    };
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (currentTimestamp < currentCCNDay.StartDateTime) {
    return {
      isOpen: false,
      message: "CCN Day has not started yet.",
    };
  }

  if (currentTimestamp > currentCCNDay.EndDateTime) {
    return {
      isOpen: false,
      message: "CCN Day has ended.",
    };
  }

  return {
    isOpen: true,
    message: "CCN Day is open. You can complete this payment.",
  };
};

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { stallId } = useParams();

  const {
    walletAddress,
    stallsContract,
    ccnDayContract,
    paymentsContract,
    isConnected,
  } = useWeb3();

  const selectedProductFromState = location.state?.selectedProduct || null;
  const stallFromState = location.state?.stall || null;

  const [stall, setStall] = useState(stallFromState);
  const [selectedProduct] = useState(selectedProductFromState);

  const [currentCCNDay, setCurrentCCNDay] = useState(null);
  const [walletBalanceWei, setWalletBalanceWei] = useState("0");
  const [paymentAmountWei, setPaymentAmountWei] = useState(
    selectedProductFromState?.ProductPrice || "",
  );

  const [dragValue, setDragValue] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  const [pageError, setPageError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const loadPaymentPage = async () => {
      if (!stallsContract || !ccnDayContract) {
        setPageError(
          "Blockchain contracts are not connected yet. Please refresh and try again.",
        );
        setIsLoadingPage(false);
        return;
      }

      const numericStallId = Number(stallId);

      if (!numericStallId || Number.isNaN(numericStallId)) {
        setPageError("Invalid payment link. Please return to the stall page.");
        setIsLoadingPage(false);
        return;
      }

      try {
        setIsLoadingPage(true);
        setPageError("");

        const contractCCNDay = await ccnDayContract.GetCurrentCCNDay();
        setCurrentCCNDay(mapCCNDayFromContract(contractCCNDay));

        if (!stallFromState) {
          const contractStall =
            await stallsContract.GetStallDetails(numericStallId);

          setStall(mapStallFromContract(contractStall));
        }
      } catch (error) {
        console.error("Payment page load error:", error);
        setPageError("Unable to load payment details from the blockchain.");
      } finally {
        setIsLoadingPage(false);
      }
    };

    loadPaymentPage();
  }, [stallId, stallsContract, ccnDayContract, stallFromState]);

  useEffect(() => {
    const loadWalletBalance = async () => {
      if (!isConnected || !walletAddress || !window.ethereum) {
        setWalletBalanceWei("0");
        setIsLoadingBalance(false);
        return;
      }

      try {
        setIsLoadingBalance(true);

        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const balance = await browserProvider.getBalance(walletAddress);

        setWalletBalanceWei(balance.toString());
      } catch (error) {
        console.error("Wallet balance load error:", error);
        setWalletBalanceWei("0");
      } finally {
        setIsLoadingBalance(false);
      }
    };

    loadWalletBalance();
  }, [isConnected, walletAddress]);

  const paymentState = getCCNDayPaymentState(currentCCNDay);

  const isViewingOwnStall = isSameWalletAddress(
    walletAddress,
    stall?.StallOwnerWallet,
  );

  const cleanedPaymentAmount = paymentAmountWei.trim();

  const validationMessage = useMemo(() => {
    if (!isConnected || !walletAddress) {
      return "Please connect your wallet before making payment.";
    }

    if (!paymentsContract) {
      return "Payment contract is not connected yet. Please refresh and try again.";
    }

    if (!stall) {
      return "Stall details are not loaded yet.";
    }

    if (isViewingOwnStall) {
      return "You cannot pay to your own stall.";
    }

    if (stall.stallStatus !== "Open") {
      return "This stall is not open for payment.";
    }

    if (!paymentState.isOpen) {
      return paymentState.message;
    }

    if (!cleanedPaymentAmount) {
      return "Enter the amount you want to pay in wei.";
    }

    if (!/^\d+$/.test(cleanedPaymentAmount)) {
      return "Payment amount must be a whole number in wei.";
    }

    if (BigInt(cleanedPaymentAmount) <= 0n) {
      return "Payment amount must be more than 0 wei.";
    }

    if (BigInt(cleanedPaymentAmount) > BigInt(walletBalanceWei || "0")) {
      return "Payment amount cannot be more than your wallet balance.";
    }

    return "";
  }, [
    isConnected,
    walletAddress,
    paymentsContract,
    stall,
    isViewingOwnStall,
    paymentState,
    cleanedPaymentAmount,
    walletBalanceWei,
  ]);

  const canDragToPay =
    !validationMessage && !isLoadingBalance && !isPaying && Boolean(stall);

  const dragProgressStyle = {
    "--drag-progress": `${dragValue}%`,
    "--drag-arrow-left": `calc(${dragValue}% - ${dragValue * 0.84}px)`,
  };

  const handlePaymentAmountChange = (event) => {
    setPaymentAmountWei(event.target.value);
    setDragValue(0);
    setPaymentNotice("");
    setPaymentError("");
  };

  const handleConfirmPayment = async () => {
    if (!canDragToPay || isPaying || !stall || !paymentsContract) {
      setDragValue(0);
      return;
    }

    try {
      setIsPaying(true);
      setPaymentNotice("");
      setPaymentError("");

      const tx = await paymentsContract.PayToStall(stall.StallID, {
        value: BigInt(cleanedPaymentAmount),
      });

      const transactionReceipt = await tx.wait();

      const receipt = {
        receiptId: `CL-${Date.now()}`,
        stallId: stall.StallID,
        stallName: stall.StallName,
        stallLocation: stall.StallLocation,
        stallOwnerWallet: stall.StallOwnerWallet,
        productName: selectedProduct?.ProductName || "",
        productId: selectedProduct?.ProductID || 0,
        amountWei: cleanedPaymentAmount,
        customerWallet: walletAddress,
        transactionHash: tx.hash,
        blockNumber: transactionReceipt?.blockNumber || "",
        paidAt: new Date().toISOString(),
      };

      navigate("/PaymentSuccess", {
        replace: true,
        state: {
          receipt,
        },
      });
    } catch (error) {
      console.error("Payment error:", error);

      setPaymentError(getFriendlyPaymentErrorMessage(error));
      setDragValue(0);
    } finally {
      setIsPaying(false);
    }
  };

  const handleDragChange = (event) => {
    if (isPaying) return;

    const nextValue = Number(event.target.value);
    setDragValue(nextValue);
  };

  const handleDragRelease = (event) => {
    const finalValue = Number(event?.currentTarget?.value ?? dragValue);

    if (!canDragToPay || isPaying) {
      setDragValue(0);
      return;
    }

    if (finalValue >= 96) {
      setDragValue(100);
      handleConfirmPayment();
      return;
    }

    setDragValue(0);
  };

  const handleCancelPayment = () => {
    navigate(`/StallView/${stallId}`);
  };

  if (isLoadingPage) {
    return (
      <main className="payment-page">
        <section className="payment-state-card">
          <CareLinkLoader
            label="Loading payment..."
            sublabel="Please wait while CareLink prepares your payment page."
          />
        </section>
      </main>
    );
  }

  if (pageError || !stall) {
    return (
      <main className="payment-page">
        <section className="payment-state-card">
          <span className="payment-eyebrow">Payment unavailable</span>
          <h1>Unable to load payment</h1>
          <p>{pageError || "This payment could not be prepared."}</p>

          <button type="button" onClick={() => navigate("/UserDashboard")}>
            Back to dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="payment-page">
      <section className="payment-shell">
        <div className="payment-brand">
          <img src={CareLinkLogo} alt="CareLink" />
          <span>CareLink Secure Payment</span>
        </div>

        <div className="payment-layout">
          <section className="payment-stall-card">
            <div className="payment-stall-image-wrapper">
              <img src={stall.StallImage} alt={stall.StallName} />
            </div>

            <div className="payment-stall-content">
              <span className="payment-eyebrow">Paying to stall</span>

              <h1>{stall.StallName}</h1>

              <p>{stall.StallDescription}</p>

              <div className="payment-pill-row">
                <span>{stall.stallType}</span>
                <span>{stall.StallSchool}</span>
                <span>{stall.stallStatus}</span>
              </div>

              <div className="payment-meta-grid">
                <div>
                  <span>Location</span>
                  <strong>{stall.StallLocation}</strong>
                </div>

                <div>
                  <span>Owner wallet</span>
                  <strong title={stall.StallOwnerWallet}>
                    {formatWalletAddress(stall.StallOwnerWallet)}
                  </strong>
                </div>

                <div>
                  <span>Wallet balance</span>
                  <strong>
                    {isLoadingBalance
                      ? "Loading..."
                      : formatWeiToEth(walletBalanceWei)}
                  </strong>
                </div>

                <div>
                  <span>CCN Day status</span>
                  <strong>
                    {paymentState.isOpen ? "Open" : "Unavailable"}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <aside className="payment-checkout-card">
            <span className="payment-eyebrow">Order checkout</span>

            <h2>Confirm payment</h2>

            {selectedProduct ? (
              <div className="payment-selected-product">
                <span>Selected product</span>
                <strong>{selectedProduct.ProductName}</strong>
                <p>{formatWeiToEth(selectedProduct.ProductPrice)}</p>
              </div>
            ) : (
              <div className="payment-selected-product empty">
                <span>No product selected</span>
                <strong>Pay directly to stall</strong>
                <p>Enter your own payment amount below.</p>
              </div>
            )}

            <label className="payment-form-field">
              <span>Payment amount in wei</span>
              <input
                type="text"
                value={paymentAmountWei}
                onChange={handlePaymentAmountChange}
                placeholder="Example: 5000000000000000"
                disabled={isPaying}
              />
            </label>

            <div className="payment-balance-note">
              <span>Your balance</span>
              <strong>
                {isLoadingBalance
                  ? "Loading balance..."
                  : `${walletBalanceWei} wei`}
              </strong>
            </div>

            {validationMessage && (
              <div className="payment-validation-message" role="alert">
                {validationMessage}
              </div>
            )}

            {paymentNotice && (
              <div className="payment-success-message" role="status">
                {paymentNotice}
              </div>
            )}

            {paymentError && (
              <div className="payment-validation-message" role="alert">
                {paymentError}
              </div>
            )}

            <div
              className={
                canDragToPay
                  ? "payment-drag-control"
                  : "payment-drag-control disabled"
              }
            >
              <div className="payment-drag-copy">
                <span>
                  {isPaying
                    ? "Processing transaction..."
                    : "Drag to complete order"}
                </span>
                <strong>
                  {isPaying
                    ? "Confirming on blockchain"
                    : "Slide the arrow to the end"}
                </strong>
              </div>

              <div
                className="payment-drag-track-shell"
                style={dragProgressStyle}
              >
                <div className="payment-drag-track-fill" />

                <span className="payment-drag-placeholder">
                  {isPaying ? "Confirming payment..." : "Swipe to pay"}
                </span>

                <div className="payment-drag-arrow" aria-hidden="true">
                  <span>➜</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={dragValue}
                  onChange={handleDragChange}
                  onPointerUp={handleDragRelease}
                  onKeyUp={handleDragRelease}
                  onBlur={handleDragRelease}
                  disabled={!canDragToPay}
                  aria-label="Drag to complete payment"
                />
              </div>
            </div>

            <button
              type="button"
              className="payment-cancel-button"
              onClick={handleCancelPayment}
              disabled={isPaying}
            >
              Cancel payment
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default PaymentPage;
