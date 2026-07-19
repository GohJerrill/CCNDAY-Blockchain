import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import CareLinkLoader from "../components/CareLinkLoader";
import NoCCNDayImage from "../assets/NoCCNDay.svg";
import "./OrganiserStallManagement.css";

const schoolOptions = [
  { label: "IIT", value: 0 },
  { label: "Business", value: 1 },
  { label: "Engineering", value: 2 },
  { label: "Design", value: 3 },
  { label: "Science", value: 4 },
  { label: "Humanities", value: 5 },
];

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  return Number(value.toString());
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

const formatDisplayDateFromUnix = (unixSeconds) => {
  const timestamp = toNumber(unixSeconds);

  if (!timestamp) return "-";

  return new Date(timestamp * 1000).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const mapSchoolValueToLabel = (schoolValue) => {
  const matchedSchool = schoolOptions.find(
    (school) => school.value === toNumber(schoolValue),
  );

  return matchedSchool?.label || "Unknown";
};

const formatEligibleSchools = (eligibleSchools) => {
  if (!eligibleSchools || eligibleSchools.length === 0) {
    return "-";
  }

  const validSchoolLabels = eligibleSchools
    .map(mapSchoolValueToLabel)
    .filter((schoolLabel) => schoolLabel !== "Unknown");

  if (validSchoolLabels.length === schoolOptions.length) {
    return "All Schools";
  }

  return validSchoolLabels.join(", ");
};

const getErrorMessage = (error) => {
  const rawMessage =
    error?.reason || error?.shortMessage || error?.message || "";

  if (rawMessage.includes("NotOrganiser")) {
    return "Only the organiser wallet can view stall management.";
  }

  if (rawMessage.includes("CCNDayDoesNotExist")) {
    return "One of the CCN Day records could not be found.";
  }

  if (rawMessage.includes("InvalidCCNDayID")) {
    return "Invalid CCN Day record detected.";
  }

  if (rawMessage.includes("GetAllCCNDays")) {
    return "GetAllCCNDays is not available yet. Please redeploy the updated CCN Day contract and update the ABI.";
  }

  if (rawMessage.includes("GetCCNDayStallCount")) {
    return "GetCCNDayStallCount is not available yet. Please redeploy the updated Stalls contract and update the ABI.";
  }

  return rawMessage || "Unable to load CCN Day records. Please try again.";
};

const mapCCNDayFromContract = ({
  ccnDay,
  eligibleSchools,
  totalStalls,
  currentCCNDayId,
  isCurrentCCNDayActive,
}) => {
  const ccnDayId = toNumber(ccnDay.CCNDayID ?? ccnDay[0]);
  const ccnName = ccnDay.CCNName ?? ccnDay[1];

  const startDateTime = toNumber(ccnDay.StartDateTime ?? ccnDay[3]);
  const endDateTime = toNumber(ccnDay.EndDateTime ?? ccnDay[4]);

  const registrationStartDateTime = toNumber(
    ccnDay.StallRegistrationStartDateTime ?? ccnDay[5],
  );

  const registrationEndDateTime = toNumber(
    ccnDay.StallRegistrationEndDateTime ?? ccnDay[6],
  );

  const createdAt = toNumber(ccnDay.CreatedAt ?? ccnDay[7]);

  const isActive =
    ccnDayId === currentCCNDayId && Boolean(isCurrentCCNDayActive);

  return {
    id: ccnDayId,
    name: ccnName,
    status: isActive ? "Active CCN Day" : "Past CCN Day",
    registrationStart: formatDisplayDateTimeFromUnix(registrationStartDateTime),
    registrationEnd: formatDisplayDateTimeFromUnix(registrationEndDateTime),
    eventStart: formatDisplayDateTimeFromUnix(startDateTime),
    eventEnd: formatDisplayDateTimeFromUnix(endDateTime),
    eligibleSchools: formatEligibleSchools(eligibleSchools),
    totalStalls: toNumber(totalStalls),
    createdAt: formatDisplayDateFromUnix(createdAt),
    isActive,
  };
};

const OrganiserStallManagement = () => {
  const navigate = useNavigate();
  const { ccnDayContract, stallsContract } = useWeb3();

  const [ccnDays, setCcnDays] = useState([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [pageError, setPageError] = useState("");

  const loadCCNDays = useCallback(async () => {
    if (!ccnDayContract || !stallsContract) {
      setCcnDays([]);
      setPageError("Smart contracts are not ready yet.");
      setIsLoadingPage(false);
      return;
    }

    try {
      setIsLoadingPage(true);
      setPageError("");

      const allCCNDaysFromBlockchain = await ccnDayContract.GetAllCCNDays();
      const currentCCNDayId = toNumber(await ccnDayContract.CurrentCCNDayID());
      const isCurrentCCNDayActive =
        await ccnDayContract.IsCurrentCCNDayActive();

      const mappedCCNDays = await Promise.all(
        allCCNDaysFromBlockchain.map(async (ccnDay) => {
          const ccnDayId = toNumber(ccnDay.CCNDayID ?? ccnDay[0]);

          const eligibleSchools =
            await ccnDayContract.GetCCNDayEligibleSchools(ccnDayId);

          const totalStalls =
            await stallsContract.GetCCNDayStallCount(ccnDayId);

          return mapCCNDayFromContract({
            ccnDay,
            eligibleSchools,
            totalStalls,
            currentCCNDayId,
            isCurrentCCNDayActive,
          });
        }),
      );

      const latestFirstCCNDays = mappedCCNDays.sort((first, second) => {
        return second.id - first.id;
      });

      setCcnDays(latestFirstCCNDays);
    } catch (error) {
      console.error("Load organiser stall management error:", error);
      setPageError(getErrorMessage(error));
      setCcnDays([]);
    } finally {
      setIsLoadingPage(false);
    }
  }, [ccnDayContract, stallsContract]);

  useEffect(() => {
    loadCCNDays();
  }, [loadCCNDays]);

  const handleViewDetails = (ccnDayId) => {
    navigate(`/Organiser/StallManagement/${ccnDayId}`);
  };

  return (
    <main className="organiser-stall-page">
      <section className="organiser-stall-hero">
        <div>
          <h1>Stall Management</h1>
          <p>
            View active and past CCN Days created by the organiser. Select a CCN
            Day later to review its stalls, products, transactions,
            applications, and withdrawals.
          </p>
        </div>
      </section>

      {isLoadingPage ? (
        <section className="organiser-stall-loader-state">
          <CareLinkLoader />
          <p>Loading CCN Day records...</p>
        </section>
      ) : pageError ? (
        <section className="organiser-stall-empty-state">
          <img src={NoCCNDayImage} alt="Unable to load CCN Day records" />

          <span>Unable To Load Records</span>
          <h2>Something went wrong.</h2>
          <p>{pageError}</p>

          <button
            type="button"
            className="organiser-stall-view-button"
            onClick={loadCCNDays}
          >
            Try Again
          </button>
        </section>
      ) : ccnDays.length === 0 ? (
        <section className="organiser-stall-empty-state">
          <img src={NoCCNDayImage} alt="No CCN Day records found" />

          <span>No CCN Days Found</span>
          <h2>No active or past CCN Day records yet.</h2>
          <p>Created CCN Days will appear here</p>
        </section>
      ) : (
        <section className="organiser-stall-panel">
          <div className="organiser-stall-panel-header">
            <div>
              <span>CCN Day Records</span>
              <h2>Active and Past CCN Days</h2>
            </div>

            <p>{ccnDays.length} record</p>
          </div>

          <div className="organiser-stall-table-wrapper">
            <table className="organiser-stall-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>CCN Day Name</th>
                  <th>Registration Period</th>
                  <th>Event Period</th>
                  <th>Eligible Schools</th>
                  <th>Total Stalls</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {ccnDays.map((ccnDay) => (
                  <tr
                    key={ccnDay.id}
                    className={ccnDay.isActive ? "active-row" : ""}
                  >
                    <td>
                      <span
                        className={
                          ccnDay.isActive
                            ? "organiser-stall-status-pill active"
                            : "organiser-stall-status-pill"
                        }
                      >
                        {ccnDay.status}
                      </span>
                    </td>

                    <td>
                      <strong>{ccnDay.name}</strong>
                    </td>

                    <td>
                      <span>{ccnDay.registrationStart}</span>
                      <small>{ccnDay.registrationEnd}</small>
                    </td>

                    <td>
                      <span>{ccnDay.eventStart}</span>
                      <small>{ccnDay.eventEnd}</small>
                    </td>

                    <td>{ccnDay.eligibleSchools}</td>

                    <td>{ccnDay.totalStalls}</td>

                    <td>{ccnDay.createdAt}</td>

                    <td>
                      <button
                        type="button"
                        className="organiser-stall-view-button"
                        onClick={() => handleViewDetails(ccnDay.id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
};

export default OrganiserStallManagement;
