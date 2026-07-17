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
import ProtectedRoute from "./Components/ProtectedRoute";
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

function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/RegisterBABY" element={<RegistrationPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/UserDashboard" element={<Dashboard />} />
              <Route path="/Stall" element={<Stall />} />
              <Route path="/StallHistory" element={<StallHistory />} />
              <Route
                path="/StallTransactions/:stallId"
                element={<StallTransaction />}
              />
              <Route path="/UserProfile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Web3Provider>
    </BrowserRouter>
  );
}

export default App;
