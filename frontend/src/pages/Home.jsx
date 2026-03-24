import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Home.css";
import {
  getLeaderboard,
  startGame,
  submitScore,
  validateClick,
} from "../services/api";

function Home({ user, onRequireAuth }) {
  const isLoggedIn = Boolean(user);

  const [gameId, setGameId] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [foundTargets, setFoundTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [isSceneLoading, setIsSceneLoading] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [resultPulse, setResultPulse] = useState(null);
  const [isValidatingClick, setIsValidatingClick] = useState(false);
  const [completedTimeTaken, setCompletedTimeTaken] = useState(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [scoreShareUrl, setScoreShareUrl] = useState("");
  const [didCopyShareUrl, setDidCopyShareUrl] = useState(false);

  const imageRef = useRef(null);

  const playTone = useCallback((frequency, duration) => {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gainNode.gain.setValueAtTime(0.08, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);

    oscillator.onended = () => {
      context.close();
    };
  }, []);

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
    setScoreShareUrl("");
    setDidCopyShareUrl(false);
  };

  const loadLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    try {
      const rows = await getLeaderboard();
      setLeaderboardRows(rows?.rows || []);
      setLeaderboardError("");
    } catch (error) {
      setLeaderboardError(error.message || "Failed to load leaderboard.");
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, []);

  const startNewGame = useCallback(async () => {
    clearRuntimeState();
    setIsStartingGame(true);
    try {
      const session = await startGame();
      setGameId(session.gameId);
      setCurrentLevel(session.currentLevel || null);
      setFoundTargets(session.currentLevel?.foundTargets || []);
      setSelectedTarget(session.currentLevel?.targets?.[0] || "");
      setIsSceneLoading(true);
    } catch {
      setErrorMessage("Failed to start game session.");
    } finally {
      setIsStartingGame(false);
    }
  }, []);

  const handleImageClick = useCallback(async (event) => {
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
        playTone(740, 0.14);
        setResultPulse({
          x: point.pulseXPercent,
          y: point.pulseYPercent,
          status: "correct",
          key: Date.now(),
        });
        setFoundTargets(result.foundTargets || []);

        if (result.gameCompleted && typeof result.timeTaken === "number") {
          playTone(880, 0.2);
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
        playTone(240, 0.1);
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
  }, [completedTimeTaken, gameId, getImageRelativePoint, isValidatingClick, loadLeaderboard, playTone, selectedTarget, currentLevel]);

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
        });
        setHasSubmittedScore(true);
        setScoreShareUrl(`${window.location.origin}/leaderboard?game=${gameId}`);
        await loadLeaderboard();
      } catch (error) {
        setErrorMessage(error.message || "Failed to submit score.");
      } finally {
        setIsSubmittingScore(false);
      }
    };

    submitLoggedInScore();
  }, [completedTimeTaken, gameId, hasSubmittedScore, isLoggedIn, isSubmittingScore, loadLeaderboard]);

  const handleCopyShareLink = useCallback(async () => {
    if (!scoreShareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(scoreShareUrl);
      setDidCopyShareUrl(true);
    } catch {
      setErrorMessage("Could not copy share link.");
    }
  }, [scoreShareUrl]);

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
            {isStartingGame ? "Starting..." : gameId ? "Restart Game" : "Start Game"}
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

              {hasSubmittedScore && scoreShareUrl ? (
                <div className="completion-login-note">
                  <button className="button-secondary" type="button" onClick={handleCopyShareLink}>
                    {didCopyShareUrl ? "Copied!" : "Copy Share Link"}
                  </button>
                </div>
              ) : null}
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
          {isLoadingLeaderboard ? <p className="empty-state">Loading leaderboard...</p> : null}
          {leaderboardError ? <p className="error-text">{leaderboardError}</p> : null}
          {!isLoadingLeaderboard && leaderboardRows.length === 0 ? <p className="empty-state">No scores yet.</p> : null}

          {leaderboardRows.length > 0 ? (
            <ol className="mini-leaderboard">
              {leaderboardRows.slice(0, 10).map((entry, index) => (
                <li key={entry.id || `${entry.name}-${entry.timeTaken}-${index}`} className="mini-leaderboard__row">
                  <span className={`rank rank-${Math.min(index + 1, 3)}`}>#{entry.rank || index + 1}</span>
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
