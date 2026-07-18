import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CareLinkLogo from "../assets/carelink-icon.svg";
import "./PaymentSuccessPage.css";

const formatWeiToEth = (weiValue) => {
  const wei = BigInt(weiValue || "0");
  const ether = 10n ** 18n;
  const whole = wei / ether;
  const fraction = (wei % ether).toString().padStart(18, "0").slice(0, 4);
  const cleanedFraction = fraction.replace(/0+$/, "");

  return `${whole}${cleanedFraction ? `.${cleanedFraction}` : ""} ETH`;
};

const formatWalletAddress = (walletAddress) => {
  if (!walletAddress) return "-";
  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
};

const formatFullDateTime = (isoDateString) => {
  if (!isoDateString) return "-";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(isoDateString));
};

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const receipt = location.state?.receipt || null;

  const receiptText = useMemo(() => {
    if (!receipt) return "";

    return [
      "CareLink Payment Receipt",
      "========================",
      "",
      `Receipt ID: ${receipt.receiptId}`,
      `Payment status: Successful`,
      `Paid at: ${formatFullDateTime(receipt.paidAt)}`,
      "",
      "Stall Details",
      "-------------",
      `Stall ID: ${receipt.stallId}`,
      `Stall name: ${receipt.stallName}`,
      `Stall location: ${receipt.stallLocation}`,
      `Stall owner wallet: ${receipt.stallOwnerWallet}`,
      "",
      "Payment Details",
      "---------------",
      `Selected product: ${receipt.productName || "No product selected"}`,
      `Amount paid: ${receipt.amountWei} wei`,
      `Amount paid: ${formatWeiToEth(receipt.amountWei)}`,
      `Customer wallet: ${receipt.customerWallet}`,
      `Transaction hash: ${receipt.transactionHash}`,
      `Block number: ${receipt.blockNumber || "-"}`,
      "",
      "Thank you for supporting CCN Day through CareLink.",
    ].join("\n");
  }, [receipt]);

  const handleDownloadReceipt = () => {
    if (!receiptText) return;

    const blob = new Blob([receiptText], {
      type: "text/plain;charset=utf-8",
    });

    const receiptUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = receiptUrl;
    downloadLink.download = `${receipt?.receiptId || "CareLink-Receipt"}.txt`;
    downloadLink.click();

    URL.revokeObjectURL(receiptUrl);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleClose = () => {
    navigate("/UserDashboard");
  };

  if (!receipt) {
    return (
      <main className="payment-success-page">
        <section className="payment-success-card missing">
          <div className="payment-success-brand">
            <img src={CareLinkLogo} alt="CareLink" />
          </div>

          <span className="payment-success-eyebrow">Receipt unavailable</span>

          <h1>No payment receipt found.</h1>

          <p>
            This page was opened without payment receipt details. Please return
            to your dashboard and check your transaction history.
          </p>

          <button
            type="button"
            className="payment-success-primary-button"
            onClick={handleClose}
          >
            Back to dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="payment-success-page">
      <section className="payment-success-card" id="paymentReceipt">
        <div className="payment-success-brand">
          <img src={CareLinkLogo} alt="CareLink" />
          <span>CareLink Payment Receipt</span>
        </div>

        <div className="payment-success-icon" aria-hidden="true">
          ✓
        </div>

        <span className="payment-success-eyebrow">Payment successful</span>

        <h1>Your payment has been completed.</h1>

        <p>
          Your transaction has been confirmed on the blockchain. Keep this
          receipt for your own reference.
        </p>

        <div className="payment-success-summary">
          <div>
            <span>Amount paid</span>
            <strong>{formatWeiToEth(receipt.amountWei)}</strong>
          </div>

          <div>
            <span>Amount in wei</span>
            <strong>{receipt.amountWei}</strong>
          </div>
        </div>

        <div className="payment-receipt-section">
          <h2>Receipt details</h2>

          <div className="payment-receipt-grid">
            <div>
              <span>Receipt ID</span>
              <strong>{receipt.receiptId}</strong>
            </div>

            <div>
              <span>Paid at</span>
              <strong>{formatFullDateTime(receipt.paidAt)}</strong>
            </div>

            <div>
              <span>Stall name</span>
              <strong>{receipt.stallName}</strong>
            </div>

            <div>
              <span>Stall ID</span>
              <strong>{receipt.stallId}</strong>
            </div>

            <div>
              <span>Selected product</span>
              <strong>{receipt.productName || "No product selected"}</strong>
            </div>

            <div>
              <span>Stall location</span>
              <strong>{receipt.stallLocation || "-"}</strong>
            </div>

            <div>
              <span>Customer wallet</span>
              <strong title={receipt.customerWallet}>
                {formatWalletAddress(receipt.customerWallet)}
              </strong>
            </div>

            <div>
              <span>Stall owner wallet</span>
              <strong title={receipt.stallOwnerWallet}>
                {formatWalletAddress(receipt.stallOwnerWallet)}
              </strong>
            </div>

            <div className="full">
              <span>Transaction hash</span>
              <strong title={receipt.transactionHash}>
                {receipt.transactionHash}
              </strong>
            </div>

            <div>
              <span>Block number</span>
              <strong>{receipt.blockNumber || "-"}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>Successful</strong>
            </div>
          </div>
        </div>

        <div className="payment-success-actions">
          <button
            type="button"
            className="payment-success-secondary-button"
            onClick={handleDownloadReceipt}
          >
            Download receipt
          </button>

          <button
            type="button"
            className="payment-success-secondary-button"
            onClick={handlePrintReceipt}
          >
            Save / Print
          </button>

          <button
            type="button"
            className="payment-success-primary-button"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </section>
    </main>
  );
};

export default PaymentSuccessPage;
