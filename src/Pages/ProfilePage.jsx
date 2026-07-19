import { useState, useEffect } from "react";
import CareLinkLoader from "../components/CareLinkLoader";
import { useWeb3 } from "../context/Web3Context";
import NoTransactionsUser from "../assets/NoTransactionsUser.svg";
import "./ProfilePage.css";

const userTypeLabels = ["None", "Student", "Staff", "Customer"];

const schoolLabels = [
  "IIT",
  "Business",
  "Engineering",
  "Design",
  "Science",
  "Humanities",
  "Others",
];

const staffUpgradeSchoolOptions = schoolLabels
  .map((school, index) => ({
    label: school,
    value: index,
  }))
  .filter((school) => school.label !== "Others");

const transactionTypeLabels = ["Payment", "Refund", "Withdrawal"];

const getProfileTheme = (profile) => {
  if (!profile) return "student";

  if (profile.IsOrganiser) return "organiser";
  if (profile.IsStallOwner) return "stall-owner";
  if (profile.UserType === "Staff") return "staff";
  if (profile.UserType === "Customer") return "customer";

  return "student";
};

const getDisplayRole = (profile) => {
  if (!profile) return "Student";

  if (profile.IsOrganiser) return "Organiser";
  if (profile.IsStallOwner) return "Stall Owner";

  return profile.UserType;
};

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

const getFriendlyBlockchainErrorMessage = (error, fallbackMessage) => {
  const rawMessage = getBlockchainErrorMessage(error);

  if (
    rawMessage.includes("user rejected") ||
    rawMessage.includes("User rejected") ||
    rawMessage.includes("ACTION_REJECTED") ||
    rawMessage.includes("denied transaction signature")
  ) {
    return "Transaction was cancelled in MetaMask.";
  }

  if (rawMessage.includes("WalletNotRegistered")) {
    return "This wallet is not registered yet.";
  }

  if (rawMessage.includes("EmptyUsername")) {
    return "Username cannot be empty.";
  }

  if (rawMessage.includes("UsernameTooLong")) {
    return "Username is too long.";
  }

  if (rawMessage.includes("NotOrganiser")) {
    return "Only the organiser can perform this action.";
  }

  if (rawMessage.includes("StaffNotWhitelisted")) {
    return "This wallet is not currently whitelisted as staff.";
  }

  if (rawMessage.includes("NotStudentOrCustomer")) {
    return "Only a student or customer profile can be upgraded to staff.";
  }

  if (
    rawMessage.includes("execution reverted") ||
    rawMessage.includes("CALL_EXCEPTION")
  ) {
    return fallbackMessage;
  }

  return rawMessage || fallbackMessage;
};

const mapUserProfileFromContract = (profile, fallbackWalletAddress) => {
  const userTypeValue = toNumber(profile.usertype ?? profile[2]);
  const schoolValue = toNumber(profile.school ?? profile[3]);

  const readableUserType = userTypeLabels[userTypeValue] || "Unknown";
  const readableSchool = schoolLabels[schoolValue] || "Others";

  return {
    WalletAddress: profile.WalletAddress ?? profile[0] ?? fallbackWalletAddress,
    Username: profile.Username ?? profile[1],
    UserType: readableUserType,
    School: readableUserType === "Customer" ? "-" : readableSchool,
    SchoolValue: schoolValue,
    IsRegistered: Boolean(profile.IsRegistered ?? profile[4]),
    RegisteredAt: toNumber(profile.RegisteredAt ?? profile[5]),
    IsOrganiser: false,
    IsStallOwner: false,
    IsStaffWhitelisted: false,
  };
};

const mapWalletTransactionFromContract = (transaction, stallNameById = {}) => {
  const transactionTypeValue = toNumber(
    transaction.transactionType ?? transaction[9],
  );

  const stallId = toNumber(transaction.StallID ?? transaction[2]);
  const signedAmount = (transaction.SignedAmount ?? transaction[7]).toString();

  return {
    PaymentID: toNumber(transaction.PaymentID ?? transaction[0]),
    WithdrawalID: toNumber(transaction.WithdrawalID ?? transaction[1]),
    StallName: stallNameById[stallId] || (stallId ? `Stall #${stallId}` : "-"),
    CustomerWallet: transaction.CustomerWallet ?? transaction[4],
    StallOwnerWallet: transaction.StallOwnerWallet ?? transaction[5],
    Amount: (transaction.Amount ?? transaction[6]).toString(),
    SignedAmount: signedAmount,
    TransactionAt: toNumber(transaction.TransactionAt ?? transaction[8]),
    transactionType:
      transactionTypeLabels[transactionTypeValue] || "Transaction",
    amountType: BigInt(signedAmount) < 0n ? "negative" : "positive",
  };
};

