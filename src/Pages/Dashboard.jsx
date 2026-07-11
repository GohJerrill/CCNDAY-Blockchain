import React from "react";
import "./Dashboard.css";

const mockStalls = [
  {
    StallID: 1,
    StallName: "Temasek Bites",
    StallDescription:
      "Freshly prepared burgers, loaded fries, and refreshing drinks made for the perfect CCN Day meal.",
    StallImage:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80",
    stallType: "Food & Beverages",
    StallOwnerWallet: "0x45F683FAA842DA72E77A9B723E43120BA59C3A17",
    StallLocation: "Block 21, Booth A01",
    NeedElectricalPort: true,
    CreatedAt: 1720454400,
    stallStatus: "Open",
    AllowedWithdrawal: false,
    CCNDayID: 1,
  },
  {
    StallID: 2,
    StallName: "Pixel Play Arena",
    StallDescription:
      "Challenge your friends in exciting console games and compete to win attractive carnival prizes.",
    StallImage:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
    stallType: "Games",
    StallOwnerWallet: "0xA30F5F9E94303887760C2B1D5A68F4543E91D582",
    StallLocation: "Sports Hall, Booth B04",
    NeedElectricalPort: true,
    CreatedAt: 1720454500,
    stallStatus: "Open",
    AllowedWithdrawal: false,
    CCNDayID: 1,
  },
  {
    StallID: 3,
    StallName: "Little Joys",
    StallDescription:
      "Discover handmade keychains, personalised cards, and thoughtful gifts created by TP students.",
    StallImage:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=80",
    stallType: "Gifts",
    StallOwnerWallet: "0x24CD51CE62DA8566F569261781D349A86B1F3C90",
    StallLocation: "Library Walkway, Booth C02",
    NeedElectricalPort: false,
    CreatedAt: 1720454600,
    stallStatus: "Open",
    AllowedWithdrawal: false,
    CCNDayID: 1,
  },
  {
    StallID: 4,
    StallName: "Second Chance Closet",
    StallDescription:
      "Give quality pre-owned clothes and accessories a second life while supporting sustainable fashion.",
    StallImage:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80",
    stallType: "Pre-owned / Recycling",
    StallOwnerWallet: "0x71A9C40268F039B2217D60E25F5A702ABC42D848",
    StallLocation: "Design Walkway, Booth D03",
    NeedElectricalPort: false,
    CreatedAt: 1720454700,
    stallStatus: "Open",
    AllowedWithdrawal: false,
    CCNDayID: 1,
  },
  {
    StallID: 5,
    StallName: "SnapSpot Studio",
    StallDescription:
      "Capture your CCN Day memories with themed photography, instant portraits, and creative photo props.",
    StallImage:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
    stallType: "Services",
    StallOwnerWallet: "0x598A43CE21F59C040A87B258915B29811291C367",
    StallLocation: "Plaza Entrance, Booth E01",
    NeedElectricalPort: true,
    CreatedAt: 1720454800,
    stallStatus: "Open",
    AllowedWithdrawal: false,
    CCNDayID: 1,
  },
  {
    StallID: 6,
    StallName: "Campus Beats",
    StallDescription:
      "Enjoy live acoustic performances and student busking sessions throughout the afternoon.",
    StallImage:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=900&q=80",
    stallType: "Performance / Busking",
    StallOwnerWallet: "0x867BC1154A46260E240519D0F53C9A2DA86D15C4",
    StallLocation: "Main Stage",
    NeedElectricalPort: true,
    CreatedAt: 1720454900,
    stallStatus: "Open",
    AllowedWithdrawal: false,
    CCNDayID: 1,
  },
  {
    StallID: 7,
    StallName: "GreenLoop Crafts",
    StallDescription:
      "Explore creative decorations and useful items made using recycled and environmentally friendly materials.",
    StallImage:
      "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=80",
    stallType: "Others",
    StallOwnerWallet: "0x94C302E17BD2796184F725B49031D77C61AA65E8",
    StallLocation: "Garden Area, Booth F06",
    NeedElectricalPort: false,
    CreatedAt: 1720455000,
    stallStatus: "Open",
    AllowedWithdrawal: false,
    CCNDayID: 1,
  },
  {
    StallID: 8,
    StallName: "Sweet Cloud Bakery",
    StallDescription:
      "Treat yourself to freshly baked brownies, cookies, cupcakes, and other student-made desserts.",
    StallImage:
      "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=900&q=80",
    stallType: "Food & Beverages",
    StallOwnerWallet: "0x3B1646AD20F85AA32197203D044A96C682572C10",
    StallLocation: "Block 21, Booth A05",
    NeedElectricalPort: false,
    CreatedAt: 1720455100,
    stallStatus: "Open",
    AllowedWithdrawal: false,
    CCNDayID: 1,
  },
];

