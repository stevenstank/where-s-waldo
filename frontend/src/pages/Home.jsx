import { useState } from "react";
import gameImage from "../assets/game-image.svg";

function Home() {
  const [, setClickPosition] = useState({ x: null, y: null });

  const handleImageClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const x = Number(((clickX / rect.width) * 100).toFixed(2));
    const y = Number(((clickY / rect.height) * 100).toFixed(2));

    const nextPosition = {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };

    setClickPosition(nextPosition);
    console.log("Click coordinates (%):", nextPosition);
  };

  return (
    <main style={{ padding: "24px" }}>
      <h1>Where is Waldo</h1>
      <img
        src={gameImage}
        alt="Where is Waldo game"
        onClick={handleImageClick}
        style={{
          width: "100%",
          maxWidth: "1200px",
          display: "block",
          cursor: "crosshair",
        }}
      />
    </main>
  );
}

export default Home;
