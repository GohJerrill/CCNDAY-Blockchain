import React from "react";

const LandingPage = () => {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-content">
          <p className="landing-badge">TP CCN Carnival 2026</p>

          <h1>Blockchain-powered payments for CCN Day.</h1>

          <p className="landing-description">
            A smart contract platform for TP students and staff to register,
            discover stalls, make Sepolia ETH payments, handle refunds, and
            manage stall withdrawals transparently.
          </p>

          <div className="landing-actions">
            <button type="button" className="primary-button">
              Get Started
            </button>

            <button type="button" className="secondary-button">
              Learn More
            </button>
          </div>
        </div>

        <div className="landing-image-wrapper"></div>
      </section>
    </main>
  );
};

export default LandingPage;
