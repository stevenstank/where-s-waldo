import { useCallback, useEffect, useRef, useState } from "react";
import "./Home.css";
import {
  getLeaderboard,
  startGame,
  submitScore,
  validateClick,
} from "../services/api";

const SCENE_WIDTH = 3000;
const SCENE_HEIGHT = 2000;
const PLACEHOLDER_LEVEL = {
  id: "local-generated",
  slug: "generated-scene",
  name: "Generated Scene",
  orderIndex: 1,
  targets: ["Waldo"],
  foundTargets: [],
};

function Home({ user, onRequireAuth }) {
  const isLoggedIn = Boolean(user);

  const [gameId, setGameId] = useState(null);
  const [gameState, setGameState] = useState("idle");
  const [currentLevel, setCurrentLevel] = useState(null);
  const [waldoPosition, setWaldoPosition] = useState(null);
  const [sceneObjects, setSceneObjects] = useState([]);
  const [foundTargets, setFoundTargets] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [gameStartedAt, setGameStartedAt] = useState(null);
  const [resultPulse, setResultPulse] = useState(null);
  const [isValidatingClick, setIsValidatingClick] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [completedTimeTaken, setCompletedTimeTaken] = useState(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [scoreShareUrl, setScoreShareUrl] = useState("");
  const [didCopyShareUrl, setDidCopyShareUrl] = useState(false);
  const runTokenRef = useRef(0);

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

  const buildSceneObjects = useCallback(() => {
    const count = Math.floor(Math.random() * 400) + 400;
    const shapes = ["circle", "square", "triangle", "block"];
    const generated = [];

    for (let index = 0; index < count; index += 1) {
      const size = Math.floor(Math.random() * 31) + 10;
      const x = Math.floor(Math.random() * (SCENE_WIDTH - size));
      const y = Math.floor(Math.random() * (SCENE_HEIGHT - size));
      const red = Math.floor(Math.random() * 200) + 30;
      const green = Math.floor(Math.random() * 200) + 30;
      const blue = Math.floor(Math.random() * 200) + 30;

      generated.push({
        id: `shape-${index}-${Date.now()}-${Math.random()}`,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        size,
        x,
        y,
        color: `rgb(${red}, ${green}, ${blue})`,
      });
    }

    return generated;
  }, []);

  const getSceneRelativePoint = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    const imageX = Math.round((localX / rect.width) * SCENE_WIDTH);
    const imageY = Math.round((localY / rect.height) * SCENE_HEIGHT);

    return {
      imageX,
      imageY,
      pulseXPercent: (localX / rect.width) * 100,
      pulseYPercent: (localY / rect.height) * 100,
    };
  }, []);

  const clearRuntimeState = useCallback(() => {
    setElapsedSeconds(0);
    setGameStartedAt(null);
    setGameId(null);
    setCurrentLevel(null);
    setWaldoPosition(null);
    setSceneObjects([]);
    setFoundTargets([]);
    setResultPulse(null);
    setIsValidatingClick(false);
    setCompletedTimeTaken(null);
    setIsSubmittingScore(false);
    setHasSubmittedScore(false);
    setErrorMessage("");
    setSuccessMessage("");
    setScoreShareUrl("");
    setDidCopyShareUrl(false);
  }, []);

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
    const runToken = runTokenRef.current + 1;
    runTokenRef.current = runToken;

    clearRuntimeState();
    const generatedScene = buildSceneObjects();
    setSceneObjects(generatedScene);
    setCurrentLevel(PLACEHOLDER_LEVEL);
    const startedAt = Date.now();
    setGameStartedAt(startedAt);
    setGameState("playing");
    setIsStartingGame(true);

    try {
      const session = await startGame();

      if (runTokenRef.current !== runToken) {
        return;
      }

      setGameId(session.gameId);
      setCurrentLevel(session.currentLevel || PLACEHOLDER_LEVEL);
      setWaldoPosition(session.waldoPosition || null);
      setFoundTargets(session.currentLevel?.foundTargets || []);
      setElapsedSeconds(0);
      setGameStartedAt(startedAt);
      setErrorMessage("");
    } catch (error) {
      if (runTokenRef.current !== runToken) {
        return;
      }

      console.error("Failed to start game:", error);
      setErrorMessage("Failed to start game. Try again.");
      setGameStartedAt(null);
      setGameState("error");
    } finally {
      if (runTokenRef.current === runToken) {
        setIsStartingGame(false);
      }
    }
  }, [buildSceneObjects, clearRuntimeState]);

  const handleSceneClick = useCallback(async (event) => {
    if (
      gameState !== "playing"
      || isStartingGame
      || isValidatingClick
      || completedTimeTaken !== null
      || !gameId
      || !waldoPosition
    ) {
      return;
    }

    const point = getSceneRelativePoint(event);

    if (!point) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    setIsValidatingClick(true);
    const activeRunToken = runTokenRef.current;

    try {
      const result = await validateClick({
        gameId,
        positionId: waldoPosition.positionId,
        x: point.imageX,
        y: point.imageY,
      });

      if (runTokenRef.current !== activeRunToken) {
        return;
      }

      if (result.success) {
        playTone(740, 0.14);
        setResultPulse({
          x: point.pulseXPercent,
          y: point.pulseYPercent,
          status: "correct",
          key: Date.now(),
        });
        setFoundTargets(result.foundTargets || ["Waldo"]);

        if (result.gameCompleted && typeof result.timeTaken === "number") {
          playTone(880, 0.2);
          setCompletedTimeTaken(result.timeTaken);
          setElapsedSeconds(Math.floor(result.timeTaken));
          setGameStartedAt(null);
          setSuccessMessage("Waldo found!");
          await loadLeaderboard();
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
          setGameStartedAt(null);
          setErrorMessage("This game has already been completed.");
        } else {
          setErrorMessage("Not a match. Try another spot.");
        }
      }
    } catch (error) {
      if (runTokenRef.current !== activeRunToken) {
        return;
      }

      setErrorMessage(error.message || "Validation failed");
    } finally {
      if (runTokenRef.current === activeRunToken) {
        setIsValidatingClick(false);
      }
    }
  }, [completedTimeTaken, gameId, gameState, getSceneRelativePoint, isStartingGame, isValidatingClick, loadLeaderboard, playTone, waldoPosition]);

  useEffect(() => {
    if (!isLoggedIn || completedTimeTaken === null || hasSubmittedScore) {
      return;
    }

    const submitLoggedInScore = async () => {
      if (!gameId || isSubmittingScore) {
        return;
      }

      const activeRunToken = runTokenRef.current;
      setIsSubmittingScore(true);
      setErrorMessage("");

      try {
        await submitScore({
          gameId,
        });
        if (runTokenRef.current !== activeRunToken) {
          return;
        }
        setHasSubmittedScore(true);
        setScoreShareUrl(`${window.location.origin}/leaderboard?game=${gameId}`);
        await loadLeaderboard();
      } catch (error) {
        if (runTokenRef.current !== activeRunToken) {
          return;
        }
        setErrorMessage(error.message || "Failed to submit score.");
      } finally {
        if (runTokenRef.current === activeRunToken) {
          setIsSubmittingScore(false);
        }
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
    loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    if (!gameStartedAt || completedTimeTaken !== null) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      const seconds = Math.floor((Date.now() - gameStartedAt) / 1000);
      setElapsedSeconds(seconds);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [completedTimeTaken, gameStartedAt]);

  const isInteractionLocked = (
    gameState !== "playing"
    || isStartingGame
    || isValidatingClick
    || completedTimeTaken !== null
    || !gameId
    || !waldoPosition
  );
  const displayedElapsedSeconds = completedTimeTaken !== null
    ? Math.floor(completedTimeTaken)
    : elapsedSeconds;

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
          {gameState === "playing" ? (
            <div className="hud-stats">
              <span className="badge">Timer: {displayedElapsedSeconds}s</span>
              <span className="badge">Level: {currentLevel ? `${currentLevel.orderIndex}` : "-"}</span>
              <span className="badge">Found: {foundTargets.length}/1</span>
            </div>
          ) : null}
          {gameState === "playing" ? (
            <button
              className="button-secondary"
              type="button"
              onClick={startNewGame}
              disabled={isStartingGame}
            >
              {isStartingGame ? "Restarting..." : "Restart"}
            </button>
          ) : null}
        </div>
      </section>

      <section className="game-layout">
        <section className="game-main card">
          {gameState === "idle" ? (
            <section className="completion-card">
              <h2>Ready to play?</h2>
              <p>Start a new game session when you are ready.</p>
              <button className="button-primary" type="button" onClick={startNewGame}>
                Start Game
              </button>
            </section>
          ) : null}

          {gameState === "error" ? (
            <section className="completion-card">
              <p className="error-text">Failed to start game. Try again.</p>
              <button className="button-primary" type="button" onClick={startNewGame}>
                Retry
              </button>
            </section>
          ) : null}

          {gameState === "playing" ? (
            <>
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
                <strong>{currentLevel?.name || "Generated Scene"}</strong>
                <div className="target-selector-wrap">
                  <span>Target: Waldo</span>
                </div>
              </section>

              <section className="scene-frame">
                <div
                  className="generated-scene"
                  onClick={handleSceneClick}
                  style={{ cursor: isInteractionLocked ? "default" : "crosshair" }}
                  role="presentation"
                >
                  {isStartingGame ? (
                    <div className="scene-loading">Starting new game...</div>
                  ) : null}

                  {sceneObjects.map((item) => {
                    const shapeStyle = {
                      left: `${(item.x / SCENE_WIDTH) * 100}%`,
                      top: `${(item.y / SCENE_HEIGHT) * 100}%`,
                      width: `${(item.size / SCENE_WIDTH) * 100}%`,
                      height: `${(item.size / SCENE_HEIGHT) * 100}%`,
                      backgroundColor: item.color,
                    };

                    return (
                      <div
                        key={item.id}
                        className={`scene-shape scene-shape--${item.shape}`}
                        style={shapeStyle}
                      />
                    );
                  })}

                  {waldoPosition ? (
                    <div
                      className="scene-waldo"
                      style={{
                        left: `${(waldoPosition.x / SCENE_WIDTH) * 100}%`,
                        top: `${(waldoPosition.y / SCENE_HEIGHT) * 100}%`,
                        width: `${(waldoPosition.width / SCENE_WIDTH) * 100}%`,
                        height: `${(waldoPosition.height / SCENE_HEIGHT) * 100}%`,
                      }}
                    >
                      <div className="scene-waldo__head">
                        <span className="scene-waldo__glasses" />
                      </div>
                      <div className="scene-waldo__hat" />
                    </div>
                  ) : null}
                </div>

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

              {successMessage ? (
                <p className="success-text">{successMessage}</p>
              ) : null}
            </>
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
