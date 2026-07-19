import { NavLink, useNavigate } from "react-router-dom";
import CareLinkLogo from "../assets/carelink-icon.svg";
import "./OrganiserSidebar.css";

const CalendarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="organiser-sidebar-svg"
  >
    <path
      d="M7 3V6M17 3V6M4.5 9.5H19.5M6.5 5H17.5C18.6046 5 19.5 5.89543 19.5 7V18C19.5 19.1046 18.6046 20 17.5 20H6.5C5.39543 20 4.5 19.1046 4.5 18V7C4.5 5.89543 5.39543 5 6.5 5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 13H10M14 13H16M8 16H10M14 16H16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const ShieldIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="organiser-sidebar-svg"
  >
    <path
      d="M12 3.5L18.5 6V11.2C18.5 15.35 15.8 19.05 12 20.5C8.2 19.05 5.5 15.35 5.5 11.2V6L12 3.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.25 12.2L11.1 14.05L15 10.15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StallIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="organiser-sidebar-svg"
  >
    <path
      d="M5 10.5V19H19V10.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 10.5L5.5 5H18.5L20 10.5H4Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 10.5V5M12 10.5V5M16 10.5V5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M9 19V15.5C9 14.6716 9.67157 14 10.5 14H13.5C14.3284 14 15 14.6716 15 15.5V19"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DashboardIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="organiser-sidebar-svg"
  >
    <path
      d="M4.5 5.5H10V11H4.5V5.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M14 5.5H19.5V11H14V5.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 15H10V20.5H4.5V15Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M14 15H19.5V20.5H14V15Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const LogoutIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className="organiser-sidebar-svg"
  >
    <path
      d="M10 6H6.5C5.67157 6 5 6.67157 5 7.5V16.5C5 17.3284 5.67157 18 6.5 18H10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M14.5 8.5L18 12L14.5 15.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 12H10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const OrganiserSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <aside className="organiser-sidebar">
      <div className="organiser-sidebar-brand">
        <div className="organiser-sidebar-logo">
          <img src={CareLinkLogo} alt="CareLink logo" />
        </div>
        <div>
          <h2>CareLink</h2>
          <p>Organiser Panel</p>
        </div>
      </div>

      <nav className="organiser-sidebar-nav">
        <NavLink
          to="/Organiser/CCNDaySetup"
          className={({ isActive }) =>
            isActive
              ? "organiser-sidebar-link active"
              : "organiser-sidebar-link"
          }
        >
          <span className="organiser-sidebar-icon">
            <CalendarIcon />
          </span>
          <span>CCN Day Setup</span>
        </NavLink>

        <NavLink
          to="/Organiser/StaffWhitelist"
          className={({ isActive }) =>
            isActive
              ? "organiser-sidebar-link active"
              : "organiser-sidebar-link"
          }
        >
          <span className="organiser-sidebar-icon">
            <ShieldIcon />
          </span>
          <span>Staff Whitelist</span>
        </NavLink>

        <NavLink
          to="/Organiser/StallManagement"
          className={({ isActive }) =>
            isActive
              ? "organiser-sidebar-link active"
              : "organiser-sidebar-link"
          }
        >
          <span className="organiser-sidebar-icon">
            <StallIcon />
          </span>
          <span>Stall Management</span>
        </NavLink>
      </nav>

      {/* <div className="organiser-sidebar-footer">
        <button
          type="button"
          className="organiser-sidebar-secondary-button"
          onClick={() => navigate("/UserDashboard")}
        >
          <span className="organiser-sidebar-button-icon">
            <DashboardIcon />
          </span>
          <span>User Dashboard</span>
        </button>

        <button
          type="button"
          className="organiser-sidebar-logout-button"
          onClick={handleLogout}
        >
          <span className="organiser-sidebar-button-icon">
            <LogoutIcon />
          </span>
          <span>Logout</span>
        </button>
      </div> */}
    </aside>
  );
};

export default OrganiserSidebar;
