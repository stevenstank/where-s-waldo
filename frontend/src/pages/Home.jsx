import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Home.css";
import {
  getLeaderboard,
  startGame,
  submitScore,
  validateClick,
} from "../services/api";

function Home({ user, onRequireAuth }) {
  const storedToken = localStorage.getItem("token") || "";
  const isLoggedIn = Boolean(user);

  const [gameId, setGameId] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [foundTargets, setFoundTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [isSceneLoading, setIsSceneLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [resultPulse, setResultPulse] = useState(null);
  const [isValidatingClick, setIsValidatingClick] = useState(false);
  const [completedTimeTaken, setCompletedTimeTaken] = useState(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState("");

  const imageRef = useRef(null);

  const remainingTargets = useMemo(() => {
    if (!currentLevel) {
      return [];
    }

    return currentLevel.targets.filter((targetName) => !foundTargets.includes(targetName));
  }, [currentLevel, foundTargets]);

  const getImageRelativePoint = useCallback((event) => {
    const imageElement = imageRef.current;

    if (!imageElement || !currentLevel) {
      return null;
    }

    const rect = imageElement.getBoundingClientRect();
    const naturalWidth = currentLevel.image.width;
    const naturalHeight = currentLevel.image.height;

    if (!naturalWidth || !naturalHeight || rect.width === 0 || rect.height === 0) {
      return null;
    }

    const containScale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
    const renderedWidth = naturalWidth * containScale;
    const renderedHeight = naturalHeight * containScale;
    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;

    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    if (
      localX < offsetX
      || localX > offsetX + renderedWidth
      || localY < offsetY
      || localY > offsetY + renderedHeight
    ) {
      return null;
    }

    const imageX = Math.round((localX - offsetX) * (naturalWidth / renderedWidth));
    const imageY = Math.round((localY - offsetY) * (naturalHeight / renderedHeight));

    return {
      imageX,
      imageY,
      pulseXPercent: (localX / rect.width) * 100,
      pulseYPercent: (localY / rect.height) * 100,
    };
  }, [currentLevel]);

  const clearRuntimeState = () => {
    setElapsedSeconds(0);
    setCurrentLevel(null);
    setFoundTargets([]);
    setSelectedTarget("");
    setIsSceneLoading(false);
    setResultPulse(null);
    setCompletedTimeTaken(null);
    setIsSubmittingScore(false);
    setHasSubmittedScore(false);
    setErrorMessage("");
  };

  const loadLeaderboard = useCallback(async () => {
    try {
      const rows = await getLeaderboard();
      setLeaderboardRows(rows || []);
      setLeaderboardError("");
    } catch (error) {
      setLeaderboardError(error.message || "Failed to load leaderboard.");
    }
  }, []);

  const startNewGame = useCallback(async () => {
    clearRuntimeState();
    try {
      const session = await startGame();
      setGameId(session.gameId);
      setCurrentLevel(session.currentLevel || null);
      setFoundTargets(session.currentLevel?.foundTargets || []);
      setSelectedTarget(session.currentLevel?.targets?.[0] || "");
      setIsSceneLoading(true);
    } catch {
      setErrorMessage("Failed to start game session.");
    }
  }, []);

  const handleImageClick = async (event) => {
    if (!gameId || !currentLevel) {
      setErrorMessage("Game session is not ready. Please wait...");
      return;
    }

    if (completedTimeTaken !== null || isValidatingClick || !selectedTarget) {
      return;
    }

    const point = getImageRelativePoint(event);

    if (!point) {
      return;
    }

    setErrorMessage("");

    setIsValidatingClick(true);

    try {
      const result = await validateClick({
        gameId,
        targetName: selectedTarget,
        x: point.imageX,
        y: point.imageY,
      });

      if (result.success) {
        setResultPulse({
          x: point.pulseXPercent,
          y: point.pulseYPercent,
          status: "correct",
          key: Date.now(),
        });
        setFoundTargets(result.foundTargets || []);

        if (result.gameCompleted && typeof result.timeTaken === "number") {
          setCompletedTimeTaken(result.timeTaken);
          await loadLeaderboard();
        } else if (result.levelCompleted && result.nextLevel) {
          setCurrentLevel(result.nextLevel);
          setFoundTargets(result.nextLevel.foundTargets || []);
          setSelectedTarget(result.nextLevel.targets?.[0] || "");
          setIsSceneLoading(true);
        }

        setErrorMessage("");
      } else {
        setResultPulse({
          x: point.pulseXPercent,
          y: point.pulseYPercent,
          status: "miss",
          key: Date.now(),
        });
        if (result.gameCompleted) {
          setErrorMessage("This game has already been completed.");
        } else {
          setErrorMessage("Not a match. Try another spot.");
        }
      }
    } catch (error) {
      setErrorMessage(error.message || "Validation failed");
    } finally {
      setIsValidatingClick(false);
    }
  };

  useEffect(() => {
    const fallbackTarget = remainingTargets[0] || "";
    if (!selectedTarget || !remainingTargets.includes(selectedTarget)) {
      setSelectedTarget(fallbackTarget);
    }
  }, [remainingTargets, selectedTarget]);

  useEffect(() => {
    if (!isLoggedIn || completedTimeTaken === null || hasSubmittedScore) {
      return;
    }

    const submitLoggedInScore = async () => {
      if (!gameId || isSubmittingScore) {
        return;
      }

      setIsSubmittingScore(true);
      setErrorMessage("");

      try {
        await submitScore({
          gameId,
          timeTaken: completedTimeTaken,
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

    submitLoggedInScore();
  }, [completedTimeTaken, gameId, hasSubmittedScore, isLoggedIn, isSubmittingScore, loadLeaderboard, storedToken]);

  useEffect(() => {
    const initGame = async () => {
      await startNewGame();
      await loadLeaderboard();
    };

    initGame();
  }, [loadLeaderboard, startNewGame]);

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
    <main className="home-page">
      <section className="hud card">
        <div className="hud__left">
          <h1>Where is Waldo</h1>
          <p className="game-subtitle">
            Find each character in the current level. Click inside the scene to validate your pick.
          </p>
        </div>

        <div className="hud__right">
          <span className="badge">⏱ Timer: {elapsedSeconds}s</span>
          <span className="badge">
            🧭 Level: {currentLevel ? `${currentLevel.orderIndex}` : "-"}
          </span>
          <span className="badge">
            🔎 Found: {foundTargets.length}/{currentLevel?.targets?.length || 0}
          </span>
          <button className="button-primary" type="button" onClick={startNewGame}>
            {gameId ? "Restart Game" : "Start Game"}
          </button>
        </div>
      </section>

      <section className="game-layout">
        <section className="game-main card">
          {completedTimeTaken !== null ? (
            <section className="completion-card">
              <h2>Game Completed!</h2>
              <p>Final Time: {completedTimeTaken.toFixed(2)}s</p>

              {!isLoggedIn ? (
                <div className="completion-login-note">
                  <p>You played in guest mode. Log in to save your score.</p>
                  <button className="button-secondary" type="button" onClick={onRequireAuth}>
                    Login to Save
                  </button>
                </div>
              ) : null}

              {isLoggedIn && !hasSubmittedScore ? <p>Submitting score...</p> : null}

              {hasSubmittedScore ? <p>Score submitted successfully.</p> : null}
            </section>
          ) : null}

          <section className="level-toolbar">
            <strong>{currentLevel?.name || "Loading level..."}</strong>
            <div className="target-selector-wrap">
              <label htmlFor="target-selector">Target:</label>
              <select
                id="target-selector"
                className="target-selector"
                value={selectedTarget}
                onChange={(event) => setSelectedTarget(event.target.value)}
                disabled={remainingTargets.length === 0 || completedTimeTaken !== null}
              >
                {remainingTargets.map((targetName) => (
                  <option key={targetName} value={targetName}>
                    {targetName}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="scene-frame">
            <img
              ref={imageRef}
              src={currentLevel?.image?.url || ""}
              alt="Where is Waldo game"
              loading="lazy"
              decoding="async"
              fetchPriority="auto"
              onLoad={() => setIsSceneLoading(false)}
              onClick={handleImageClick}
              draggable={false}
              className="scene-image"
              style={{ cursor: isValidatingClick ? "progress" : "crosshair" }}
            />

            {isSceneLoading ? <div className="scene-loading">Loading high-res level...</div> : null}

            {resultPulse ? (
              <div
                key={resultPulse.key}
                className={`result-pulse result-${resultPulse.status}`}
                style={{ left: `${resultPulse.x}%`, top: `${resultPulse.y}%` }}
              />
            ) : null}
          </section>

          {errorMessage ? (
            <p className="error-text">{errorMessage}</p>
          ) : null}
        </section>

        <aside className="leaderboard-sidebar card">
          <h3>Top Hunters</h3>
          {leaderboardError ? <p className="error-text">{leaderboardError}</p> : null}
          {leaderboardRows.length === 0 ? <p className="empty-state">No scores yet.</p> : null}

          {leaderboardRows.length > 0 ? (
            <ol className="mini-leaderboard">
              {leaderboardRows.slice(0, 10).map((entry, index) => (
                <li key={`${entry.name}-${entry.timeTaken}-${index}`} className="mini-leaderboard__row">
                  <span className={`rank rank-${Math.min(index + 1, 3)}`}>#{index + 1}</span>
                  <span className="mini-leaderboard__name">{entry.name}</span>
                  <span className="mini-leaderboard__meta">
                    <span className={`mini-type-pill ${entry.isGuest ? "mini-type-pill-guest" : "mini-type-pill-auth"}`}>
                      {entry.isGuest ? "Guest" : "Registered"}
                    </span>
                    <span>{entry.timeTaken.toFixed(2)}s</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

export default Home;
