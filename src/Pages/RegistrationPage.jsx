import React, { useEffect, useMemo, useRef, useState } from "react";
import "./RegistrationPage.css";
import StaffRegisterIcon from "../assets/StaffRegister.svg";
import StudentRegisterIcon from "../assets/StudentRegister.svg";
import { IoIosArrowDown } from "react-icons/io";

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
  // Mock for now.
  // Later this will come from AuthenticateMyWallet().
  // Change "student" to "staff" to preview staff registration.
  const [registrationType] = useState("staff");

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

  const handleSchoolSelect = (schoolValue) => {
    setSelectedSchool(schoolValue);
    setIsDropdownOpen(false);
    setFormError("");
    setSuccessMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    if (!selectedSchool) {
      setFormError("Please select a school first.");
      return;
    }

    // Safety check. Student dropdown does not show Others, but keep this guard for future blockchain logic.
    if (!isStaffRegistration && selectedSchool === "Others") {
      setFormError("Students must select an appropriate TP school.");
      return;
    }

    setSuccessMessage(
      `Mock registration submitted as ${
        isStaffRegistration ? "Staff" : "Student"
      } under ${selectedSchool}.`,
    );
  };

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
                  ? "Staff accounts can apply for stalls without school eligibility restrictions once registered."
                  : "Student accounts can apply for stalls only if their school is eligible."}
              </p>
            </div>
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

          <button className="registration-submit-button" type="submit">
            {isStaffRegistration ? "Register as Staff" : "Register as Student"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default RegistrationPage;