const ProfilePage = () => {
  const {
    walletAddress,
    usersContract,
    stallsContract,
    paymentsContract,
    isConnected,
  } = useWeb3();

  const [userProfile, setUserProfile] = useState(null);
  const [usernameForm, setUsernameForm] = useState("");
  const [transactionHistory, setTransactionHistory] = useState([]);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [isUpgradingToStaff, setIsUpgradingToStaff] = useState(false);
  const [selectedUpgradeSchool, setSelectedUpgradeSchool] = useState("0");

  const [pageError, setPageError] = useState("");
  const [transactionError, setTransactionError] = useState("");

  const [activeModal, setActiveModal] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [modalErrorMessage, setModalErrorMessage] = useState("");

  const refreshProfilePage = async () => {
    if (!isConnected || !walletAddress || !usersContract) {
      setIsLoadingProfile(false);
      setUserProfile(null);
      setTransactionHistory([]);
      setPageError("Please connect your wallet to view your profile.");
      return;
    }

    try {
      setIsLoadingProfile(true);
      setPageError("");
      setTransactionError("");

      const authentication = await usersContract.AuthenticateMyWallet();

      const isOrganiser = Boolean(
        authentication.isOrganiser ?? authentication[3],
      );

      const isStaffWhitelisted = Boolean(
        authentication.isStaffWhitelisted ?? authentication[5],
      );

      if (isOrganiser) {
        const organiserWallet =
          authentication.walletAddress ?? authentication[0] ?? walletAddress;

        const organiserProfile = {
          WalletAddress: organiserWallet,
          Username: "Organiser",
          UserType: "Organiser",
          School: "-",
          SchoolValue: 6,
          IsRegistered: true,
          RegisteredAt: 0,
          IsOrganiser: true,
          IsStallOwner: false,
          IsStaffWhitelisted: false,
        };

        setUserProfile(organiserProfile);
        setUsernameForm(organiserProfile.Username);
      } else {
        const contractProfile = await usersContract.GetMyProfile();
        const mappedProfile = mapUserProfileFromContract(
          contractProfile,
          walletAddress,
        );

        let isApprovedStallOwner = false;

        if (stallsContract) {
          isApprovedStallOwner =
            await stallsContract.IsWalletApprovedStallOwner(walletAddress);
        }

        const finalProfile = {
          ...mappedProfile,
          IsStallOwner: isApprovedStallOwner,
          IsStaffWhitelisted: isStaffWhitelisted,
        };

        setUserProfile(finalProfile);
        setUsernameForm(finalProfile.Username);
      }

      if (!paymentsContract) {
        setTransactionHistory([]);
        setTransactionError(
          "Payment contract is not connected yet. Please refresh and try again.",
        );
        return;
      }

      try {
        setIsLoadingTransactions(true);

        const contractTransactions =
          await paymentsContract.GetMyWalletTransactionHistory();

        let stallNameById = {};

        if (stallsContract && contractTransactions.length > 0) {
          const uniqueStallIds = [
            ...new Set(
              contractTransactions
                .map((transaction) =>
                  toNumber(transaction.StallID ?? transaction[2]),
                )
                .filter((transactionStallId) => transactionStallId > 0),
            ),
          ];

          const stallNameEntries = await Promise.all(
            uniqueStallIds.map(async (transactionStallId) => {
              try {
                const contractStall =
                  await stallsContract.GetStallDetails(transactionStallId);

                const stallName =
                  contractStall.StallName ??
                  contractStall[1] ??
                  `Stall #${transactionStallId}`;

                return [transactionStallId, stallName];
              } catch (error) {
                console.error("Transaction stall name load error:", error);
                return [transactionStallId, `Stall #${transactionStallId}`];
              }
            }),
          );

          stallNameById = Object.fromEntries(stallNameEntries);
        }

        const mappedTransactions = contractTransactions
          .map((transaction) =>
            mapWalletTransactionFromContract(transaction, stallNameById),
          )
          .sort((firstTransaction, secondTransaction) => {
            return (
              secondTransaction.TransactionAt - firstTransaction.TransactionAt
            );
          });

        setTransactionHistory(mappedTransactions);
      } catch (error) {
        console.error("Wallet transaction history load error:", error);
        setTransactionHistory([]);
        setTransactionError(
          "Unable to load wallet transaction history from the blockchain.",
        );
      } finally {
        setIsLoadingTransactions(false);
      }
    } catch (error) {
      console.error("Profile load error:", error);

      setUserProfile(null);
      setTransactionHistory([]);
      setPageError(
        getFriendlyBlockchainErrorMessage(
          error,
          "Unable to load your profile from the blockchain.",
        ),
      );
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    refreshProfilePage();
  }, [
    isConnected,
    walletAddress,
    usersContract,
    stallsContract,
    paymentsContract,
  ]);

  const openEditUsernameModal = () => {
    if (!userProfile || userProfile.IsOrganiser) return;

    setUsernameForm(userProfile.Username);
    setActiveModal("editUsername");
  };

  const closeModal = () => {
    if (isUpdatingUsername || isUpgradingToStaff) return;

    setActiveModal(null);
    setModalMessage("");
    setModalErrorMessage("");
  };

  const showSuccessModal = (message) => {
    setModalMessage(message);
    setModalErrorMessage("");
    setActiveModal("success");
  };

  const showErrorModal = (message, errorMessage) => {
    setModalMessage(message);
    setModalErrorMessage(errorMessage);
    setActiveModal("error");
  };

  const handleUpdateUsername = async (event) => {
    event.preventDefault();

    if (!usersContract || !userProfile) {
      showErrorModal(
        "Unable to update username.",
        "Please reconnect your wallet and try again.",
      );
      return;
    }

    if (userProfile.IsOrganiser) {
      showErrorModal(
        "Unable to update username.",
        "The organiser profile does not use a registered username.",
      );
      return;
    }

    const cleanedUsername = usernameForm.trim();

    if (!cleanedUsername) {
      showErrorModal("Unable to update username.", "Username cannot be empty.");
      return;
    }

    if (cleanedUsername === userProfile.Username) {
      closeModal();
      return;
    }

    try {
      setIsUpdatingUsername(true);

      const tx = await usersContract.UpdateMyUsername(cleanedUsername);
      await tx.wait();

      setUserProfile((currentProfile) => ({
        ...currentProfile,
        Username: cleanedUsername,
      }));

      setUsernameForm(cleanedUsername);

      await refreshProfilePage();

      showSuccessModal("Username has been updated successfully.");
    } catch (error) {
      console.error("Update username error:", error);

      showErrorModal(
        "Unable to update username.",
        getFriendlyBlockchainErrorMessage(
          error,
          "Unable to update username. Please try again.",
        ),
      );
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const openUpgradeToStaffModal = () => {
    if (!userProfile) return;

    const existingSchoolValue =
      userProfile.SchoolValue >= 0 && userProfile.SchoolValue <= 5
        ? String(userProfile.SchoolValue)
        : "0";

    setSelectedUpgradeSchool(existingSchoolValue);
    setActiveModal("upgradeStaff");
  };

  const handleUpgradeToStaff = async (event) => {
    event.preventDefault();

    if (!usersContract || !userProfile) {
      showErrorModal(
        "Unable to activate staff profile.",
        "Please reconnect your wallet and try again.",
      );
      return;
    }

    if (
      userProfile.UserType !== "Customer" ||
      !userProfile.IsStaffWhitelisted
    ) {
      showErrorModal(
        "Unable to activate staff profile.",
        "Your wallet must be a whitelisted customer before it can be upgraded to staff.",
      );
      return;
    }

    try {
      setIsUpgradingToStaff(true);

      const schoolValue = Number(selectedUpgradeSchool);
      const tx = await usersContract.UpgradeMyProfileToStaff(schoolValue);

      await tx.wait();
      await refreshProfilePage();

      showSuccessModal(
        "Your wallet has been upgraded back to Staff successfully.",
      );
    } catch (error) {
      console.error("Upgrade to staff error:", error);

      showErrorModal(
        "Unable to activate staff profile.",
        getFriendlyBlockchainErrorMessage(
          error,
          "Unable to activate staff profile. Please try again.",
        ),
      );
    } finally {
      setIsUpgradingToStaff(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="profile-page">
        <section className="profile-hero-card profile-loader-card">
          <CareLinkLoader
            label="Loading profile..."
            sublabel="Please wait while CareLink loads your blockchain profile."
          />
        </section>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="profile-page">
        <section className="profile-hero-card">
          <div className="profile-avatar">
            <UserIcon />
          </div>

          <div className="profile-identity">
            <span className="profile-username">Profile unavailable</span>
            <h1>{pageError}</h1>

            <div className="profile-pill-row">
              <span>Blockchain error</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="profile-page profile-theme-student">
        <section className="profile-hero-card">
          <div className="profile-avatar">
            <UserIcon />
          </div>

          <div className="profile-identity">
            <span className="profile-username">No profile found</span>
            <h1>Please connect and register your wallet.</h1>
          </div>
        </section>
      </div>
    );
  }

  const profileTheme = getProfileTheme(userProfile);
  const displayRole = getDisplayRole(userProfile);

  const canUpgradeToStaff =
    userProfile.UserType === "Customer" && userProfile.IsStaffWhitelisted;

  return (
    <div className={`profile-page profile-theme-${profileTheme}`}>
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
            <span>{displayRole}</span>
            <span>{userProfile.School}</span>
          </div>
        </div>

        <div className="profile-action-group">
          {!userProfile.IsOrganiser && (
            <button
              type="button"
              className="profile-edit-button"
              onClick={openEditUsernameModal}
            >
              <EditIcon />
              Edit username
            </button>
          )}

          {canUpgradeToStaff && (
            <button
              type="button"
              className="profile-staff-upgrade-button"
              onClick={openUpgradeToStaffModal}
            >
              <UserIcon />
              Activate staff profile
            </button>
          )}
        </div>
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
          <strong>{displayRole}</strong>
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

          <p>
            {isLoadingTransactions
              ? "Loading transactions..."
              : `${transactionHistory.length} transactions`}
          </p>
        </div>

        {isLoadingTransactions ? (
          <div className="profile-table-wrapper">
            <CareLinkLoader
              label="Loading transactions..."
              sublabel="Please wait while CareLink loads your wallet activity."
            />
          </div>
        ) : transactionError ? (
          <div className="profile-table-wrapper">
            <div className="profile-empty-state">
              <h3>Unable to load transactions</h3>
              <p>{transactionError}</p>
            </div>
          </div>
        ) : transactionHistory.length === 0 ? (
          <div className="profile-table-wrapper">
            <div className="profile-empty-state">
              <img
                src={NoTransactionsUser}
                alt=""
                className="profile-empty-state-image"
              />

              <h3>No transactions found</h3>

              <p>
                Your wallet does not have any payment, refund, or withdrawal
                records yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="profile-table-wrapper">
            <table className="profile-transaction-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Payment ID</th>
                  <th>Withdrawal ID</th>
                  <th>Stall</th>
                  <th>Customer</th>
                  <th>Stall owner</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {transactionHistory.map((transaction, index) => (
                  <tr
                    key={`${transaction.transactionType}-${transaction.PaymentID}-${transaction.WithdrawalID}-${transaction.TransactionAt}-${index}`}
                  >
                    <td>
                      <span className="profile-transaction-type">
                        {transaction.transactionType}
                      </span>
                    </td>

                    <td>{transaction.PaymentID || "-"}</td>
                    <td>{transaction.WithdrawalID || "-"}</td>
                    <td>{transaction.StallName || "-"}</td>

                    <td title={transaction.CustomerWallet}>
                      {formatWalletAddress(transaction.CustomerWallet)}
                    </td>

                    <td title={transaction.StallOwnerWallet}>
                      {formatWalletAddress(transaction.StallOwnerWallet)}
                    </td>

                    <td className={transaction.amountType}>
                      {formatWeiToEth(transaction.SignedAmount)}
                    </td>

                    <td>{formatDateTime(transaction.TransactionAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                  disabled={isUpdatingUsername}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="profile-modal-save-button"
                  disabled={isUpdatingUsername}
                >
                  {isUpdatingUsername ? "Saving..." : "Save username"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === "upgradeStaff" && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal-card">
            <div className="profile-modal-heading">
              <span>Staff access</span>
              <h2>Activate staff profile</h2>
              <p>
                Your wallet has been whitelisted by the organiser. Select your
                staff school or department to activate your staff profile again.
              </p>
            </div>

            <form
              onSubmit={handleUpgradeToStaff}
              className="profile-modal-form"
            >
              <label>
                <span>Staff school / department</span>

                <select
                  value={selectedUpgradeSchool}
                  onChange={(event) =>
                    setSelectedUpgradeSchool(event.target.value)
                  }
                  disabled={isUpgradingToStaff}
                >
                  {staffUpgradeSchoolOptions.map((school) => (
                    <option value={school.value} key={school.label}>
                      {school.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="profile-modal-cancel-button"
                  onClick={closeModal}
                  disabled={isUpgradingToStaff}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="profile-modal-save-button"
                  disabled={isUpgradingToStaff}
                >
                  {isUpgradingToStaff ? "Activating..." : "Activate staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(activeModal === "success" || activeModal === "error") && (
        <div className="profile-modal-backdrop">
          <div className="profile-modal-card confirm">
            <div
              className={`profile-modal-heading ${
                activeModal === "success" ? "success" : "error"
              }`}
            >
              <span>{activeModal === "success" ? "Success" : "Error"}</span>

              <h2>{activeModal === "success" ? "Success" : modalMessage}</h2>

              <p>
                {activeModal === "success" ? modalMessage : modalErrorMessage}
              </p>
            </div>

            <div className="profile-modal-actions">
              <button
                type="button"
                className="profile-modal-save-button"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
