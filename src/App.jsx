import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./Pages/LandingPage";
import RegistrationPage from "./Pages/RegistrationPage";
import heroImg from "./assets/hero.png";
import "./App.css";
import Dashboard from "./Pages/Dashboard";

// Initial Commit - Set up the start of the project BABY - 2nd July
// Did the Landing page.jsx - 3rd July
// Completed the Mock Registration page.jsx - 4th July
// Did the user Dashboard.jsx, preparing for backend testing and further frontend implementation - 12 July

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/RegisterBABY" element={<RegistrationPage />} />
        <Route path="/UserDashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
