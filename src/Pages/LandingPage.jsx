import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import HeroTypewriter from "../components/HeroTypewriter";
import SecurePayments from "../assets/SecurePayments.png";
import TransparentRecords from "../assets/TransparentRecords.png";
import Decentralisation from "../assets/Decentralisation.png";
import CareLinkCard from "../components/CareLinkCard";
import PulsatingButton from "../components/PulsatingButton";
import "./LandingPage.css";

const LandingPage = () => {
  const [isNavbarSolid, setIsNavbarSolid] = useState(false);

  const navigate = useNavigate();

  const { connectWallet, isConnected, isConnecting, web3Error } = useWeb3();

  const walletButtonText = isConnecting
    ? "Connecting..."
    : isConnected
      ? "Login"
      : "Connect Wallet";

  const handleConnectWallet = useCallback(async () => {
    const result = await connectWallet();

    if (!result.connected) {
      return;
    }

    if (result.isRegistered) {
      navigate("/UserDashboard");
      return;
    }

    navigate("/RegisterBABY");
  }, [connectWallet, navigate]);

  useEffect(() => {
    const handleNavbarBackground = () => {
      const introSection = document.getElementById("intro");

      if (!introSection) return;

      const introBottom = introSection.getBoundingClientRect().bottom;

      setIsNavbarSolid(introBottom <= 90);
    };

    handleNavbarBackground();

    window.addEventListener("scroll", handleNavbarBackground);
    window.addEventListener("resize", handleNavbarBackground);

    return () => {
      window.removeEventListener("scroll", handleNavbarBackground);
      window.removeEventListener("resize", handleNavbarBackground);
    };
  }, []);
  return (
    <main className="landing-page">
      <nav className={`landing-navbar ${isNavbarSolid ? "navbar-solid" : ""}`}>
        <a href="#intro" className="brand">
          <img
            src="/carelink-icon.svg"
            alt="CareLink Logo"
            className="brand-logo"
          />
          <span>CareLink</span>
        </a>

        <div className="nav-links">
          <a href="#intro">Intro</a>
          <a href="#how-to-use">How to use</a>
          <a href="#benefits">Benefits</a>
          <a href="#features">Features</a>
        </div>

        <button
          type="button"
          className="nav-button"
          onClick={handleConnectWallet}
          disabled={isConnecting}
        >
          {walletButtonText}
        </button>
      </nav>

      <section id="intro" className="landing-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-enjoy">Enjoy</span>
            <HeroTypewriter />
          </h1>

          <p className="hero-description">
            CareLink is a blockchain-powered payment platform for TP students
            and staff to discover CCN stalls. Use Sepolia to make receive funds
            and support your favourite stalls with ease and security.
          </p>

          <div className="hero-actions">
            <PulsatingButton
              onClick={handleConnectWallet}
              disabled={isConnecting}
            >
              {walletButtonText}
            </PulsatingButton>
          </div>

          {web3Error && <p className="wallet-error-message">{web3Error}</p>}
        </div>

        <CareLinkCard />
      </section>

      <section id="how-to-use" className="content-section">
        <p className="section-label">How to use</p>
        <h2>How does it impact you?</h2>

        <div className="section-grid">
          <div className="info-card">
            <span>01</span>
            <h3>Scan the stall QR</h3>
            <p>Open the selected stall page and view available products.</p>
          </div>

          <div className="info-card">
            <span>02</span>
            <h3>Connect MetaMask</h3>
            <p>
              Find the product you want, and input the price of the product.
            </p>
          </div>

          <div className="info-card">
            <span>03</span>
            <h3>Pay with Sepolia ETH</h3>
            <p>Confirm the payment and support the stall through blockchain!</p>
          </div>
        </div>
      </section>

      <section id="benefits" className="benefits-section">
        <div className="benefits-copy">
          <p className="section-label">Benefits</p>

          <h2>Making CCN Day a little bit better</h2>

          <p>
            CareLink uses blockchain and smart contracts to make CCN Day
            payments clearer, safer, and easier to manage for TP students, stall
            owners, and organisers.
          </p>
        </div>

        <div className="benefits-list">
          <div className="benefit-row">
            <div className="benefit-icon benefit-icon-blue">
              <img
                src={SecurePayments}
                alt="Secure payments icon"
                className="benefit-icon-image"
              />
            </div>

            <div>
              <h3>Secure payments</h3>
              <p>
                Payments are confirmed through MetaMask, reducing manual
                handling and improving trust between customers and stall owners.
              </p>
            </div>
          </div>

          <div className="benefit-row">
            <div className="benefit-icon benefit-icon-purple">
              <img
                src={TransparentRecords}
                alt="Transparent records icon"
                className="benefit-icon-image"
              />
            </div>

            <div>
              <h3>Transparent records</h3>
              <p>
                Payments, refunds, and withdrawals can be tracked clearly,
                making the carnival payment flow more accountable.
              </p>
            </div>
          </div>

          <div className="benefit-row">
            <div className="benefit-icon benefit-icon-pink">
              <img
                src={Decentralisation}
                alt="Decentralisation icon"
                className="benefit-icon-image"
              />
            </div>

            <div>
              <h3>Decentralisation</h3>
              <p>
                Payments, refunds, and withdrawals are all done in the
                blockchain, reducing single point of failure and improving
                trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <p className="section-label">Features</p>
        <h2>Dont worry, We did not forget about you!</h2>

        <div className="feature-card-grid">
          <div className="role-card role-card-featured">
            <div className="role-card-header">
              <span className="role-card-title">Stall Owners</span>
              <span className="role-card-highlight">Manage</span>
            </div>

            <p className="role-card-desc">
              Tools for approved stall owners to manage products, payments, and
              refunds.
            </p>

            <ul className="role-card-list">
              <li>
                <span className="role-check">✓</span>
                Apply for a CCN stall
              </li>
              <li>
                <span className="role-check">✓</span>
                List stall products
              </li>
              <li>
                <span className="role-check">✓</span>
                Issue refunds and withdraw funds
              </li>
            </ul>
          </div>

          <div className="role-card role-card-featured">
            <div className="role-card-header">
              <span className="role-card-title">Organisers</span>
              <span className="role-card-highlight">Control</span>
            </div>

            <p className="role-card-desc">
              Admin features to keep CCN Day payments structured and
              transparent.
            </p>

            <ul className="role-card-list">
              <li>
                <span className="role-check">✓</span>
                Approve stall applications
              </li>
              <li>
                <span className="role-check">✓</span>
                Manage CCN settings
              </li>
              <li>
                <span className="role-check">✓</span>
                Enable withdrawal processing
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>CareLink — Built for TP CCN day</p>
        <p>Made with ❤️ by Jerrill 2404219D</p>
      </footer>
    </main>
  );
};

export default LandingPage;
