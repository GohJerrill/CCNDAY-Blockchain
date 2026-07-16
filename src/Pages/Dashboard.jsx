import React, { useEffect, useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import CareLinkLoader from "../components/CareLinkLoader";
import NoCCNDay from "../assets/NoCCNDay.svg";
import "./Dashboard.css";
import NoAvailableStall from "../assets/NoAvailableStall.svg";

const stallTypeOptions = [
  "Food & Beverages",
  "Games",
  "Gifts",
  "Pre-owned / Recycling",
  "Services",
  "Performance / Busking",
  "Others",
];

const stallStatusLabels = ["Pending", "Open", "Closed", "Rejected"];

const schoolOptions = [
  "IIT",
  "Business",
  "Engineering",
  "Design",
  "Science",
  "Humanities",
];

const userTypeLabels = ["Customer", "Student", "Staff"];

const schoolLabels = [
  "IIT",
  "Business",
  "Engineering",
  "Design",
  "Science",
  "Humanities",
  "Others",
];

const formatWalletAddress = (walletAddress) => {
  if (!walletAddress) return "Unknown wallet";

  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
};

const toNumber = (value) => {
  if (value === undefined || value === null) return 0;

  return Number(value.toString());
};

const getStallLoadErrorType = (error) => {
  const combinedErrorMessage = [
    error?.reason,
    error?.shortMessage,
    error?.message,
    error?.info?.error?.message,
    error?.info?.error?.data?.message,
  ]
    .filter(Boolean)
    .join(" ");

  if (combinedErrorMessage.includes("NoCurrentCCNDay")) {
    return "no-current-ccn-day";
  }

  return "unknown-error";
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

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21c.7-4.1 3.2-6.2 7.5-6.2s6.8 2.1 7.5 6.2" />
  </svg>
);

const FilterIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 6h16" />
    <path d="M7 12h10" />
    <path d="M10 18h4" />
  </svg>
);

const LocationIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const Dashboard = () => {
  const {
    walletAddress,
    formattedWalletAddress,
    usersContract,
    ccnDayContract,
    stallsContract,
    isConnected,
  } = useWeb3();

  // For filtering for the different stalls.
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStallType, setSelectedStallType] = useState("all");
  const [selectedSchool, setSelectedSchool] = useState("all");

  // For Account rendering states
  const [accountRole, setAccountRole] = useState("Loading...");
  const [accountSchool, setAccountSchool] = useState("");
  const [accountTheme, setAccountTheme] = useState("student");
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  // Fall Stall Render
  const [stalls, setStalls] = useState([]);
  const [isLoadingStalls, setIsLoadingStalls] = useState(true);
  const [stallsError, setStallsError] = useState("");
  const [stallLoadState, setStallLoadState] = useState("loading");

  // Load account details //
  useEffect(() => {
    const loadAccountDetails = async () => {
      if (!isConnected || !walletAddress || !usersContract) {
        setAccountRole("Not connected");
        setAccountSchool("");
        setAccountTheme("student");
        setIsLoadingAccount(false);
        return;
      }

      try {
        setIsLoadingAccount(true);

        const authProfile = await usersContract.AuthenticateMyWallet();

        const isOrganiser = Boolean(authProfile.isOrganiser ?? authProfile[3]);
        const userTypeValue = Number(authProfile.usertype ?? authProfile[6]);
        const schoolValue = Number(authProfile.school ?? authProfile[7]);

        if (isOrganiser) {
          setAccountRole("Organiser");
          setAccountSchool("");
          setAccountTheme("organiser");
          return;
        }

        const isApprovedStallOwner = stallsContract
          ? await stallsContract.IsWalletApprovedStallOwner(walletAddress)
          : false;

        if (isApprovedStallOwner) {
          setAccountRole("Stall Owner");
          setAccountSchool(schoolLabels[schoolValue] || "");
          setAccountTheme("stall-owner");
          return;
        }

        const readableUserRole =
          userTypeLabels[userTypeValue] || "Registered user";

        setAccountRole(readableUserRole);
        setAccountSchool(schoolLabels[schoolValue] || "");

        if (readableUserRole === "Staff") {
          setAccountTheme("staff");
          return;
        }

        setAccountTheme("student");
      } catch (error) {
        console.error("Dashboard account load error:", error);
        setAccountRole("Unknown user");
        setAccountSchool("");
      } finally {
        setIsLoadingAccount(false);
      }
    };

    loadAccountDetails();
  }, [isConnected, walletAddress, usersContract, stallsContract]);

  // Load CCN Day stalls
  useEffect(() => {
    const loadCurrentCCNDayStalls = async () => {
      if (!stallsContract || !ccnDayContract) {
        setStalls([]);
        setStallsError("");
        setStallLoadState("error");
        setIsLoadingStalls(false);
        return;
      }

      try {
        setIsLoadingStalls(true);
        setStallsError("");
        setStallLoadState("loading");

        const contractCCNDay = await ccnDayContract.GetCurrentCCNDay();
        const mappedCCNDay = mapCCNDayFromContract(contractCCNDay);

        if (!mappedCCNDay.CCNDayID) {
          setStalls([]);
          setStallsError("");
          setStallLoadState("no-current-ccn-day");
          return;
        }

        const currentTimestamp = Math.floor(Date.now() / 1000);

        if (currentTimestamp > mappedCCNDay.EndDateTime) {
          setStalls([]);
          setStallsError("");
          setStallLoadState("ccn-day-ended");
          return;
        }

        const contractStalls = await stallsContract.GetCurrentCCNDayStalls();

        const mappedStalls = contractStalls
          .map(mapStallFromContract)
          .filter((stall) => stall.stallStatus === "Open");

        setStalls(mappedStalls);
        setStallsError("");
        setStallLoadState("ready");
      } catch (error) {
        console.error("Dashboard stall load error:", error);

        const errorType = getStallLoadErrorType(error);

        setStalls([]);

        if (errorType === "no-current-ccn-day") {
          setStallsError("");
          setStallLoadState("no-current-ccn-day");
        } else {
          setStallsError(
            "Unable to load stalls from the blockchain. Please try again.",
          );
          setStallLoadState("error");
        }
      } finally {
        setIsLoadingStalls(false);
      }
    };

    loadCurrentCCNDayStalls();
  }, [stallsContract, ccnDayContract]);

  const filteredStalls = stalls.filter((stall) => {
    const stallName = stall.StallName.toLowerCase();
    const searchValue = searchTerm.trim().toLowerCase();

    const matchesSearch =
      searchValue.length === 0 || stallName.includes(searchValue);

    const matchesStallType =
      selectedStallType === "all" || stall.stallType === selectedStallType;

    const matchesSchool =
      selectedSchool === "all" || stall.StallSchool === selectedSchool;

    return matchesSearch && matchesStallType && matchesSchool;
  });

  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    selectedStallType !== "all" ||
    selectedSchool !== "all";

  const hasNoFilteredResults =
    stallLoadState === "ready" &&
    stalls.length > 0 &&
    filteredStalls.length === 0;

  const hasNoCurrentCCNDay = stallLoadState === "no-current-ccn-day";
  const hasCCNDayEnded = stallLoadState === "ccn-day-ended";
  const hasNoOpenStalls =
    stallLoadState === "ready" && stalls.length === 0 && !hasActiveFilters;

  let emptyStateImage = NoAvailableStall;
  let emptyStateTitle = "No stalls available";
  let emptyStateDescription =
    "There are currently no approved open stalls available for this CCN Day.";

  if (isLoadingStalls) {
    emptyStateTitle = "Loading stalls...";
    emptyStateDescription =
      "Please wait while CareLink loads the latest stalls from the blockchain.";
  } else if (hasNoCurrentCCNDay) {
    emptyStateImage = NoCCNDay;
    emptyStateTitle = "No current CCN Day";
    emptyStateDescription =
      "There is currently no active CCN Day, so no stalls are available yet.";
  } else if (hasCCNDayEnded) {
    emptyStateImage = NoCCNDay;
    emptyStateTitle = "CCN Day has ended";
    emptyStateDescription =
      "There is no upcoming CCN Day, please check back another time!";
  } else if (stallLoadState === "error") {
    emptyStateTitle = "Unable to load stalls";
    emptyStateDescription = stallsError;
  } else if (hasNoFilteredResults) {
    emptyStateTitle = "No stalls match your filters";
    emptyStateDescription =
      "Try changing your search keyword, stall type, or school filter.";
  } else if (hasNoOpenStalls) {
    emptyStateTitle = "No stalls available";
    emptyStateDescription =
      "A CCN Day is active, but there are no approved open stalls available yet.";
  }

  const shouldShowEmptyState =
    isLoadingStalls ||
    hasNoCurrentCCNDay ||
    hasCCNDayEnded ||
    stallLoadState === "error" ||
    filteredStalls.length === 0;

  return (
    <>
      <header className="dashboard-topbar">
        <div className="dashboard-search">
          <SearchIcon />

          <input
            type="text"
            placeholder="Search stalls by name"
            aria-label="Search stalls by name"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <button type="button" aria-label="Search">
            <SearchIcon />
          </button>
        </div>

        <div className={`dashboard-account dashboard-account-${accountTheme}`}>
          <div className="dashboard-default-avatar">
            <UserIcon />
          </div>

          <div className="dashboard-account-details">
            <span
              className="dashboard-wallet-address"
              title={walletAddress || "Wallet not connected"}
            >
              {isConnected ? formattedWalletAddress : "Not connected"}
            </span>

            <span className="dashboard-account-role">
              {isLoadingAccount
                ? "Loading..."
                : accountSchool
                  ? `${accountRole} · ${accountSchool}`
                  : accountRole}
            </span>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-heading-section">
          <div>
            <h1>CCN DAY</h1>

            <p className="dashboard-heading-description">
              Discover CCN stalls and support your favourite student-run
              businesses with ease and security.
            </p>
          </div>

          <div className="dashboard-filter">
            <div className="dashboard-filter-label">
              <FilterIcon />
              <span>Stall type</span>
            </div>

            <select
              value={selectedStallType}
              onChange={(event) => setSelectedStallType(event.target.value)}
              aria-label="Filter by stall type"
            >
              <option value="all">All stall types</option>

              {stallTypeOptions.map((stallType) => (
                <option value={stallType} key={stallType}>
                  {stallType}
                </option>
              ))}
            </select>
          </div>

          <div className="dashboard-filter">
            <div className="dashboard-filter-label">
              <FilterIcon />
              <span>School</span>
            </div>

            <select
              value={selectedSchool}
              onChange={(event) => setSelectedSchool(event.target.value)}
              aria-label="Filter by school"
            >
              <option value="all">All schools</option>

              {schoolOptions.map((school) => (
                <option value={school} key={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="dashboard-stalls-section">
          <div className="dashboard-stalls-heading">
            <div>
              <h2>All stalls</h2>
              <span>
                {isLoadingStalls
                  ? "Loading blockchain stalls..."
                  : hasNoCurrentCCNDay
                    ? "No active CCN Day"
                    : hasCCNDayEnded
                      ? "CCN Day ended"
                      : stallLoadState === "error"
                        ? "Unable to load stalls"
                        : `${filteredStalls.length} of ${stalls.length} open stalls`}
              </span>
            </div>
          </div>

          <div className="dashboard-stall-grid">
            {isLoadingStalls || stallsError || shouldShowEmptyState ? (
              <div className="dashboard-empty-state">
                {isLoadingStalls ? (
                  <CareLinkLoader
                    label={emptyStateTitle}
                    sublabel={emptyStateDescription}
                  />
                ) : (
                  <>
                    <img
                      src={emptyStateImage}
                      alt={emptyStateTitle}
                      className="dashboard-empty-state-image"
                    />

                    <h3>{emptyStateTitle}</h3>
                    <p>{emptyStateDescription}</p>
                  </>
                )}
              </div>
            ) : (
              filteredStalls.map((stall) => (
                <div className="dashboard-stall-card" key={stall.StallID}>
                  <div className="dashboard-stall-image-container">
                    <img
                      src={stall.StallImage}
                      alt={stall.StallName}
                      className="dashboard-stall-image"
                      loading="lazy"
                    />
                  </div>

                  <div className="dashboard-stall-content">
                    <div className="dashboard-stall-metadata">
                      <span className="dashboard-stall-type">
                        {stall.stallType} · {stall.StallSchool}
                      </span>
                    </div>

                    <h3>{stall.StallName}</h3>

                    <p className="dashboard-stall-description">
                      {stall.StallDescription}
                    </p>

                    <span className="dashboard-stall-location">
                      <LocationIcon />
                      {stall.StallLocation}
                    </span>

                    <div className="dashboard-stall-owner">
                      <span>Stall owner</span>

                      <strong title={stall.StallOwnerWallet}>
                        {formatWalletAddress(stall.StallOwnerWallet)}
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
};

export default Dashboard;