const formatWalletAddress = (walletAddress) => {
  return `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
};

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);

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
  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <a
          href="/"
          className="dashboard-sidebar-logo"
          aria-label="Return to CareLink landing page"
        >
          <img src="/carelink-icon.svg" alt="CareLink" />
        </a>

        <nav className="dashboard-sidebar-navigation">
          <button
            type="button"
            className="dashboard-sidebar-button active"
            aria-label="Dashboard"
            data-tooltip="Dashboard"
          >
            <DashboardIcon />
          </button>

          <button
            type="button"
            className="dashboard-sidebar-button"
            aria-label="My stall"
            data-tooltip="My Stall"
          >
            <StallIcon />
          </button>

          <div className="dashboard-profile-navigation">
            <button
              type="button"
              className="dashboard-sidebar-button"
              aria-label="Account options"
              data-tooltip="Account"
            >
              <UserIcon />
            </button>

            <div className="dashboard-profile-menu">
              <div className="dashboard-profile-menu-heading">
                Account options
              </div>

              <button type="button" className="dashboard-profile-menu-item">
                <UserIcon />
                <span>Profile</span>
              </button>

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

      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <div className="dashboard-search">
            <SearchIcon />

            <input
              type="text"
              placeholder="Search stalls by name"
              aria-label="Search stalls by name"
            />

            <button type="button" aria-label="Search">
              <SearchIcon />
            </button>
          </div>

          <div className="dashboard-account">
            <div className="dashboard-default-avatar">
              <UserIcon />
            </div>

            <div className="dashboard-account-details">
              <span className="dashboard-wallet-address">0x71C4...93A2</span>

              <span className="dashboard-account-role">Student</span>
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

              <select defaultValue="all" aria-label="Filter by stall type">
                <option value="all">All stall types</option>
                <option value="food">Food &amp; Beverages</option>
                <option value="games">Games</option>
                <option value="gifts">Gifts</option>
                <option value="pre-owned">Pre-owned / Recycling</option>
                <option value="services">Services</option>
                <option value="performance">Performance / Busking</option>
                <option value="others">Others</option>
              </select>
            </div>
          </section>

          <section className="dashboard-stalls-section">
            <div className="dashboard-stalls-heading">
              <div>
                <h2>All stalls</h2>
                <span>{mockStalls.length} approved stalls</span>
              </div>
            </div>

            <div className="dashboard-stall-grid">
              {mockStalls.map((stall) => (
                <article className="dashboard-stall-card" key={stall.StallID}>
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
                        {stall.stallType}
                      </span>

                      <span className="dashboard-stall-location">
                        <LocationIcon />
                        {stall.StallLocation}
                      </span>
                    </div>

                    <h3>{stall.StallName}</h3>

                    <p className="dashboard-stall-description">
                      {stall.StallDescription}
                    </p>

                    <div className="dashboard-stall-owner">
                      <span>Stall owner</span>

                      <strong title={stall.StallOwnerWallet}>
                        {formatWalletAddress(stall.StallOwnerWallet)}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
