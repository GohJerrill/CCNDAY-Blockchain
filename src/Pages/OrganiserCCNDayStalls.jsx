import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import CareLinkLoader from "../components/CareLinkLoader";
import EmptyStallImage from "../assets/EmptyStall.svg";
import "./OrganiserCCNDayStalls.css";

const STALL_STATUS = {
  Pending: 0,
  Open: 1,
  Closed: 2,
  Rejected: 3,
};

const STALL_TYPE_LABELS = {
  0: "Food & Beverages",
  1: "Games",
  2: "Gifts",
  3: "Pre-owned/Recycling",
  4: "Services",
  5: "Performance/Busking",
  6: "Others",
};

const SCHOOL_LABELS = {
  0: "IIT",
  1: "Business",
  2: "Engineering",
  3: "Design",
  4: "Science",
  5: "Humanities",
  6: "Others",
};

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
};

const formatWalletAddress = (walletAddress) => {
  if (!walletAddress) return "-";
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
};

const formatDisplayDateTimeFromUnix = (unixSeconds) => {
  const timestamp = toNumber(unixSeconds);

  if (!timestamp) return "-";

  return new Date(timestamp * 1000).toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getStallStatusLabel = (stallStatus) => {
  const statusValue = toNumber(stallStatus);

  if (statusValue === STALL_STATUS.Pending) return "Pending";
  if (statusValue === STALL_STATUS.Open) return "Approved / Open";
  if (statusValue === STALL_STATUS.Closed) return "Approved / Closed";
  if (statusValue === STALL_STATUS.Rejected) return "Rejected";

  return "Unknown";
};

const getStallStatusClass = (stallStatus) => {
  const statusValue = toNumber(stallStatus);

  if (statusValue === STALL_STATUS.Pending) return "pending";
  if (statusValue === STALL_STATUS.Rejected) return "rejected";

  return "approved";
};

const getErrorMessage = (error) => {
  const rawMessage =
    error?.reason || error?.shortMessage || error?.message || "";

  if (rawMessage.includes("CCNDayDoesNotExist")) {
    return "This CCN Day record could not be found.";
  }

  if (rawMessage.includes("InvalidCCNDayID")) {
    return "Invalid CCN Day selected.";
  }

  if (rawMessage.includes("GetCCNDayStalls")) {
    return "GetCCNDayStalls is not available yet. Please redeploy the updated Stalls contract and update the ABI.";
  }

  return rawMessage || "Unable to load stalls for this CCN Day.";
};

const mapCCNDayFromContract = (ccnDay) => {
  return {
    id: toNumber(ccnDay.CCNDayID ?? ccnDay[0]),
    name: ccnDay.CCNName ?? ccnDay[1],
    description: ccnDay.CCNDescription ?? ccnDay[2],
    eventStart: formatDisplayDateTimeFromUnix(
      ccnDay.StartDateTime ?? ccnDay[3],
    ),
    eventEnd: formatDisplayDateTimeFromUnix(ccnDay.EndDateTime ?? ccnDay[4]),
    registrationStart: formatDisplayDateTimeFromUnix(
      ccnDay.StallRegistrationStartDateTime ?? ccnDay[5],
    ),
    registrationEnd: formatDisplayDateTimeFromUnix(
      ccnDay.StallRegistrationEndDateTime ?? ccnDay[6],
    ),
  };
};

const mapStallFromContract = (stall) => {
  const stallId = toNumber(stall.StallID ?? stall[0]);
  const stallName = stall.StallName ?? stall[1];
  const stallDescription = stall.StallDescription ?? stall[2];
  const stallImage = stall.StallImage ?? stall[3];
  const stallType = toNumber(stall.stallType ?? stall[4]);
  const stallOwnerWallet = stall.StallOwnerWallet ?? stall[5];
  const stallLocation = stall.StallLocation ?? stall[6];
  const stallSchool = toNumber(stall.StallSchool ?? stall[7]);
  const needElectricalPort = Boolean(stall.NeedElectricalPort ?? stall[8]);
  const createdAt = toNumber(stall.CreatedAt ?? stall[9]);
  const stallStatus = toNumber(stall.stallStatus ?? stall[10]);
  const allowedWithdrawal = Boolean(stall.AllowedWithdrawal ?? stall[11]);
  const ccnDayId = toNumber(stall.CCNDayID ?? stall[12]);
  const withdrawalCompleted = Boolean(stall.WithdrawalCompleted ?? stall[13]);

  return {
    id: stallId,
    name: stallName,
    description: stallDescription,
    image: stallImage,
    type: STALL_TYPE_LABELS[stallType] || "Unknown",
    ownerWallet: stallOwnerWallet,
    location: stallLocation || "-",
    school: SCHOOL_LABELS[stallSchool] || "Unknown",
    needElectricalPort,
    createdAt: formatDisplayDateTimeFromUnix(createdAt),
    status: stallStatus,
    statusLabel: getStallStatusLabel(stallStatus),
    allowedWithdrawal,
    ccnDayId,
    withdrawalCompleted,
  };
};

const OrganiserCCNDayStalls = () => {
  const navigate = useNavigate();
  const { ccnDayId } = useParams();
  const { ccnDayContract, stallsContract } = useWeb3();

  const [selectedTab, setSelectedTab] = useState("approved");
  const [ccnDay, setCcnDay] = useState(null);
  const [stalls, setStalls] = useState([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [pageError, setPageError] = useState("");

  const selectedCCNDayId = toNumber(ccnDayId);

  const approvedStalls = useMemo(() => {
    return stalls.filter(
      (stall) =>
        stall.status === STALL_STATUS.Open ||
        stall.status === STALL_STATUS.Closed,
    );
  }, [stalls]);

  const pendingStalls = useMemo(() => {
    return stalls.filter((stall) => stall.status === STALL_STATUS.Pending);
  }, [stalls]);

  const rejectedStalls = useMemo(() => {
    return stalls.filter((stall) => stall.status === STALL_STATUS.Rejected);
  }, [stalls]);

  const activeTabStalls = useMemo(() => {
    if (selectedTab === "approved") {
      return approvedStalls;
    }

    if (selectedTab === "pending") {
      return pendingStalls;
    }

    return rejectedStalls;
  }, [selectedTab, approvedStalls, pendingStalls, rejectedStalls]);

  const loadCCNDayStalls = useCallback(async () => {
    if (!ccnDayContract || !stallsContract) {
      setPageError("Smart contracts are not ready yet.");
      setIsLoadingPage(false);
      return;
    }

    if (!selectedCCNDayId) {
      setPageError("Invalid CCN Day selected.");
      setIsLoadingPage(false);
      return;
    }

    try {
      setIsLoadingPage(true);
      setPageError("");

      const selectedCCNDay =
        await ccnDayContract.GetCCNDayByID(selectedCCNDayId);

      const selectedCCNDayStalls =
        await stallsContract.GetCCNDayStalls(selectedCCNDayId);

      setCcnDay(mapCCNDayFromContract(selectedCCNDay));
      setStalls(selectedCCNDayStalls.map(mapStallFromContract));
    } catch (error) {
      console.error("Load organiser CCN Day stalls error:", error);
      setPageError(getErrorMessage(error));
      setCcnDay(null);
      setStalls([]);
    } finally {
      setIsLoadingPage(false);
    }
  }, [ccnDayContract, stallsContract, selectedCCNDayId]);

  useEffect(() => {
    loadCCNDayStalls();
  }, [loadCCNDayStalls]);

  const handleBreadcrumbToStallManagement = () => {
    navigate("/Organiser/StallManagement");
  };

  const handleViewStallDetails = (stallId) => {
    navigate(`/Organiser/StallManagement/${selectedCCNDayId}/${stallId}`);
  };

  const renderEmptyState = () => {
    const emptyStateContent = {
      approved: {
        label: "No Approved Stalls",
        title: "There are no approved stalls for this CCN Day yet.",
        description:
          "Approved stalls will appear here after the organiser approves stall applications.",
      },
      pending: {
        label: "No Pending Stalls",
        title: "There are no pending stall applications for this CCN Day.",
        description:
          "Pending stall applications will appear here when users submit stall applications.",
      },
      rejected: {
        label: "No Rejected Stalls",
        title: "There are no rejected stalls for this CCN Day.",
        description:
          "Rejected stall applications will appear here after the organiser rejects an application.",
      },
    };

    const content = emptyStateContent[selectedTab];

    return (
      <section className="organiser-ccn-stalls-empty-state">
        <img src={EmptyStallImage} alt="No stalls found" />

        <span>{content.label}</span>

        <h2>{content.title}</h2>

        <p>{content.description}</p>
      </section>
    );
  };

  const renderStallCards = () => {
    if (activeTabStalls.length === 0) {
      return renderEmptyState();
    }

    return (
      <section className="organiser-ccn-stalls-grid">
        {activeTabStalls.map((stall) => (
          <article className="organiser-ccn-stall-card" key={stall.id}>
            <div className="organiser-ccn-stall-image-wrap">
              <img src={stall.image} alt={stall.name} />

              <span
                className={`organiser-ccn-stall-status ${getStallStatusClass(
                  stall.status,
                )}`}
              >
                {stall.statusLabel}
              </span>
            </div>

            <div className="organiser-ccn-stall-card-body">
              <div className="organiser-ccn-stall-card-heading">
                <div>
                  <h2>{stall.name}</h2>
                  <p>{stall.type}</p>
                </div>

                <span>{stall.school}</span>
              </div>

              <p className="organiser-ccn-stall-description">
                {stall.description}
              </p>

              <div className="organiser-ccn-stall-info-grid">
                <div>
                  <span>Owner</span>
                  <strong title={stall.ownerWallet}>
                    {formatWalletAddress(stall.ownerWallet)}
                  </strong>
                </div>

                <div>
                  <span>Location</span>
                  <strong>{stall.location}</strong>
                </div>

                <div>
                  <span>Electrical Port</span>
                  <strong>
                    {stall.needElectricalPort ? "Needed" : "Not Needed"}
                  </strong>
                </div>

                <div>
                  <span>Created At</span>
                  <strong>{stall.createdAt}</strong>
                </div>
              </div>

              <button
                type="button"
                className="organiser-ccn-stall-view-button"
                onClick={() => handleViewStallDetails(stall.id)}
              >
                View Details
              </button>
            </div>
          </article>
        ))}
      </section>
    );
  };

  return (
    <main className="organiser-ccn-stalls-page">
      <section className="organiser-ccn-stalls-hero">
        <nav
          className="organiser-ccn-stalls-breadcrumb"
          aria-label="Breadcrumb"
        >
          <button type="button" onClick={handleBreadcrumbToStallManagement}>
            Stall Management
          </button>

          <span>/</span>

          <strong>CCN Day #{ccnDay?.id || selectedCCNDayId}</strong>
        </nav>

        <div>
          <h1>{ccnDay?.name || "CCN Day Stalls"}</h1>
          <p>
            {ccnDay?.description ||
              "Review pending and approved stalls for the selected CCN Day."}
          </p>
        </div>

        {ccnDay && (
          <div className="organiser-ccn-stalls-event-grid">
            <article>
              <span>Registration Opens</span>
              <strong>{ccnDay.registrationStart}</strong>
            </article>

            <article>
              <span>Registration Closes</span>
              <strong>{ccnDay.registrationEnd}</strong>
            </article>

            <article>
              <span>CCN Day Starts</span>
              <strong>{ccnDay.eventStart}</strong>
            </article>

            <article>
              <span>CCN Day Ends</span>
              <strong>{ccnDay.eventEnd}</strong>
            </article>
          </div>
        )}
      </section>

      {isLoadingPage ? (
        <section className="organiser-ccn-stalls-loader-state">
          <CareLinkLoader />
          <p>Loading stalls for this CCN Day...</p>
        </section>
      ) : pageError ? (
        <section className="organiser-ccn-stalls-empty-state">
          <img src={EmptyStallImage} alt="Unable to load stalls" />

          <span>Unable To Load Stalls</span>
          <h2>Something went wrong.</h2>
          <p>{pageError}</p>

          <button
            type="button"
            className="organiser-ccn-stall-view-button"
            onClick={loadCCNDayStalls}
          >
            Try Again
          </button>
        </section>
      ) : (
        <>
          <section className="organiser-ccn-stalls-tabs">
            <button
              type="button"
              className={selectedTab === "approved" ? "active" : ""}
              onClick={() => setSelectedTab("approved")}
            >
              Approved Stalls
              <span>{approvedStalls.length}</span>
            </button>

            <button
              type="button"
              className={selectedTab === "pending" ? "active" : ""}
              onClick={() => setSelectedTab("pending")}
            >
              Pending Stalls
              <span>{pendingStalls.length}</span>
            </button>
            
            <button
              type="button"
              className={selectedTab === "rejected" ? "active" : ""}
              onClick={() => setSelectedTab("rejected")}
            >
              Rejected Stalls
              <span>{rejectedStalls.length}</span>
            </button>
          </section>

          {renderStallCards()}
        </>
      )}
    </main>
  );
};

export default OrganiserCCNDayStalls;
