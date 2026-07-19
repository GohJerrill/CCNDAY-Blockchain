import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CareLinkLoader from "../components/CareLinkLoader";
import { useWeb3 } from "../context/Web3Context";
import "./ProductPage.css";

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

const getFriendlyProductPageErrorMessage = (error) => {
  const rawMessage = getBlockchainErrorMessage(error);

  if (rawMessage.includes("StallDoesNotExist")) {
    return "This stall does not exist on the blockchain.";
  }

  if (rawMessage.includes("NoCurrentCCNDay")) {
    return "There is currently no active CCN Day.";
  }

  if (
    rawMessage.includes("execution reverted") ||
    rawMessage.includes("CALL_EXCEPTION")
  ) {
    return "Unable to load this stall from the blockchain. Please check that the stall exists.";
  }

  return rawMessage || "Unable to load this stall from the blockchain.";
};

const getCCNDayPaymentState = (currentCCNDay) => {
  if (!currentCCNDay || !currentCCNDay.CCNDayID) {
    return {
      isOpen: false,
      message: "There is currently no active CCN Day. Payment is unavailable.",
      statusLabel: "Not available",
    };
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (currentTimestamp < currentCCNDay.StartDateTime) {
    return {
      isOpen: false,
      message:
        "CCN Day has not started yet. Payment will open once CCN Day begins.",
      statusLabel: "Not started",
    };
  }

  if (currentTimestamp > currentCCNDay.EndDateTime) {
    return {
      isOpen: false,
      message: "CCN Day has ended. Payment is no longer available.",
      statusLabel: "Ended",
    };
  }

  return {
    isOpen: true,
    message: "CCN Day is currently open. You can proceed to payment.",
    statusLabel: "Open",
  };
};

const ProductPage = () => {
  const navigate = useNavigate();
  const { stallId } = useParams();

  const { walletAddress, stallsContract, ccnDayContract } = useWeb3();

  const [stall, setStall] = useState(null);
  const [products, setProducts] = useState([]);
  const [currentCCNDay, setCurrentCCNDay] = useState(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const loadProductPage = async () => {
      if (!stallsContract || !ccnDayContract) {
        setPageError(
          "Blockchain contracts are not connected yet. Please refresh and try again.",
        );
        setIsLoadingPage(false);
        return;
      }

      const numericStallId = Number(stallId);

      if (!numericStallId || Number.isNaN(numericStallId)) {
        setPageError("Invalid stall link. Please return to the dashboard.");
        setIsLoadingPage(false);
        return;
      }

      try {
        setIsLoadingPage(true);
        setPageError("");
        setSelectedProduct(null);

        let mappedCCNDay = null;

        try {
          const contractCCNDay = await ccnDayContract.GetCurrentCCNDay();
          mappedCCNDay = mapCCNDayFromContract(contractCCNDay);
        } catch (error) {
          console.error("Current CCN Day load error:", error);
          mappedCCNDay = null;
        }

        setCurrentCCNDay(mappedCCNDay);

        const contractStall =
          await stallsContract.GetStallDetails(numericStallId);

        const mappedStall = mapStallFromContract(contractStall);

        setStall(mappedStall);

        const productIds =
          await stallsContract.GetProductIDsByStallID(numericStallId);

        const mappedProducts = await Promise.all(
          productIds.map(async (productId) => {
            const contractProduct = await stallsContract.Products(productId);
            return mapProductFromContract(contractProduct);
          }),
        );

        setProducts(mappedProducts);
      } catch (error) {
        console.error("Product page load error:", error);

        setStall(null);
        setProducts([]);
        setCurrentCCNDay(null);
        setPageError(getFriendlyProductPageErrorMessage(error));
      } finally {
        setIsLoadingPage(false);
      }
    };

    loadProductPage();
  }, [stallId, stallsContract, ccnDayContract]);

  const paymentState = getCCNDayPaymentState(currentCCNDay);
  const isCCNDayOpen = paymentState.isOpen;
  const isStallOpen = stall?.stallStatus === "Open";
  const isViewingOwnStall = isSameWalletAddress(
    walletAddress,
    stall?.StallOwnerWallet,
  );

  const canSelectProduct = isCCNDayOpen && isStallOpen && !isViewingOwnStall;
  const canPayToStall = canSelectProduct;

  useEffect(() => {
    if (!canSelectProduct) {
      setSelectedProduct(null);
    }
  }, [canSelectProduct]);

  const handleSelectProduct = (product) => {
    if (!canSelectProduct || product.productStatus !== "Available") {
      return;
    }

    setSelectedProduct(product);
  };

  const handlePayToStall = () => {
    if (!stall || !canPayToStall) return;

    navigate(`/Payment/${stall.StallID}`, {
      state: {
        stall,
        selectedProduct,
      },
    });
  };

  if (isLoadingPage) {
    return (
      <div className="product-page">
        <section className="product-page-state">
          <CareLinkLoader
            label="Loading stall products..."
            sublabel="Please wait while CareLink loads this stall from the blockchain."
          />
        </section>
      </div>
    );
  }

  if (pageError || !stall) {
    return (
      <div className="product-page">
        <section className="product-page-state">
          <span className="product-section-eyebrow">Unable to load stall</span>
          <h1>Product page unavailable</h1>
          <p>{pageError || "This stall could not be loaded."}</p>

          <button type="button" onClick={() => navigate("/UserDashboard")}>
            Back to dashboard
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="product-page">
      <section className="product-stall-hero">
        <div className="product-stall-image-wrapper">
          <img src={stall.StallImage} alt={stall.StallName} />
        </div>

        <div className="product-stall-content">
          <span className="product-section-eyebrow">Stall details</span>

          <h1>{stall.StallName}</h1>

          <p>{stall.StallDescription}</p>

          <div className="product-stall-pill-row">
            <span>{stall.stallType}</span>
            <span>{stall.StallSchool}</span>
            <span>{stall.stallStatus}</span>
          </div>

          <div className="product-stall-meta-grid">
            <div>
              <span>Location</span>
              <strong>{stall.StallLocation}</strong>
            </div>

            <div>
              <span>Electrical port</span>
              <strong>
                {stall.NeedElectricalPort ? "Needed" : "Not needed"}
              </strong>
            </div>

            <div>
              <span>Owner wallet</span>
              <strong title={stall.StallOwnerWallet}>
                {formatWalletAddress(stall.StallOwnerWallet)}
              </strong>
            </div>

            <div>
              <span>CCN Day status</span>
              <strong>{paymentState.statusLabel}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="product-list-section">
        <div className="product-list-heading">
          <div>
            <span className="product-section-eyebrow">Products</span>
            <h2>Available stall products</h2>
          </div>

          <p>{products.length} products</p>
        </div>

        {products.length === 0 ? (
          <div className="product-empty-state">
            <h3>No products available</h3>
            <p>
              This stall does not have any products listed yet. Please check
              again later.
            </p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => {
              const isSelected =
                selectedProduct?.ProductID === product.ProductID;
              const isUnavailable = product.productStatus !== "Available";
              const isProductSelectionDisabled =
                isUnavailable || !canSelectProduct;

              return (
                <button
                  type="button"
                  className={
                    isSelected
                      ? "product-card selected"
                      : isUnavailable
                        ? "product-card unavailable"
                        : isViewingOwnStall
                          ? "product-card own-stall-view"
                          : !isCCNDayOpen || !isStallOpen
                            ? "product-card payment-closed"
                            : "product-card"
                  }
                  key={product.ProductID}
                  onClick={() => handleSelectProduct(product)}
                  disabled={isProductSelectionDisabled}
                  aria-disabled={isProductSelectionDisabled}
                >
                  <div className="product-image-wrapper">
                    <img src={product.ProductImage} alt={product.ProductName} />

                    <span>{product.productStatus}</span>
                  </div>

                  <div className="product-card-content">
                    <div className="product-price-row">
                      <span>Product</span>
                      <strong>{formatWeiToEth(product.ProductPrice)}</strong>
                    </div>

                    <h3>{product.ProductName}</h3>

                    <p>{product.ProductDescription}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div
        className={
          selectedProduct
            ? "product-payment-dock has-selection"
            : "product-payment-dock"
        }
      >
        {selectedProduct && !isViewingOwnStall && (
          <div className="product-selected-panel">
            <div>
              <span>Selected product</span>
              <strong>{selectedProduct.ProductName}</strong>
            </div>

            <p>{formatWeiToEth(selectedProduct.ProductPrice)}</p>
          </div>
        )}

        <div className="product-payment-bar">
          <div>
            <span>
              {isViewingOwnStall
                ? "You own this stall, so payment is disabled for your wallet."
                : !isStallOpen
                  ? "This stall is not open, so payment is unavailable."
                  : paymentState.message}
            </span>

            {isViewingOwnStall ? (
              <strong>You cannot pay to your own stall.</strong>
            ) : selectedProduct ? (
              <strong>
                Paying for: {selectedProduct.ProductName} ·{" "}
                {formatWeiToEth(selectedProduct.ProductPrice)}
              </strong>
            ) : (
              <strong>Select a product or pay directly to the stall.</strong>
            )}
          </div>

          <button
            type="button"
            onClick={handlePayToStall}
            disabled={!canPayToStall}
          >
            {isViewingOwnStall
              ? "Own stall"
              : canPayToStall
                ? "Pay to stall"
                : "Payment unavailable"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
