import { useCallback, useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import CareLinkLoader from "../components/CareLinkLoader";
import "./OrganiserCCNDaySetup.css";

const schoolOptions = [
  { label: "IIT", value: 0 },
  { label: "Business", value: 1 },
  { label: "Engineering", value: 2 },
  { label: "Design", value: 3 },
  { label: "Science", value: 4 },
  { label: "Humanities", value: 5 },
];

const emptyCCNDayForm = {
  name: "",
  description: "",
  eventStart: "",
  eventEnd: "",
  registrationStart: "",
  registrationEnd: "",
  eligibleSchools: [],
};

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
};

const formatDateTimeInput = (unixSeconds) => {
  if (!unixSeconds) return "";

  const date = new Date(unixSeconds * 1000);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDisplayDateTime = (dateTimeValue) => {
  if (!dateTimeValue) return "-";

  return new Date(dateTimeValue).toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const convertDateTimeLocalToUnix = (dateTimeValue) => {
  return Math.floor(new Date(dateTimeValue).getTime() / 1000);
};

const mapSchoolValueToLabel = (schoolValue) => {
  const matchedSchool = schoolOptions.find(
    (school) => school.value === toNumber(schoolValue),
  );

  return matchedSchool?.label || "Unknown";
};

const mapSchoolLabelsToValues = (schoolLabels) => {
  return schoolLabels
    .map((schoolLabel) => {
      const matchedSchool = schoolOptions.find(
        (school) => school.label === schoolLabel,
      );

      return matchedSchool?.value;
    })
    .filter((schoolValue) => schoolValue !== undefined);
};

const mapCCNDayFromContract = (ccnDay, eligibleSchools) => {
  const ccnDayId = toNumber(ccnDay.CCNDayID ?? ccnDay[0]);
  const ccnName = ccnDay.CCNName ?? ccnDay[1];
  const ccnDescription = ccnDay.CCNDescription ?? ccnDay[2];
  const startDateTime = toNumber(ccnDay.StartDateTime ?? ccnDay[3]);
  const endDateTime = toNumber(ccnDay.EndDateTime ?? ccnDay[4]);
  const registrationStart = toNumber(
    ccnDay.StallRegistrationStartDateTime ?? ccnDay[5],
  );
  const registrationEnd = toNumber(
    ccnDay.StallRegistrationEndDateTime ?? ccnDay[6],
  );

  return {
    id: ccnDayId,
    name: ccnName,
    description: ccnDescription,
    eventStart: formatDateTimeInput(startDateTime),
    eventEnd: formatDateTimeInput(endDateTime),
    registrationStart: formatDateTimeInput(registrationStart),
    registrationEnd: formatDateTimeInput(registrationEnd),
    eligibleSchools: eligibleSchools.map(mapSchoolValueToLabel),
  };
};

const getErrorMessage = (error) => {
  const rawMessage =
    error?.reason || error?.shortMessage || error?.message || "";

  if (rawMessage.includes("CurrentCCNDayStillActive")) {
    return "There is already an active CCN Day. Please wait until it ends before creating a new one.";
  }

  if (rawMessage.includes("CCNDayEndTimeInPast")) {
    return "CCN Day end time cannot be in the past.";
  }

  if (rawMessage.includes("InvalidCCNDateRange")) {
    return "CCN Day start time must be before CCN Day end time.";
  }

  if (rawMessage.includes("InvalidRegistrationDateRange")) {
    return "Stall registration start time must be before stall registration end time.";
  }

  if (rawMessage.includes("RegistrationEndsAfterCCNStart")) {
    return "Stall registration must end before the CCN Day starts.";
  }

  if (rawMessage.includes("EmptyCCNName")) {
    return "CCN Day name is required.";
  }

  if (rawMessage.includes("EmptyCCNDescription")) {
    return "CCN Day description is required.";
  }

  if (rawMessage.includes("EmptyEligibleSchools")) {
    return "Select at least one eligible school.";
  }

  if (rawMessage.includes("DuplicateEligibleSchools")) {
    return "You selected the same eligible school more than once.";
  }

  if (rawMessage.includes("EligibleSchoolCannotBeOthers")) {
    return "Eligible school cannot be Others.";
  }

  if (rawMessage.includes("CanOnlyEditCurrentCCNDay")) {
    return "Only the current CCN Day can be edited.";
  }

  if (rawMessage.includes("CanOnlyDeleteCurrentCCNDay")) {
    return "Only the current CCN Day can be deleted.";
  }

  if (rawMessage.includes("NotOrganiser")) {
    return "Only the organiser wallet can perform this action.";
  }

  if (rawMessage.includes("user rejected")) {
    return "Transaction was rejected in MetaMask.";
  }

  return rawMessage || "Something went wrong. Please try again.";
};

const isNoCurrentCCNDayError = (error) => {
  const rawMessage =
    error?.reason || error?.shortMessage || error?.message || "";

  return (
    rawMessage.includes("NoCurrentCCNDay") ||
    rawMessage.includes("CurrentCCNDayDeleted")
  );
};

const validateCCNDayForm = (form) => {
  if (!form.name.trim()) {
    return "CCN Day name is required.";
  }

  if (form.name.trim().length > 80) {
    return "CCN Day name must be 80 characters or less.";
  }

  if (!form.description.trim()) {
    return "CCN Day description is required.";
  }

  if (form.description.trim().length > 500) {
    return "CCN Day description must be 500 characters or less.";
  }

  if (!form.eventStart) {
    return "CCN Day start date and time is required.";
  }

  if (!form.eventEnd) {
    return "CCN Day end date and time is required.";
  }

  if (!form.registrationStart) {
    return "Stall registration start date and time is required.";
  }

  if (!form.registrationEnd) {
    return "Stall registration end date and time is required.";
  }

  const eventStart = new Date(form.eventStart).getTime();
  const eventEnd = new Date(form.eventEnd).getTime();
  const registrationStart = new Date(form.registrationStart).getTime();
  const registrationEnd = new Date(form.registrationEnd).getTime();

  if (eventStart >= eventEnd) {
    return "CCN Day start must be before CCN Day end.";
  }

  if (eventEnd <= Date.now()) {
    return "CCN Day end must be in the future.";
  }

  if (registrationStart >= registrationEnd) {
    return "Stall registration start must be before stall registration end.";
  }

  if (registrationEnd > eventStart) {
    return "Stall registration must end before the CCN Day starts.";
  }

  if (form.eligibleSchools.length === 0) {
    return "Select at least one eligible student school.";
  }

  return "";
};

const OrganiserCCNDaySetup = () => {
  const { ccnDayContract } = useWeb3();

  const [activeCCNDay, setActiveCCNDay] = useState(null);
  const [createForm, setCreateForm] = useState(emptyCCNDayForm);
  const [editForm, setEditForm] = useState(emptyCCNDayForm);

  const [createFormError, setCreateFormError] = useState("");
  const [editFormError, setEditFormError] = useState("");
  const [pageError, setPageError] = useState("");

  const [activeModal, setActiveModal] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false);

  const hasActiveCCNDay = Boolean(activeCCNDay);

  const loadCurrentCCNDay = useCallback(async () => {
    if (!ccnDayContract) {
      setActiveCCNDay(null);
      setPageError("CCN Day contract is not ready yet.");
      setIsLoadingPage(false);
      return;
    }

    try {
      setIsLoadingPage(true);
      setPageError("");

      const isCurrentActive = await ccnDayContract.IsCurrentCCNDayActive();

      if (!isCurrentActive) {
        setActiveCCNDay(null);
        setEditForm(emptyCCNDayForm);
        return;
      }

      const currentCCNDay = await ccnDayContract.GetCurrentCCNDay();
      const currentCCNDayId = toNumber(
        currentCCNDay.CCNDayID ?? currentCCNDay[0],
      );

      const eligibleSchools =
        await ccnDayContract.GetCCNDayEligibleSchools(currentCCNDayId);

      const mappedCCNDay = mapCCNDayFromContract(
        currentCCNDay,
        eligibleSchools,
      );

      setActiveCCNDay(mappedCCNDay);
      setEditForm(mappedCCNDay);
    } catch (error) {
      console.error("Load current CCN Day error:", error);

      if (isNoCurrentCCNDayError(error)) {
        setActiveCCNDay(null);
        setEditForm(emptyCCNDayForm);
        return;
      }

      setPageError(getErrorMessage(error));
    } finally {
      setIsLoadingPage(false);
    }
  }, [ccnDayContract]);

  
  useEffect(() => {
    loadCurrentCCNDay();
  }, [loadCurrentCCNDay]);

  const handleCreateInputChange = (event) => {
    const { name, value } = event.target;

    setCreateForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    setCreateFormError("");
  };

  const handleEditInputChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    setEditFormError("");
  };

  const toggleSchool = (setForm, school) => {
    setForm((previousForm) => {
      const alreadySelected = previousForm.eligibleSchools.includes(school);

      return {
        ...previousForm,
        eligibleSchools: alreadySelected
          ? previousForm.eligibleSchools.filter(
              (selectedSchool) => selectedSchool !== school,
            )
          : [...previousForm.eligibleSchools, school],
      };
    });
  };

  const openEditModal = () => {
    setEditForm(activeCCNDay);
    setEditFormError("");
    setActiveModal("edit");
  };

  const openDeleteModal = () => {
    setActiveModal("delete");
  };

  const closeModal = () => {
    if (isSubmittingTransaction) return;

    setActiveModal(null);
    setModalMessage("");
    setEditFormError("");
  };

  const showSuccessModal = (message) => {
    setModalMessage(message);
    setActiveModal("success");
  };

  const showErrorModal = (message) => {
    setModalMessage(message);
    setActiveModal("error");
  };

  const buildCCNDayContractArgs = (form) => {
    return [
      form.name.trim(),
      form.description.trim(),
      convertDateTimeLocalToUnix(form.eventStart),
      convertDateTimeLocalToUnix(form.eventEnd),
      convertDateTimeLocalToUnix(form.registrationStart),
      convertDateTimeLocalToUnix(form.registrationEnd),
      mapSchoolLabelsToValues(form.eligibleSchools),
    ];
  };

  const handleCreateCCNDay = async () => {
    const validationMessage = validateCCNDayForm(createForm);

    if (validationMessage) {
      setCreateFormError(validationMessage);
      return;
    }

    if (!ccnDayContract) {
      showErrorModal("CCN Day contract is not ready yet.");
      return;
    }

    try {
      setIsSubmittingTransaction(true);

      const transaction = await ccnDayContract.CreateNewCCNDay(
        ...buildCCNDayContractArgs(createForm),
      );

      await transaction.wait();

      setCreateForm(emptyCCNDayForm);
      setCreateFormError("");

      await loadCurrentCCNDay();

      showSuccessModal("CCN Day has been created successfully.");
    } catch (error) {
      console.error("Create CCN Day error:", error);
      showErrorModal(getErrorMessage(error));
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  const handleEditCCNDay = async () => {
    const validationMessage = validateCCNDayForm(editForm);

    if (validationMessage) {
      setEditFormError(validationMessage);
      return;
    }

    if (!ccnDayContract) {
      showErrorModal("CCN Day contract is not ready yet.");
      return;
    }

    if (!activeCCNDay?.id) {
      showErrorModal("No active CCN Day was found to edit.");
      return;
    }

    try {
      setIsSubmittingTransaction(true);

      const transaction = await ccnDayContract.EditCCNDay(
        activeCCNDay.id,
        ...buildCCNDayContractArgs(editForm),
      );

      await transaction.wait();

      setEditFormError("");

      await loadCurrentCCNDay();

      showSuccessModal("CCN Day has been updated successfully.");
    } catch (error) {
      console.error("Edit CCN Day error:", error);
      showErrorModal(getErrorMessage(error));
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  const handleDeleteCCNDay = async () => {
    if (!ccnDayContract) {
      showErrorModal("CCN Day contract is not ready yet.");
      return;
    }

    if (!activeCCNDay?.id) {
      showErrorModal("No active CCN Day was found to delete.");
      return;
    }

    try {
      setIsSubmittingTransaction(true);

      const transaction = await ccnDayContract.DeleteCCNDay(activeCCNDay.id);

      await transaction.wait();

      setActiveCCNDay(null);
      setEditForm(emptyCCNDayForm);
      setCreateForm(emptyCCNDayForm);

      showSuccessModal("CCN Day has been deleted successfully.");
    } catch (error) {
      console.error("Delete CCN Day error:", error);
      showErrorModal(getErrorMessage(error));
    } finally {
      setIsSubmittingTransaction(false);
    }
  };

  const renderFormFields = (form, handleInputChange, setForm, errorMessage) => (
    <>
      <div className="organiser-ccn-form-grid">
        <label className="organiser-ccn-field organiser-ccn-full-field">
          <span>CCN Day Name</span>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleInputChange}
            placeholder="Example: CCN Day 2026"
          />
        </label>

        <label className="organiser-ccn-field organiser-ccn-full-field">
          <span>CCN Day Description</span>
          <textarea
            name="description"
            value={form.description}
            onChange={handleInputChange}
            placeholder="Describe the CCN Day event..."
          />
        </label>

        <label className="organiser-ccn-field">
          <span>CCN Day Start</span>
          <input
            type="datetime-local"
            name="eventStart"
            value={form.eventStart}
            onChange={handleInputChange}
          />
        </label>

        <label className="organiser-ccn-field">
          <span>CCN Day End</span>
          <input
            type="datetime-local"
            name="eventEnd"
            value={form.eventEnd}
            onChange={handleInputChange}
          />
        </label>

        <label className="organiser-ccn-field">
          <span>Stall Registration Start</span>
          <input
            type="datetime-local"
            name="registrationStart"
            value={form.registrationStart}
            onChange={handleInputChange}
          />
        </label>

        <label className="organiser-ccn-field">
          <span>Stall Registration End</span>
          <input
            type="datetime-local"
            name="registrationEnd"
            value={form.registrationEnd}
            onChange={handleInputChange}
          />
        </label>
      </div>

      <div className="organiser-ccn-school-section">
        <span>Eligible Student Schools</span>

        <div className="organiser-ccn-school-grid">
          {schoolOptions.map((school) => {
            const isSelected = form.eligibleSchools.includes(school.label);

            return (
              <button
                type="button"
                key={school.label}
                className={
                  isSelected
                    ? "organiser-ccn-school-chip selected"
                    : "organiser-ccn-school-chip"
                }
                onClick={() => {
                  toggleSchool(setForm, school.label);
                  setCreateFormError("");
                  setEditFormError("");
                }}
              >
                {school.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <div className="organiser-ccn-inline-error">{errorMessage}</div>
      )}
    </>
  );

  return (
    <main className="organiser-ccn-page">
      <section className="organiser-ccn-hero">
        <h1>CCN Day Setup</h1>
        <p>Create and manage the current CCN Day.</p>
      </section>

      {isLoadingPage ? (
        <section className="organiser-ccn-panel organiser-ccn-loader-panel">
          <CareLinkLoader />
          <p>Checking current CCN Day...</p>
        </section>
      ) : pageError ? (
        <section className="organiser-ccn-panel organiser-ccn-create-panel">
          <div className="organiser-ccn-panel-header">
            <div>
              <span>Error</span>
              <h2>Unable to load CCN Day</h2>
            </div>
          </div>

          <p className="organiser-ccn-create-intro">{pageError}</p>

          <div className="organiser-ccn-action-row">
            <button
              type="button"
              className="organiser-ccn-primary-button"
              onClick={loadCurrentCCNDay}
            >
              Try Again
            </button>
          </div>
        </section>
      ) : hasActiveCCNDay ? (
        <section className="organiser-ccn-active-card">
          <div className="organiser-ccn-active-top">
            <div>
              <span>Active CCN Day</span>
              <h2>{activeCCNDay.name}</h2>
              <p>{activeCCNDay.description}</p>
            </div>

            <div className="organiser-ccn-active-actions">
              <button
                type="button"
                className="organiser-ccn-primary-button"
                onClick={openEditModal}
              >
                Edit CCN Day
              </button>

              <button
                type="button"
                className="organiser-ccn-danger-button"
                onClick={openDeleteModal}
              >
                Delete CCN Day
              </button>
            </div>
          </div>

          <div className="organiser-ccn-info-grid">
            <div className="organiser-ccn-info-card">
              <span>CCN Starts</span>
              <strong>{formatDisplayDateTime(activeCCNDay.eventStart)}</strong>
            </div>

            <div className="organiser-ccn-info-card">
              <span>CCN Ends</span>
              <strong>{formatDisplayDateTime(activeCCNDay.eventEnd)}</strong>
            </div>

            <div className="organiser-ccn-info-card">
              <span>Registration Opens</span>
              <strong>
                {formatDisplayDateTime(activeCCNDay.registrationStart)}
              </strong>
            </div>

            <div className="organiser-ccn-info-card">
              <span>Registration Closes</span>
              <strong>
                {formatDisplayDateTime(activeCCNDay.registrationEnd)}
              </strong>
            </div>
          </div>

          <div className="organiser-ccn-school-display-card">
            <span>Eligible Student Schools</span>

            <div className="organiser-ccn-school-display-list">
              {activeCCNDay.eligibleSchools.map((school) => (
                <strong key={school}>{school}</strong>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="organiser-ccn-panel organiser-ccn-create-panel">
          <div className="organiser-ccn-panel-header">
            <div>
              <h2>Create New CCN Day</h2>
            </div>
          </div>

          <p className="organiser-ccn-create-intro">
            There is currently no active CCN Day. Create a new event before
            users can register stalls.
          </p>

          {renderFormFields(
            createForm,
            handleCreateInputChange,
            setCreateForm,
            createFormError,
          )}

          <div className="organiser-ccn-action-row">
            <button
              type="button"
              className="organiser-ccn-primary-button"
              onClick={handleCreateCCNDay}
              disabled={isSubmittingTransaction}
            >
              {isSubmittingTransaction ? "Creating..." : "Create CCN Day"}
            </button>
          </div>
        </section>
      )}

      {activeModal === "edit" && (
        <div className="organiser-ccn-modal-backdrop">
          <div className="organiser-ccn-modal-card large">
            <div className="organiser-ccn-modal-header">
              <div>
                <span>Edit Event</span>
                <h2>Edit CCN Day</h2>
                <p>
                  Update the current CCN Day details. Saving this will trigger a
                  MetaMask transaction.
                </p>
              </div>

              <button
                type="button"
                className="organiser-ccn-modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            {renderFormFields(
              editForm,
              handleEditInputChange,
              setEditForm,
              editFormError,
            )}

            <div className="organiser-ccn-action-row">
              <button
                type="button"
                className="organiser-ccn-primary-button"
                onClick={handleEditCCNDay}
                disabled={isSubmittingTransaction}
              >
                {isSubmittingTransaction ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "delete" && (
        <div className="organiser-ccn-modal-backdrop">
          <div className="organiser-ccn-modal-card">
            <div className="organiser-ccn-modal-header">
              <div>
                <span>Delete Event</span>
                <h2>Delete this CCN Day?</h2>
                <p>
                  All stalls created under this CCN Day will be deleted as well.
                  This action should only be done when you are sure.
                </p>
              </div>
            </div>

            <div className="organiser-ccn-warning-box">
              Deleting the CCN Day may also remove linked stall records through
              the smart contract.
            </div>

            <div className="organiser-ccn-action-row">
              <button
                type="button"
                className="organiser-ccn-secondary-button"
                onClick={closeModal}
                disabled={isSubmittingTransaction}
              >
                Cancel
              </button>
              <button
                type="button"
                className="organiser-ccn-danger-button"
                onClick={handleDeleteCCNDay}
                disabled={isSubmittingTransaction}
              >
                {isSubmittingTransaction ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(activeModal === "success" || activeModal === "error") && (
        <div className="organiser-ccn-modal-backdrop">
          <div className="organiser-ccn-modal-card">
            <div className="organiser-ccn-modal-header">
              <div>
                <span>{activeModal === "success" ? "Success" : "Error"}</span>
                <h2>
                  {activeModal === "success"
                    ? "Transaction Completed"
                    : "Transaction Failed"}
                </h2>
                <p>{modalMessage}</p>
              </div>
            </div>

            <div className="organiser-ccn-action-row">
              <button
                type="button"
                className="organiser-ccn-primary-button"
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

export default OrganiserCCNDaySetup;
