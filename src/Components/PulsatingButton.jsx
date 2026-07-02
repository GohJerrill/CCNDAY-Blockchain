import React from "react";
import "./PulsatingButton.css";

const PulsatingButton = ({
  children = "Connect Wallet",
  onClick,
  type = "button",
}) => {
  return (
    <button type={type} className="pulsating-button" onClick={onClick}>
      {children}
    </button>
  );
};

export default PulsatingButton;
