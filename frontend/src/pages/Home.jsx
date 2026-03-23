import { useEffect, useRef, useState } from "react";
import gameImage from "../assets/game-image.svg";
import { startGame, validateClick } from "../services/api";

function Home() {
  const [gameId, setGameId] = useState(null);
  const [targetBox, setTargetBox] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState("");
  const [markers, setMarkers] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const imageAreaRef = useRef(null);

  const handleImageClick = (event) => {
    if (!gameId) {
      setErrorMessage("Game session is not ready. Please wait...");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const x = Number(((clickX / rect.width) * 100).toFixed(2));
    const y = Number(((clickY / rect.height) * 100).toFixed(2));

    const nextPosition = {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };

    setSelectedCharacter("");
    setErrorMessage("");
    setTargetBox(nextPosition);
    console.log("Click coordinates (%):", nextPosition);
  };

  const handleCharacterSelect = async (event) => {
    const characterName = event.target.value;
    setSelectedCharacter(characterName);

    if (!targetBox || !gameId || !characterName) {
      return;
    }

    try {
      const result = await validateClick({
        gameId,
        characterName,
        x: targetBox.x,
        y: targetBox.y,
      });

      if (result.success) {
        setMarkers((prev) => [...prev, { ...targetBox, characterName }]);
        setErrorMessage("");
      } else {
        setErrorMessage("Not a match. Try another spot.");
      }
    } catch (error) {
      setErrorMessage(error.message || "Validation failed");
    } finally {
      setTargetBox(null);
      setSelectedCharacter("");
    }
  };

  useEffect(() => {
    const initGame = async () => {
      try {
        const session = await startGame();
        setGameId(session.gameId);
      } catch (error) {
        setErrorMessage("Failed to start game session.");
      }
    };

    initGame();

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

        {markers.map((marker, index) => (
          <div
            key={`${marker.characterName}-${marker.x}-${marker.y}-${index}`}
            title={marker.characterName}
            style={{
              position: "absolute",
              left: `${marker.x}%`,
              top: `${marker.y}%`,
              transform: "translate(-50%, -50%)",
              width: "14px",
              height: "14px",
              borderRadius: "999px",
              background: "#12a650",
              border: "2px solid #fff",
              boxShadow: "0 0 0 2px #0b5",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        ))}

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
              onChange={handleCharacterSelect}
            >
              <option value="" disabled>
                Select character
              </option>
              <option value="Waldo">Waldo</option>
              <option value="Wizard">Wizard</option>
              <option value="Wilma">Wilma</option>
            </select>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <p style={{ color: "#b00020", marginTop: "12px" }}>{errorMessage}</p>
      ) : null}
    </main>
  );
}

export default Home;
