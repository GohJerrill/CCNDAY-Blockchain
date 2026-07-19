import { useCallback, useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import CareLinkLoader from "../components/CareLinkLoader";
import "./OrganiserStaffWhitelist.css";

const isValidWalletAddress = (walletAddress) => {
  return /^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim());
};

const getErrorMessage = (error) => {
  const errorName =
    error?.revert?.name ||
    error?.errorName ||
    error?.reason ||
    error?.shortMessage ||
    error?.message ||
    "";

  if (errorName.includes("StaffAlreadyWhitelisted")) {
    return "This staff wallet is already whitelisted.";
  }

  if (errorName.includes("StaffNotWhitelisted")) {
    return "This wallet is not currently whitelisted.";
  }

  if (errorName.includes("OrganiserCannotBeStaff")) {
    return "The organiser wallet cannot be whitelisted as staff.";
  }

  if (errorName.includes("InvalidWallet")) {
    return "Enter a valid staff wallet address.";
  }

  if (errorName.includes("NotOrganiser")) {
    return "Only the organiser wallet can manage the staff whitelist.";
  }

  if (errorName.toLowerCase().includes("user rejected")) {
    return "Transaction was rejected in MetaMask.";
  }

  return "Unable to complete this action. Please try again.";
};

const OrganiserStaffWhitelist = () => {
  const { usersContract } = useWeb3();

  const [staffWallets, setStaffWallets] = useState([]);
  const [walletInput, setWalletInput] = useState("");
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [selectedStaffWallet, setSelectedStaffWallet] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [isLoadingWallets, setIsLoadingWallets] = useState(true);
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);

  const loadStaffWallets = useCallback(async () => {
    if (!usersContract) {
      setStaffWallets([]);
      setPageError("Users contract is not ready yet.");
      setIsLoadingWallets(false);
      return;
    }

    try {
      setIsLoadingWallets(true);
      setPageError("");

      const walletsFromBlockchain = await usersContract.GETALLSTAFFWALLET();

      setStaffWallets([...walletsFromBlockchain]);
    } catch (error) {
      console.error("Load staff whitelist error:", error);
      setPageError(getErrorMessage(error));
    } finally {
      setIsLoadingWallets(false);
    }
  }, [usersContract]);

  useEffect(() => {
    loadStaffWallets();
  }, [loadStaffWallets]);

  const closeModal = () => {
    if (isSubmittingTransaction) {
      return;
    }

    setActiveModal(null);
    setSelectedStaffWallet(null);
    setModalMessage("");
  };

  const showSuccessModal = (message) => {
    setModalMessage(message);
    setActiveModal("success");
  };

  const showErrorModal = (message) => {
    setModalMessage(message);
    setActiveModal("error");
  };

  const handleWalletInputChange = (event) => {
    setWalletInput(event.target.value);
    setFormError("");
  };

  const handleAddStaffWallet = async () => {
    const trimmedWallet = walletInput.trim();

    if (!trimmedWallet) {
      setFormError("Staff wallet address is required.");
      return;
    }

    if (!isValidWalletAddress(trimmedWallet)) {
      setFormError("Enter a valid Ethereum wallet address.");
      return;
    }

    const walletAlreadyExists = staffWallets.some(
      (walletAddress) =>
        walletAddress.toLowerCase() === trimmedWallet.toLowerCase(),
    );

    if (walletAlreadyExists) {
      setFormError("This staff wallet is already whitelisted.");
      return;
    }

    if (!usersContract) {
      showErrorModal("Users contract is not ready yet.");
      return;
    }

    try {
      setIsSubmittingTransaction(true);

      const transaction = await usersContract.addStaffWallet(trimmedWallet);

      await transaction.wait();

      setWalletInput("");
      setFormError("");

      await loadStaffWallets();

      showSuccessModal("Staff wallet has been added to the whitelist.");
    } catch (error) {
      console.error("Add staff wallet error:", error);
      showErrorModal(getErrorMessage(error));
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  const openDeleteModal = (walletAddress) => {
    setSelectedStaffWallet(walletAddress);
    setActiveModal("delete");
  };

  const handleDeleteStaffWallet = async () => {
    if (!selectedStaffWallet) {
      return;
    }

    if (!usersContract) {
      showErrorModal("Users contract is not ready yet.");
      return;
    }

    try {
      setIsSubmittingTransaction(true);

      const transaction =
        await usersContract.RemoveStaffWallet(selectedStaffWallet);

      await transaction.wait();

      await loadStaffWallets();

      showSuccessModal("Staff wallet has been removed from the whitelist.");
    } catch (error) {
      console.error("Remove staff wallet error:", error);
      showErrorModal(getErrorMessage(error));
    } finally {
      setIsSubmittingTransaction(false);
      setSelectedStaffWallet(null);
    }
  };

  return (
    <main className="organiser-staff-page">
      <section className="organiser-staff-hero">
        <div>
          <h1>Staff Whitelist</h1>
          <p>
            Add or remove staff wallet addresses that are allowed to register as
            staff users in CareLink. Staff who are not whitelisted will not be
            able to complete staff registration.
          </p>
        </div>
      </section>

      <section className="organiser-staff-summary-grid">
        <article className="organiser-staff-summary-card">
          <span>Total Whitelisted</span>
          <h2>{staffWallets.length}</h2>
          <p>Staff wallets currently allowed to register.</p>
        </article>
      </section>

      <section className="organiser-staff-panel">
        <div className="organiser-staff-panel-header">
          <div>
            <span>Add Staff Wallet</span>
            <h2>Whitelist a new staff member</h2>
          </div>
        </div>

        <div className="organiser-staff-add-row">
          <input
            type="text"
            value={walletInput}
            onChange={handleWalletInputChange}
            placeholder="Enter staff wallet address, example: 0x..."
          />

          <button
            type="button"
            className="organiser-staff-primary-button"
            onClick={handleAddStaffWallet}
            disabled={isSubmittingTransaction || isLoadingWallets}
          >
            {isSubmittingTransaction ? "Adding..." : "Add Staff"}
          </button>
        </div>

        {formError && (
          <div className="organiser-staff-inline-error">{formError}</div>
        )}
      </section>

      <section className="organiser-staff-panel">
        <div className="organiser-staff-panel-header">
          <div>
            <span>Whitelisted Wallets</span>
            <h2>Staff access list</h2>
          </div>

          <button
            type="button"
            className="organiser-staff-secondary-button"
            onClick={loadStaffWallets}
            disabled={isLoadingWallets || isSubmittingTransaction}
          >
            {isLoadingWallets ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {pageError && (
          <div className="organiser-staff-inline-error">{pageError}</div>
        )}

        <div className="organiser-staff-table-wrapper">
          <table className="organiser-staff-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Wallet Address</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {isLoadingWallets ? (
                <tr>
                  <td colSpan="3" className="organiser-staff-empty-cell">
                    <div className="organiser-staff-table-loader">
                      <CareLinkLoader />
                      <p>Loading staff whitelist...</p>
                    </div>
                  </td>
                </tr>
              ) : staffWallets.length > 0 ? (
                staffWallets.map((walletAddress, index) => (
                  <tr key={walletAddress}>
                    <td>{index + 1}</td>

                    <td className="organiser-staff-wallet-cell">
                      {walletAddress}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="organiser-staff-danger-button"
                        onClick={() => openDeleteModal(walletAddress)}
                        disabled={isSubmittingTransaction}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="organiser-staff-empty-cell">
                    No staff wallets have been whitelisted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {activeModal === "delete" && selectedStaffWallet && (
        <div className="organiser-staff-modal-backdrop">
          <div className="organiser-staff-modal-card">
            <div className="organiser-staff-modal-header">
              <span>Remove Staff Wallet</span>
              <h2>Remove this staff from whitelist?</h2>
              <p>
                This wallet will no longer be allowed to register or continue as
                a staff user after removal.
              </p>
            </div>

            <div className="organiser-staff-warning-box">
              <strong>{selectedStaffWallet}</strong>
              <p>
                Confirming this will trigger a MetaMask transaction to remove
                the staff wallet from the smart contract whitelist.
              </p>
            </div>

            <div className="organiser-staff-modal-actions">
              <button
                type="button"
                className="organiser-staff-secondary-button"
                onClick={closeModal}
                disabled={isSubmittingTransaction}
              >
                Cancel
              </button>
              <button
                type="button"
                className="organiser-staff-danger-button"
                onClick={handleDeleteStaffWallet}
                disabled={isSubmittingTransaction}
              >
                {isSubmittingTransaction ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(activeModal === "success" || activeModal === "error") && (
        <div className="organiser-staff-modal-backdrop">
          <div className="organiser-staff-modal-card">
            <div className="organiser-staff-modal-header">
              <span>{activeModal === "success" ? "Success" : "Error"}</span>
              <h2>
                {activeModal === "success"
                  ? "Transaction Completed"
                  : "Transaction Failed"}
              </h2>
              <p>{modalMessage}</p>
            </div>

            <div className="organiser-staff-modal-actions">
              <button
                type="button"
                className="organiser-staff-primary-button"
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

export default OrganiserStaffWhitelist;
