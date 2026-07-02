import React from "react";
import "./CareLinkCard.css";

const CareLinkCard = () => {
  return (
    <div className="care-card-wrap" aria-label="CareLink payment card preview">
      <div className="care-card">
        <div className="care-card__info">
          <div className="care-card__logo">CareLink</div>

          <div className="care-card__chip">
            <svg
              className="care-card__chip-lines"
              role="img"
              width="20"
              height="20"
              viewBox="0 0 100 100"
              aria-label="Chip"
            >
              <g opacity="0.85">
                <polyline
                  points="0,50 35,50"
                  fill="none"
                  stroke="#12162a"
                  strokeWidth="3"
                />
                <polyline
                  points="0,20 20,20 35,35"
                  fill="none"
                  stroke="#12162a"
                  strokeWidth="3"
                />
                <polyline
                  points="50,0 50,35"
                  fill="none"
                  stroke="#12162a"
                  strokeWidth="3"
                />
                <polyline
                  points="65,35 80,20 100,20"
                  fill="none"
                  stroke="#12162a"
                  strokeWidth="3"
                />
                <polyline
                  points="100,50 65,50"
                  fill="none"
                  stroke="#12162a"
                  strokeWidth="3"
                />
                <polyline
                  points="35,35 65,35 65,65 35,65 35,35"
                  fill="none"
                  stroke="#12162a"
                  strokeWidth="3"
                />
                <polyline
                  points="0,80 20,80 35,65"
                  fill="none"
                  stroke="#12162a"
                  strokeWidth="3"
                />
                <polyline
                  points="50,100 50,65"
                  fill="none"
                  stroke="#12162a"
                  strokeWidth="3"
                />
                <polyline
                  points="65,65 80,80 100,80"
                  fill="none"
                  stroke="#12162a"
                  strokeWidth="3"
                />
              </g>
            </svg>

            <div className="care-card__chip-texture"></div>
          </div>

          <div className="care-card__type">Ethereum</div>

          <div className="care-card__number">
            <span className="care-card__digit-group">0x8A</span>
            <span className="care-card__digit-group">369F</span>
            <span className="care-card__digit-group">31J8</span>
            <span className="care-card__digit-group">R828</span>
          </div>

          <div className="care-card__bottom-row">
            <div className="care-card__name" aria-label="TP CCN Carnival">
              TP CCN Day
            </div>

            <div className="care-card__valid-thru" aria-label="CCN Day">
              CCN
              <br />
              Day
            </div>

            <div className="care-card__exp-date">
              <time dateTime="2026-07-03">03/07</time>
            </div>
          </div>

          <div className="care-card__texture"></div>
        </div>
      </div>
    </div>
  );
};

export default CareLinkCard;
