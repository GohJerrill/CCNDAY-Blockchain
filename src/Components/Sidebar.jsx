import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </svg>
);

const StallIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 10h16" />
    <path d="M5 10v10h14V10" />
    <path d="M3 10 5.2 4h13.6L21 10" />
    <path d="M8 20v-6h4v6" />
    <path d="M3 10c0 1.2 1 2 2.2 2S7.5 11.2 7.5 10c0 1.2 1 2 2.3 2s2.2-.8 2.2-2c0 1.2 1 2 2.3 2s2.2-.8 2.2-2c0 1.2 1 2 2.3 2S21 11.2 21 10" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21c.7-4.1 3.2-6.2 7.5-6.2s6.8 2.1 7.5 6.2" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10 4H5v16h5" />
    <path d="M14 8l4 4-4 4" />
    <path d="M18 12H9" />
  </svg>
);

const ThemeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M4.93 4.93 6.34 6.34" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m4.93 19.07 1.41-1.41" />
    <path d="m17.66 6.34 1.41-1.41" />
  </svg>
);

const getSidebarButtonClass = ({ isActive }) =>
  isActive ? "dashboard-sidebar-button active" : "dashboard-sidebar-button";

const Sidebar = () => {
  const location = useLocation();
  const isProfileActive = location.pathname === "/UserProfile";
  return (
    <aside className="dashboard-sidebar">
      <NavLink
        to="/"
        className="dashboard-sidebar-logo"
        aria-label="Return to CareLink landing page"
      >
        <img src="/carelink-icon.svg" alt="CareLink" />
      </NavLink>

      <nav className="dashboard-sidebar-navigation">
        <NavLink
          to="/UserDashboard"
          end
          className={getSidebarButtonClass}
          aria-label="Dashboard"
          data-tooltip="Dashboard"
        >
          <DashboardIcon />
        </NavLink>

        <NavLink
          to="/Stall"
          className={getSidebarButtonClass}
          aria-label="My stall"
          data-tooltip="My Stall"
        >
          <StallIcon />
        </NavLink>

        <div className="dashboard-profile-navigation">
          <button
            type="button"
            className={
              isProfileActive
                ? "dashboard-sidebar-button active"
                : "dashboard-sidebar-button"
            }
            aria-label="Account options"
            data-tooltip="Account"
          >
            <UserIcon />
          </button>

          <div className="dashboard-profile-menu">
            <div className="dashboard-profile-menu-heading">
              Account options
            </div>

            <NavLink to="/UserProfile" className="dashboard-profile-menu-item">
              <UserIcon />
              <span>Profile</span>
            </NavLink>

            <button
              type="button"
              className="dashboard-profile-menu-item logout"
            >
              <LogoutIcon />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </nav>

      <button
        type="button"
        className="dashboard-theme-button"
        aria-label="Change display theme"
        data-tooltip="Dark Mode"
      >
        <ThemeIcon />
      </button>
    </aside>
  );
};

export default Sidebar;
