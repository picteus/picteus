import React, { useEffect, useState } from "react";
import style from "./Spinner.module.scss";

export default function Spinner() {
  const spinnerData = {
    interval: 80,
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  };
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prevFrame) =>
        prevFrame + 1 >= spinnerData.frames.length ? 0 : prevFrame + 1,
      );
    }, spinnerData.interval);

    return () => clearInterval(interval);
  }, [spinnerData.frames.length, spinnerData.interval]);

  return (
    <div className={style.spinnerFrames}>
      {spinnerData.frames.map((frame, index) =>
        index === currentFrame ? (
          <span key={index} className="spinner-frame">
            {frame}
          </span>
        ) : null,
      )}
    </div>
  );
}
