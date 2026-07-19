import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RegistrationPage.css";
import StaffRegisterIcon from "../assets/StaffRegister.svg";
import StudentRegisterIcon from "../assets/StudentRegister.svg";
import { IoIosArrowDown } from "react-icons/io";
import { useWeb3 } from "../context/Web3Context";

const SCHOOL_ENUM_VALUES = {
  IIT: 0,
  Business: 1,
  Engineering: 2,
  Design: 3,
  Science: 4,
  Humanities: 5,
  Others: 6,
};

const studentSchools = [
  { label: "School of Informatics & IT", value: "IIT" },
  { label: "School of Business", value: "Business" },
  { label: "School of Engineering", value: "Engineering" },
  { label: "School of Design", value: "Design" },
  { label: "School of Applied Science", value: "Science" },
  { label: "School of Humanities & Social Sciences", value: "Humanities" },
];

const staffSchools = [...studentSchools, { label: "Others", value: "Others" }];

const RegistrationPage = () => {
  const navigate = useNavigate();

  const {
    walletAddress,
    isConnected,
    usersContract,
    connectWallet,
    isConnecting,
  } = useWeb3();

  const [registrationType, setRegistrationType] = useState("student");
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [username, setUsername] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const dropdownRef = useRef(null);

  const isStaffRegistration = registrationType === "staff";

  const schoolOptions = useMemo(() => {
    return isStaffRegistration ? staffSchools : studentSchools;
  }, [isStaffRegistration]);

  const selectedSchoolLabel = useMemo(() => {
    return (
      schoolOptions.find((school) => school.value === selectedSchool)?.label ||
      "Select an option"
    );
  }, [schoolOptions, selectedSchool]);

  const registerIcon = isStaffRegistration
    ? StaffRegisterIcon
    : StudentRegisterIcon;

  useEffect(() => {
    const checkWalletRegistrationType = async () => {
      if (!isConnected || !walletAddress || !usersContract) {
        setIsCheckingWallet(false);
        return;
      }

      try {
        setIsCheckingWallet(true);
        setFormError("");

        const authProfile = await usersContract.AuthenticateMyWallet();

        const isOrganiser = Boolean(authProfile.isOrganiser ?? authProfile[3]);
        const isRegisteredUser = Boolean(
          authProfile.isRegisteredUser ?? authProfile[4],
        );
        const isStaffWhitelisted = Boolean(
          authProfile.isStaffWhitelisted ?? authProfile[5],
        );

        if (isOrganiser) {
          navigate("/Organiser/CCNDaySetup", { replace: true });
          return;
        }

        if (isRegisteredUser) {
          navigate("/UserDashboard", { replace: true });
          return;
        }

        setRegistrationType(isStaffWhitelisted ? "staff" : "student");
      } catch (error) {
        console.error("Registration wallet check error:", error);
        setFormError(
          "Unable to check your wallet registration status. Please try again.",
        );
      } finally {
        setIsCheckingWallet(false);
      }
    };

    checkWalletRegistrationType();
  }, [isConnected, walletAddress, usersContract, navigate]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const resetMessages = () => {
    setFormError("");
    setSuccessMessage("");
  };

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
    resetMessages();
  };

  const handleSchoolSelect = (schoolValue) => {
    setSelectedSchool(schoolValue);
    setIsDropdownOpen(false);
    resetMessages();
  };

  const handleConnectWallet = async () => {
    const result = await connectWallet();

    if (!result.connected) {
      setFormError("Please connect your MetaMask wallet before registering.");
    }
  };

  const getReadableError = (error) => {
    return (
      error?.reason ||
      error?.shortMessage ||
      error?.message ||
      "Registration failed. Please try again."
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    if (!isConnected || !walletAddress || !usersContract) {
      setFormError("Please connect your MetaMask wallet before registering.");
      return;
    }

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setFormError("Please enter a username first.");
      return;
    }

    if (trimmedUsername.length > 32) {
      setFormError("Username must be 32 characters or less.");
      return;
    }

    if (!selectedSchool) {
      setFormError("Please select a school first.");
      return;
    }

    if (!isStaffRegistration && selectedSchool === "Others") {
      setFormError("Students must select an appropriate TP school.");
      return;
    }

    const selectedSchoolEnumValue = SCHOOL_ENUM_VALUES[selectedSchool];

    if (selectedSchoolEnumValue === undefined) {
      setFormError("Invalid school selected.");
      return;
    }

    try {
      setIsSubmitting(true);

      const tx = isStaffRegistration
        ? await usersContract.RegisterAsStaff(
            trimmedUsername,
            selectedSchoolEnumValue,
          )
        : await usersContract.RegisterAsStudent(
            trimmedUsername,
            selectedSchoolEnumValue,
          );

      setSuccessMessage(
        "Registration transaction sent. Waiting for confirmation...",
      );

      await tx.wait();

      setSuccessMessage("Registration successful. Redirecting to dashboard...");

      navigate("/UserDashboard");
    } catch (error) {
      console.error("Registration error:", error);
      setFormError(getReadableError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingWallet) {
    return (
      <main className="registration-page">
        <section className="registration-container">
          <div className="registration-card">
            <div className="registration-header">
              <p className="registration-tag">CareLink Registration</p>
            </div>

            <div className="registration-role-content">
              <h2>Checking wallet...</h2>
              <p>Please wait while CareLink checks your wallet status.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="registration-page">
      <section className="registration-container">
        <form className="registration-card" onSubmit={handleSubmit}>
          <div className="registration-header">
            <p className="registration-tag">CareLink Registration</p>
          </div>

          <div className="registration-role-preview">
            <div className="registration-icon-wrapper">
              <img
                src={registerIcon}
                alt={
                  isStaffRegistration
                    ? "Staff registration icon"
                    : "Student registration icon"
                }
              />
            </div>

            <div className="registration-role-content">
              <h2>
                {isStaffRegistration
                  ? "Staff Registration"
                  : "Student Registration"}
              </h2>

              <p>
                {isStaffRegistration
                  ? "Your wallet is whitelisted by the organiser, so you can register as staff."
                  : "Student accounts can apply for stalls only if their school is eligible."}
              </p>
            </div>
          </div>

          {!isConnected && (
            <div className="staff-warning-pill">
              Please connect your MetaMask wallet before registering.
            </div>
          )}

          <div className="registration-field">
            <label htmlFor="username">Username</label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Enter your display username"
              maxLength={32}
              disabled={!isConnected || isSubmitting}
            />
          </div>

          <div className="registration-field">
            <label>
              {isStaffRegistration ? "School / Department" : "TP School"}
            </label>

            <div className="registration-custom-select" ref={dropdownRef}>
              <button
                type="button"
                className={`registration-select-button ${
                  selectedSchool ? "has-value" : ""
                }`}
                onClick={() => setIsDropdownOpen((current) => !current)}
                aria-expanded={isDropdownOpen}
                disabled={!isConnected || isSubmitting}
              >
                <span>{selectedSchoolLabel}</span>

                <IoIosArrowDown
                  className={`registration-select-icon ${
                    isDropdownOpen ? "open" : ""
                  }`}
                />
              </button>

              <div
                className={`registration-options ${
                  isDropdownOpen ? "open" : ""
                }`}
              >
                {schoolOptions.map((school) => (
                  <button
                    key={school.value}
                    type="button"
                    className={`registration-option ${
                      selectedSchool === school.value ? "selected" : ""
                    }`}
                    onClick={() => handleSchoolSelect(school.value)}
                    disabled={isSubmitting}
                  >
                    {school.label}
                  </button>
                ))}
              </div>
            </div>

            {formError && (
              <p className="registration-error-text">{formError}</p>
            )}

            {successMessage && (
              <p className="registration-success-text">{successMessage}</p>
            )}
          </div>

          {!isStaffRegistration && (
            <div className="staff-warning-pill">
              TP staff? Please contact the organiser to whitelist your wallet
              before registering.
            </div>
          )}

          {isStaffRegistration && (
            <div className="staff-warning-pill">
              Your wallet has been whitelisted for staff registration.
            </div>
          )}

          {!isConnected ? (
            <button
              className="registration-submit-button"
              type="button"
              onClick={handleConnectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          ) : (
            <button
              className="registration-submit-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Registering..."
                : isStaffRegistration
                  ? "Register as Staff"
                  : "Register as Student"}
            </button>
          )}
        </form>
      </section>
    </main>
  );
};

export default RegistrationPage;
