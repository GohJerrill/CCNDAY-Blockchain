import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { MdKeyboardDoubleArrowRight } from "react-icons/md";
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
  const fraction = (wei % ether).toString().padStart(18, "0").slice(0, 6);
  const cleanedFraction = fraction.replace(/0+$/, "");

  return `${whole}${cleanedFraction ? `.${cleanedFraction}` : ""} ETH`;
};

const formatSGDCents = (centsValue) => {
  const cents = BigInt(centsValue || "0");
  const dollars = cents / 100n;
  const centsPart = (cents % 100n).toString().padStart(2, "0");

  return `S$${dollars}.${centsPart}`;
};

const centsToSGDInput = (centsValue) => {
  if (centsValue === undefined || centsValue === null || centsValue === "") {
    return "";
  }

  const cents = BigInt(centsValue.toString());
  const dollars = cents / 100n;
  const centsPart = (cents % 100n).toString().padStart(2, "0");

  return `${dollars}.${centsPart}`;
};

const parseSGDInputToCents = (inputValue) => {
  const cleanedValue = inputValue.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(cleanedValue)) {
    return "";
  }

  const [dollarsPart, centsPart = ""] = cleanedValue.split(".");
  const cents = BigInt(dollarsPart) * 100n + BigInt(centsPart.padEnd(2, "0"));

  return cents.toString();
};

const getSGDInputValidationMessage = (inputValue) => {
  const cleanedValue = inputValue.trim();

  if (!cleanedValue) {
    return "Enter the SGD amount you want to pay.";
  }

  if (!/^\d+(\.\d{1,2})?$/.test(cleanedValue)) {
    return "Enter a valid SGD amount, for example 2, 2.50, or 10.00.";
  }

  const amountSGDCents = parseSGDInputToCents(cleanedValue);

  if (!amountSGDCents || BigInt(amountSGDCents) <= 0n) {
    return "Payment amount must be more than S$0.00.";
  }

  return "";
};

const formatWalletAddress = (walletAddress) => {
  if (!walletAddress) return "Unknown wallet";
  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
};

const isSameWalletAddress = (firstWallet, secondWallet) => {
  if (!firstWallet || !secondWallet) return false;
  return firstWallet.toLowerCase() === secondWallet.toLowerCase();
};

const getProductId = (product) => {
  return toNumber(
    product?.ProductID ?? product?.productID ?? product?.id ?? product?.[0],
  );
};

const getProductName = (product) => {
  return (
    product?.ProductName ??
    product?.productName ??
    product?.name ??
    "Selected product"
  );
};

