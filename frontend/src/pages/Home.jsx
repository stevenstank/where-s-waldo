import { useEffect, useRef, useState } from "react";
import gameImage from "../assets/game-image.svg";
import {
  finishGame,
  getLeaderboard,
  startGame,
  submitScore,
  validateClick,
} from "../services/api";

const ALL_CHARACTERS = ["Waldo", "Wizard", "Wilma"];

function Home() {
  const storedToken =
    localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  const isLoggedIn = Boolean(storedToken);

  const [gameId, setGameId] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [targetBox, setTargetBox] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState("");
  const [markers, setMarkers] = useState([]);
  const [foundCharacters, setFoundCharacters] = useState([]);
  const [completedTimeTaken, setCompletedTimeTaken] = useState(null);
  const [isCompletingGame, setIsCompletingGame] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const imageAreaRef = useRef(null);

  const loadLeaderboard = async () => {
    const scores = await getLeaderboard();
    setLeaderboard(scores);
  };

  const handleSubmitScore = async (overrideName) => {
    if (!gameId || completedTimeTaken === null || isSubmittingScore || hasSubmittedScore) {
      return;
    }

    const submissionName = overrideName || guestName.trim();

    if (!isLoggedIn && !submissionName) {
      setErrorMessage("Please enter your name to submit score.");
      return;
    }

    setIsSubmittingScore(true);
    setErrorMessage("");

    try {
      await submitScore({
        gameId,
        timeTaken: completedTimeTaken,
        name: isLoggedIn ? undefined : submissionName,
        token: storedToken || undefined,
      });
      setHasSubmittedScore(true);
      await loadLeaderboard();
    } catch (error) {
      setErrorMessage(error.message || "Failed to submit score.");
    } finally {
      setIsSubmittingScore(false);
    }
  };

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

    if (foundCharacters.includes(characterName)) {
      setErrorMessage(`${characterName} is already found.`);
      setTargetBox(null);
      setSelectedCharacter("");
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
        setFoundCharacters((prev) => [...prev, characterName]);
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
    const finishCurrentGame = async () => {
      if (!gameId || foundCharacters.length !== ALL_CHARACTERS.length || isCompletingGame) {
        return;
      }

      setIsCompletingGame(true);
      try {
        const result = await finishGame(gameId);
        setCompletedTimeTaken(result.timeTaken);
      } catch (error) {
        setErrorMessage(error.message || "Failed to finish game.");
      } finally {
        setIsCompletingGame(false);
      }
    };

    finishCurrentGame();
  }, [foundCharacters, gameId, isCompletingGame]);

  useEffect(() => {
    if (completedTimeTaken === null || !isLoggedIn || hasSubmittedScore) {
      return;
    }

    handleSubmitScore();
  }, [completedTimeTaken, hasSubmittedScore, isLoggedIn]);

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

  useEffect(() => {
    if (!gameId) {
      return undefined;
    }

    const startedAt = Date.now();
    const intervalId = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsedSeconds(seconds);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [gameId]);

  return (
    <main style={{ padding: "24px" }}>
      <h1>Where is Waldo</h1>

      {completedTimeTaken !== null ? (
        <section
          style={{
            marginBottom: "16px",
            padding: "16px",
            border: "2px solid #147a35",
            borderRadius: "8px",
            background: "#e8f7ec",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Game Completed!</h2>
          <p>Final Time: {completedTimeTaken.toFixed(2)}s</p>

          {!isLoggedIn && !hasSubmittedScore ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Enter your name"
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
              <button
                type="button"
                onClick={() => handleSubmitScore()}
                disabled={isSubmittingScore}
              >
                {isSubmittingScore ? "Submitting..." : "Submit Score"}
              </button>
            </div>
          ) : null}

          {isLoggedIn && !hasSubmittedScore ? (
            <p>{isSubmittingScore ? "Submitting score..." : "Submitting score automatically..."}</p>
          ) : null}

          {hasSubmittedScore ? <p>Score submitted successfully.</p> : null}

          {leaderboard.length > 0 ? (
            <section>
              <h3>Leaderboard</h3>
              <ol style={{ margin: 0, paddingLeft: "20px" }}>
                {leaderboard.map((entry, index) => (
                  <li key={`${entry.name}-${entry.timeTaken}-${index}`}>
                    {entry.name} - {entry.timeTaken}s
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </section>
      ) : null}

      <p style={{ marginBottom: "12px" }}>Timer: {elapsedSeconds}s</p>
      <p style={{ marginBottom: "12px" }}>
        Found: {foundCharacters.join(", ") || "None"}
      </p>
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
              {ALL_CHARACTERS.map((character) => (
                <option
                  key={character}
                  value={character}
                  disabled={foundCharacters.includes(character)}
                >
                  {character}
                </option>
              ))}
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
