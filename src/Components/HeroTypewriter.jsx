import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./HeroTypewriter.css";

const HeroTypewriter = () => {
  const toRotate = useMemo(
    () => ["Hassle Free Transactions", "Enhanced Security", "CCN Day"],
    [],
  );

  const [loopNumber, setLoopNumber] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [text, setText] = useState("");
  const [delta, setDelta] = useState(110);

  const period = 1000;

  const tick = useCallback(() => {
    const currentIndex = loopNumber % toRotate.length;
    const fullText = toRotate[currentIndex];

    const updatedText = isDeleting
      ? fullText.substring(0, text.length - 1)
      : fullText.substring(0, text.length + 1);

    setText(updatedText);

    if (isDeleting) {
      setDelta((prev) => Math.max(35, prev / 1.5));
    }

    if (!isDeleting && updatedText === fullText) {
      setIsDeleting(true);
      setDelta(period);
    } else if (isDeleting && updatedText === "") {
      setIsDeleting(false);
      setLoopNumber((prev) => prev + 1);
      setDelta(110);
    }
  }, [loopNumber, isDeleting, text, toRotate]);

  useEffect(() => {
    const ticker = setTimeout(tick, delta);
    return () => clearTimeout(ticker);
  }, [tick, delta]);

  return (
    <span className="hero-typewriter">
      {text}
      <span className="typewriter-cursor">|</span>
    </span>
  );
};

export default HeroTypewriter;