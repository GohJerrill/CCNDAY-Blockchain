import { useWeb3 } from "../context/Web3Context";
import "./OrganiserTopbar.css";

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="organiser-topbar-user-icon"
  >
    <path
      d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 20C5.8 16.8 8.45 15 12 15C15.55 15 18.2 16.8 19 20"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const formatWalletAddress = (walletAddress) => {
  if (!walletAddress) {
    return "Not connected";
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
};

const OrganiserTopbar = () => {
  const { walletAddress, isConnected } = useWeb3();

  const formattedWalletAddress = formatWalletAddress(walletAddress);

  return (
    <header className="organiser-topbar">
      <div className="organiser-topbar-heading"></div>

      <div className="organiser-topbar-account">
        <div className="organiser-topbar-avatar">
          <UserIcon />
        </div>

        <div className="organiser-topbar-account-details">
          <span
            className="organiser-topbar-wallet"
            title={walletAddress || "Wallet not connected"}
          >
            {isConnected ? formattedWalletAddress : "Not connected"}
          </span>

          <span className="organiser-topbar-role">Organiser Wallet</span>
        </div>
      </div>
    </header>
  );
};

export default OrganiserTopbar;