const getProductSGDCents = (product) => {
  const productPrice =
    product?.ProductPriceSGDCents ?? product?.ProductPrice ?? product?.[5];

  if (productPrice === undefined || productPrice === null) {
    return "";
  }

  return productPrice.toString();
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

  if (rawMessage.includes("IncorrectPaymentAmount")) {
    return "The payment amount changed before confirmation. Please refresh the payment page and try again.";
  }

  if (rawMessage.includes("InvalidOraclePrice")) {
    return "The Chainlink oracle returned an invalid ETH/USD price. Please try again later.";
  }

  if (rawMessage.includes("StaleOraclePrice")) {
    return "The Chainlink oracle price is too old right now. Please try again later.";
  }

  if (rawMessage.includes("CCNDayPaymentNotStarted")) {
    return "CCN Day has not started yet, so payment is unavailable.";
  }

  if (rawMessage.includes("CCNDayPaymentEnded")) {
    return "CCN Day has ended, so payment is unavailable.";
  }

  if (rawMessage.includes("StallNotOpenForPayment")) {
    return "This stall is not open for payment.";
  }

  if (rawMessage.includes("StallNotFromCurrentCCNDay")) {
    return "This stall is not part of the current CCN Day.";
  }

  if (rawMessage.includes("InvalidPaymentAmount")) {
    return "Payment amount must be more than S$0.00.";
  }

  if (rawMessage.includes("WalletNotRegistered")) {
    return "Your wallet must be registered before making payment.";
  }

  if (
    rawMessage.includes("execution reverted") ||
    rawMessage.includes("CALL_EXCEPTION")
  ) {
    return "The payment could not be completed. Please check the stall, CCN Day status, SGD amount, and wallet balance.";
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

  const selectedProductSGDCents = getProductSGDCents(selectedProductFromState);

  const [stall, setStall] = useState(stallFromState);
  const [selectedProduct] = useState(selectedProductFromState);
  const [currentCCNDay, setCurrentCCNDay] = useState(null);
  const [walletBalanceWei, setWalletBalanceWei] = useState("0");

  const [paymentAmountSGD, setPaymentAmountSGD] = useState(
    selectedProductSGDCents ? centsToSGDInput(selectedProductSGDCents) : "",
  );
  const [amountSGDCents, setAmountSGDCents] = useState(
    selectedProductSGDCents || "",
  );
  const [requiredPaymentWei, setRequiredPaymentWei] = useState("");

  const [dragValue, setDragValue] = useState(0);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isLoadingOracleAmount, setIsLoadingOracleAmount] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [pageError, setPageError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const selectedProductId = getProductId(selectedProduct);

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
    const validationError = getSGDInputValidationMessage(paymentAmountSGD);

    if (validationError) {
      setAmountSGDCents("");
      setRequiredPaymentWei("");
      setIsLoadingOracleAmount(false);
      return;
    }

    setAmountSGDCents(parseSGDInputToCents(paymentAmountSGD));
  }, [paymentAmountSGD]);

  useEffect(() => {
    let shouldUpdateState = true;

    const loadRequiredPaymentAmount = async () => {
      if (
        !paymentsContract ||
        !amountSGDCents ||
        BigInt(amountSGDCents) <= 0n
      ) {
        setRequiredPaymentWei("");
        return;
      }

      try {
        setIsLoadingOracleAmount(true);
        setPaymentError("");

        const requiredWei =
          await paymentsContract.CalculateRequiredWeiFromSGDCents(
            amountSGDCents,
          );

        if (!shouldUpdateState) return;

        setRequiredPaymentWei(requiredWei.toString());
      } catch (error) {
        console.error("Required payment amount load error:", error);

        if (!shouldUpdateState) return;

        setRequiredPaymentWei("");
        setPaymentError(getFriendlyPaymentErrorMessage(error));
      } finally {
        if (shouldUpdateState) {
          setIsLoadingOracleAmount(false);
        }
      }
    };

    loadRequiredPaymentAmount();

    return () => {
      shouldUpdateState = false;
    };
  }, [paymentsContract, amountSGDCents]);

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

    const sgdValidationMessage = getSGDInputValidationMessage(paymentAmountSGD);

    if (sgdValidationMessage) {
      return sgdValidationMessage;
    }

    if (isLoadingOracleAmount) {
      return "Calculating the required blockchain payment amount...";
    }

    if (!amountSGDCents || BigInt(amountSGDCents) <= 0n) {
      return "Payment amount must be more than S$0.00.";
    }

    if (!requiredPaymentWei) {
      return "Unable to calculate the required blockchain amount yet.";
    }

    if (BigInt(requiredPaymentWei) <= 0n) {
      return "Required blockchain amount must be more than 0 wei.";
    }

    if (BigInt(requiredPaymentWei) > BigInt(walletBalanceWei || "0")) {
      return "Your wallet balance is too low for this payment.";
    }

    return "";
  }, [
    isConnected,
    walletAddress,
    paymentsContract,
    stall,
    isViewingOwnStall,
    paymentState,
    paymentAmountSGD,
    isLoadingOracleAmount,
    amountSGDCents,
    requiredPaymentWei,
    walletBalanceWei,
  ]);

  const canDragToPay =
    !validationMessage &&
    !isLoadingBalance &&
    !isLoadingOracleAmount &&
    !isPaying &&
    Boolean(stall) &&
    Boolean(amountSGDCents) &&
    Boolean(requiredPaymentWei);

  const dragProgressStyle = {
    "--drag-progress": `${dragValue}%`,
    "--drag-arrow-left": `calc(${dragValue}% - ${dragValue * 0.84}px)`,
  };

  const handlePaymentAmountChange = (event) => {
    setPaymentAmountSGD(event.target.value);
    setDragValue(0);
    setPaymentNotice("");
    setPaymentError("");
  };

  const handleConfirmPayment = async () => {
    if (
      !canDragToPay ||
      isPaying ||
      !stall ||
      !paymentsContract ||
      !amountSGDCents ||
      !requiredPaymentWei
    ) {
      setDragValue(0);
      return;
    }

    try {
      setIsPaying(true);
      setPaymentNotice("");
      setPaymentError("");

      const tx = await paymentsContract.PaySGDToStall(
        stall.StallID,
        amountSGDCents,
        {
          value: BigInt(requiredPaymentWei),
        },
      );

      const transactionReceipt = await tx.wait();

      const receipt = {
        receiptId: `CL-${Date.now()}`,
        stallId: stall.StallID,
        stallName: stall.StallName,
        stallLocation: stall.StallLocation,
        stallOwnerWallet: stall.StallOwnerWallet,
        productName: selectedProduct ? getProductName(selectedProduct) : "",
        productId: selectedProduct ? selectedProductId : 0,
        amountWei: requiredPaymentWei,
        amountEth: formatWeiToEth(requiredPaymentWei),
        amountSGDCents,
        amountSGD: formatSGDCents(amountSGDCents),
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
            <span className="payment-eyebrow">Stall payment</span>

            <h2>Confirm payment</h2>

            {selectedProduct ? (
              <div className="payment-selected-product">
                <span>Selected product reference</span>
                <strong>{getProductName(selectedProduct)}</strong>
                <p>
                  Product amount pre-filled as{" "}
                  {formatSGDCents(getProductSGDCents(selectedProduct))}
                </p>
              </div>
            ) : (
              <div className="payment-selected-product empty">
                <span>Custom stall payment</span>
                <strong>Pay any SGD amount to this stall</strong>
                <p>Enter the amount you want to pay, like PayLah-style.</p>
              </div>
            )}

            <label className="payment-form-field">
              <span>Payment amount in SGD</span>
              <input
                type="text"
                value={paymentAmountSGD}
                onChange={handlePaymentAmountChange}
                placeholder="Example: 2.50"
                disabled={isPaying}
              />
            </label>

            {/* <label className="payment-form-field">
              <span>Required blockchain amount</span>
              <input
                type="text"
                value={
                  isLoadingOracleAmount
                    ? "Calculating with Chainlink oracle..."
                    : requiredPaymentWei
                      ? `${requiredPaymentWei} wei`
                      : ""
                }
                readOnly
                disabled
              />
            </label> */}

            <div className="payment-balance-note">
              <span>Estimated ETH payment</span>
              <strong>
                {isLoadingOracleAmount
                  ? "Calculating..."
                  : requiredPaymentWei
                    ? formatWeiToEth(requiredPaymentWei)
                    : "Unavailable"}
              </strong>
            </div>

            <div className="payment-balance-note">
              <span>SGD amount</span>
              <strong>
                {amountSGDCents ? formatSGDCents(amountSGDCents) : "S$0.00"}
              </strong>
            </div>

            {/* <div className="payment-balance-note">
              <span>Your balance</span>
              <strong>
                {isLoadingBalance
                  ? "Loading balance..."
                  : `${walletBalanceWei} wei`}
              </strong>
            </div> */}

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
                    : "Drag to complete payment"}
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
                  <MdKeyboardDoubleArrowRight />
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
