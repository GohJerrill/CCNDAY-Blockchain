import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import LandingPage from "./Pages/LandingPage";
import RegistrationPage from "./Pages/RegistrationPage";
import Dashboard from "./Pages/Dashboard";
import Sidebar from "./Components/Sidebar";
import Stall from "./Pages/Stall";
import StallHistory from "./Pages/StallHistory";
import NotFound from "./Pages/NotFound";
import StallTransaction from "./Pages/StallTransaction";
import ProfilePage from "./Pages/ProfilePage";
import ProductPage from "./Pages/ProductPage";
import ProtectedRoute from "./Components/ProtectedRoute";
import PaymentPage from "./Pages/PaymentPage";
import PaymentSuccessPage from "./Pages/PaymentSuccessPage";

import OrganiserSidebar from "./Components/OrganiserSidebar";
import OrganiserTopbar from "./Components/OrganiserTopbar";
import OrganiserCCNDaySetup from "./Pages/OrganiserCCNDaySetup";
import OrganiserStaffWhitelist from "./Pages/OrganiserStaffWhitelist";
import OrganiserStallManagement from "./Pages/OrganiserStallManagement";
import OrganiserCCNDayStalls from "./Pages/OrganiserCCNDayStalls";
import OrganiserStallInformation from "./Pages/OrganiserStallInformation";
import { Web3Provider } from "./context/Web3Context";
import "./App.css";

// Initial Commit - Set up the start of the project BABY - 2nd July
// Did the Landing page.jsx - 3rd July
// Completed the Mock Registration page.jsx - 4th July
// Did the user Dashboard.jsx, preparing for backend testing and further frontend implementation - 12 July
// Completed the main dashboard page, prearing to start on the other pages and login - 13 July
// Completed the Profile page and the Stall page, preparing to start login and integration with Blockchain - 14 july 2026
// Implemented and connected the Blockchain mainly on Authentication and Stalls. Preparing to do more next time - 16 July 2026
// Implemented the frotnend and modified the backend logic for my code. Preparing to do profile, withdrawl, stall history and more tomorrow, God help me - 17 July 2026
// Implemented the rest of the pages and connected it to the blockchain. Preparing to settle Products card and transactions/payment - 18 July 2026
// Implemented the Products and transactions and connected it to the blockchain. preparing for organiser implemnentation - 19 July 2026
// Implemented the organiser flow and the organiser functionalities. Preparing for full testting and adding of additional features - 20 July 2026
// Continually checking and squashing bugs, and preparing to implement my additional features. - 21 July 2026

const DashboardLayout = () => {
  return (
    <div className="dashboard-page">
      <Sidebar />

      <div className="dashboard-workspace">
        <Outlet />
      </div>
    </div>
  );
};

const OrganiserLayout = () => {
  return (
    <div className="organiser-layout-page">
      <OrganiserSidebar />

      <div className="organiser-layout-workspace">
        <OrganiserTopbar />

        <div className="organiser-layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/RegisterBABY" element={<RegistrationPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/Payment/:stallId" element={<PaymentPage />} />
            <Route path="/PaymentSuccess" element={<PaymentSuccessPage />} />

            {/* User/Customer Layout */}
            <Route element={<DashboardLayout />}>
              <Route path="/UserDashboard" element={<Dashboard />} />
              <Route path="/Stall" element={<Stall />} />
              <Route path="/StallHistory" element={<StallHistory />} />
              <Route
                path="/StallTransactions/:stallId"
                element={<StallTransaction />}
              />
              <Route path="/UserProfile" element={<ProfilePage />} />
              <Route path="/StallView/:stallId" element={<ProductPage />} />
            </Route>

            {/* Organiser layout */}
            <Route element={<OrganiserLayout />}>
              <Route
                path="/Organiser/CCNDaySetup"
                element={<OrganiserCCNDaySetup />}
              />
              <Route
                path="/Organiser/StaffWhitelist"
                element={<OrganiserStaffWhitelist />}
              />
              <Route
                path="/Organiser/StallManagement"
                element={<OrganiserStallManagement />}
              />
              <Route
                path="/Organiser/StallManagement/:ccnDayId"
                element={<OrganiserCCNDayStalls />}
              />
              <Route
                path="/Organiser/StallManagement/:ccnDayId/:stallId"
                element={<OrganiserStallInformation />}
              />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Web3Provider>
    </BrowserRouter>
  );
}

export default App;
