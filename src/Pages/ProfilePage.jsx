import React, { useState } from "react";
import "./ProfilePage.css";

const mockUserProfile = {
  Username: "William",
  WalletAddress: "0x71C4A9E23981CB88217391A20F18F4A9833293A2",
  UserType: "Student",
  School: "IIT",
  RegisteredAt: 1720454400,
};

const mockTransactionHistory = [
  {
    PaymentID: 1,
    WithdrawalID: 0,
    StallID: 1,
    CCNDayID: 1,
    CustomerWallet: "0x71C4A9E23981CB88217391A20F18F4A9833293A2",
    StallOwnerWallet: "0x3B1646AD20F85AA32197203D044A96C682572C10",
    Amount: "100000000000000000",
    SignedAmount: "-100000000000000000",
    TransactionAt: 1783942320,
    transactionType: "PaidTransaction",
  },
  {
    PaymentID: 1,
    WithdrawalID: 0,
    StallID: 1,
    CCNDayID: 1,
    CustomerWallet: "0x71C4A9E23981CB88217391A20F18F4A9833293A2",
    StallOwnerWallet: "0x3B1646AD20F85AA32197203D044A96C682572C10",
    Amount: "100000000000000000",
    SignedAmount: "100000000000000000",
    TransactionAt: 1783942450,
    transactionType: "RefundedTransaction",
  },
  {
    PaymentID: 2,
    WithdrawalID: 1,
    StallID: 1,
    CCNDayID: 1,
    CustomerWallet: "0x8A22C0F892392E4FCE9211AAB93218F1529A1BC0",
    StallOwnerWallet: "0x71C4A9E23981CB88217391A20F18F4A9833293A2",
    Amount: "250000000000000000",
    SignedAmount: "-250000000000000000",
    TransactionAt: 1783942700,
    transactionType: "WithdrawalTransaction",
  },
];

const UserIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21c.7-4.1 3.2-6.2 7.5-6.2s6.8 2.1 7.5 6.2" />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const formatWalletAddress = (walletAddress) => {
  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
};

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

const formatWeiToEth = (weiValue) => {
  const isNegative = weiValue.toString().startsWith("-");
  const cleanValue = isNegative ? weiValue.toString().slice(1) : weiValue;

  const wei = BigInt(cleanValue);
  const ether = 10n ** 18n;
  const whole = wei / ether;
  const fraction = (wei % ether).toString().padStart(18, "0").slice(0, 4);
  const cleanedFraction = fraction.replace(/0+$/, "");

  return `${isNegative ? "-" : "+"}${whole}${
    cleanedFraction ? `.${cleanedFraction}` : ""
  } ETH`;
};

const ProfilePage = () => {
  const [userProfile, setUserProfile] = useState(mockUserProfile);
  const [usernameForm, setUsernameForm] = useState(mockUserProfile.Username);
  const [activeModal, setActiveModal] = useState(null);

  const openEditUsernameModal = () => {
    setUsernameForm(userProfile.Username);
    setActiveModal("editUsername");
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleUpdateUsername = (event) => {
    event.preventDefault();

    setUserProfile((currentProfile) => ({
      ...currentProfile,
      Username: usernameForm,
    }));

    setActiveModal("success");
  };

  return (
    <div className="profile-page">
      <section className="profile-hero-card">
        <div className="profile-avatar">
          <UserIcon />
        </div>

        <div className="profile-identity">
          <span className="profile-username">{userProfile.Username}</span>

          <h1 title={userProfile.WalletAddress}>
            {formatWalletAddress(userProfile.WalletAddress)}
          </h1>

          <div className="profile-pill-row">
            <span>{userProfile.UserType}</span>
            <span>{userProfile.School}</span>
          </div>
        </div>

        <button
          type="button"
          className="profile-edit-button"
          onClick={openEditUsernameModal}
        >
          <EditIcon />
          Edit username
        </button>
      </section>

      <section className="profile-info-grid">
        <div className="profile-info-card">
          <span>Wallet address</span>
          <strong title={userProfile.WalletAddress}>
            {userProfile.WalletAddress}
          </strong>
        </div>

        <div className="profile-info-card">
          <span>Role</span>
          <strong>{userProfile.UserType}</strong>
        </div>

        <div className="profile-info-card">
          <span>School</span>
          <strong>{userProfile.School}</strong>
        </div>

        <div className="profile-info-card">
          <span>Registered at</span>
          <strong>{formatDateTime(userProfile.RegisteredAt)}</strong>
        </div>
      </section>

      <section className="profile-transaction-section">
        <div className="profile-section-heading">
          <div>
            <span>Transaction history</span>
            <h2>Wallet activity</h2>
          </div>

          <p>{mockTransactionHistory.length} transactions</p>
        </div>

        <div className="profile-table-wrapper">
          <table className="profile-transaction-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Payment ID</th>
                <th>Withdrawal ID</th>
                <th>Stall ID</th>
                <th>CCN Day</th>
                <th>Customer</th>
                <th>Stall owner</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {mockTransactionHistory.map((transaction, index) => (
                <tr key={`${transaction.transactionType}-${index}`}>
                  <td>
                    <span className="profile-transaction-type">
                      {transaction.transactionType}
                    </span>
                  </td>

                  <td>{transaction.PaymentID || "-"}</td>
                  <td>{transaction.WithdrawalID || "-"}</td>
                  <td>{transaction.StallID}</td>
                  <td>{transaction.CCNDayID}</td>

                  <td title={transaction.CustomerWallet}>
                    {formatWalletAddress(transaction.CustomerWallet)}
                  </td>

                  <td title={transaction.StallOwnerWallet}>
                    {formatWalletAddress(transaction.StallOwnerWallet)}
                  </td>

                  <td
                    className={
                      transaction.SignedAmount.startsWith("-")
                        ? "negative"
                        : "positive"
                    }
                  >
                    {formatWeiToEth(transaction.SignedAmount)}
                  </td>

                  <td>{formatDateTime(transaction.TransactionAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {activeModal === "editUsername" && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal-card">
            <div className="profile-modal-heading">
              <span>Edit profile</span>
              <h2>Change username</h2>
              <p>
                Your username is your display name in CareLink. Your wallet,
                role, and school cannot be changed here.
              </p>
            </div>

            <form
              onSubmit={handleUpdateUsername}
              className="profile-modal-form"
            >
              <label>
                <span>Username</span>
                <input
                  type="text"
                  value={usernameForm}
                  onChange={(event) => setUsernameForm(event.target.value)}
                  placeholder="Enter your username"
                  required
                />
              </label>

              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="profile-modal-cancel-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button type="submit" className="profile-modal-save-button">
                  Save username
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "success" && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal-card confirm">
            <div className="profile-modal-heading success">
              <span>Success</span>
              <h2>Username has been updated.</h2>
              <p>Your profile display name has been changed successfully.</p>
            </div>

            <div className="profile-modal-actions">
              <button
                type="button"
                className="profile-modal-save-button"
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

export default ProfilePage;
