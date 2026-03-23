import { useEffect, useRef, useState } from "react";
import gameImage from "../assets/game-image.svg";

function Home() {
  const [targetBox, setTargetBox] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState("Waldo");
  const imageAreaRef = useRef(null);

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

    setTargetBox(nextPosition);
    console.log("Click coordinates (%):", nextPosition);
  };

  useEffect(() => {
    const handleDocumentMouseDown = (event) => {
      if (!imageAreaRef.current) {
        return;
      }

      if (!imageAreaRef.current.contains(event.target)) {
        setTargetBox(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, []);

  return (
    <main style={{ padding: "24px" }}>
      <h1>Where is Waldo</h1>
      <div
        ref={imageAreaRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1200px",
          display: "inline-block",
        }}
      >
        <img
          src={gameImage}
          alt="Where is Waldo game"
          onClick={handleImageClick}
          style={{
            width: "100%",
            display: "block",
            cursor: "crosshair",
          }}
        />

        {targetBox ? (
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              left: `${targetBox.x}%`,
              top: `${targetBox.y}%`,
              transform: "translate(-50%, -50%)",
              border: "2px solid #111",
              background: "#fff",
              padding: "6px",
              borderRadius: "6px",
              boxShadow: "0 8px 18px rgba(0, 0, 0, 0.2)",
              zIndex: 2,
            }}
          >
            <select
              value={selectedCharacter}
              onChange={(event) => setSelectedCharacter(event.target.value)}
            >
              <option value="Waldo">Waldo</option>
              <option value="Wizard">Wizard</option>
              <option value="Wilma">Wilma</option>
            </select>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default Home;
