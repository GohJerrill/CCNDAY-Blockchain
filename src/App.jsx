import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./Pages/LandingPage";
import heroImg from "./assets/hero.png";
import "./App.css";

// Initial Commit - Set up the start of the project BABY - 2nd July
// Did the Landing page.jsx - 3rd July

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
