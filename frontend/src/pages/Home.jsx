import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Home.css";
import {
  finishGame,
  getGameSceneUrl,
  getLeaderboard,
  startGame,
  submitScore,
  validateClick,
} from "../services/api";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.2;

function Home({ user, onRequireAuth }) {
  const storedToken = localStorage.getItem("token") || "";
  const isLoggedIn = Boolean(user);

  const [gameId, setGameId] = useState(null);
  const [sceneUrl, setSceneUrl] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasFoundWaldo, setHasFoundWaldo] = useState(false);
  const [resultPulse, setResultPulse] = useState(null);
  const [isValidatingClick, setIsValidatingClick] = useState(false);
  const [completedTimeTaken, setCompletedTimeTaken] = useState(null);
  const [isCompletingGame, setIsCompletingGame] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });

  const imageRef = useRef(null);

  const canPan = scale > 1;
  const imageCursor = useMemo(() => {
    if (isDragging) {
      return "grabbing";
    }

    return canPan ? "grab" : "crosshair";
  }, [canPan, isDragging]);

  const clampScale = (nextScale) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));

  const clearRuntimeState = () => {
    setElapsedSeconds(0);
    setHasFoundWaldo(false);
    setResultPulse(null);
    setCompletedTimeTaken(null);
    setIsCompletingGame(false);
    setIsSubmittingScore(false);
    setHasSubmittedScore(false);
    setErrorMessage("");
    setScale(1);
    setTranslate({ x: 0, y: 0 });
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
      setSceneUrl(getGameSceneUrl(session.gameId));
    } catch {
      setErrorMessage("Failed to start game session.");
    }
  }, []);

  const handleImageMouseDown = (event) => {
    if (!canPan) {
      return;
    }

    setIsDragging(true);
    setDragOrigin({
      x: event.clientX - translate.x,
      y: event.clientY - translate.y,
    });
  };

  const handleImageMouseMove = (event) => {
    if (!isDragging || !canPan) {
      return;
    }

    setTranslate({
      x: event.clientX - dragOrigin.x,
      y: event.clientY - dragOrigin.y,
    });
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheelZoom = (event) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    const nextScale = clampScale(scale + direction * ZOOM_STEP);

    if (nextScale === MIN_SCALE) {
      setTranslate({ x: 0, y: 0 });
    }

    setScale(nextScale);
  };

  const handleImageClick = async (event) => {
    if (!gameId) {
      setErrorMessage("Game session is not ready. Please wait...");
      return;
    }

    if (hasFoundWaldo || completedTimeTaken !== null || isValidatingClick) {
      return;
    }

    if (isDragging) {
      return;
    }

    if (!imageRef.current) {
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
    setErrorMessage("");

    setIsValidatingClick(true);

    try {
      const result = await validateClick({
        gameId,
        x: nextPosition.x,
        y: nextPosition.y,
      });

      if (result.success) {
        setHasFoundWaldo(true);
        setResultPulse({
          x: nextPosition.x,
          y: nextPosition.y,
          status: "correct",
          key: Date.now(),
        });
        setErrorMessage("");
      } else {
        setResultPulse({
          x: nextPosition.x,
          y: nextPosition.y,
          status: "miss",
          key: Date.now(),
        });
        setErrorMessage("Not a match. Try another spot.");
      }
    } catch (error) {
      setErrorMessage(error.message || "Validation failed");
    } finally {
      setIsValidatingClick(false);
    }
  };

  useEffect(() => {
    const finishCurrentGame = async () => {
      if (!gameId || !hasFoundWaldo || isCompletingGame) {
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
  }, [gameId, hasFoundWaldo, isCompletingGame]);

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
    return () => {
      setIsDragging(false);
    };
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
            Find Waldo in the chaos. Zoom with your wheel, pan by dragging when zoomed.
          </p>
        </div>

        <div className="hud__right">
          <span className="badge">⏱ Timer: {elapsedSeconds}s</span>
          <span className="badge">🔎 Found: {hasFoundWaldo ? "1/1" : "0/1"}</span>
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

          <section
            className="scene-frame"
            onWheel={handleWheelZoom}
          >
            <img
              ref={imageRef}
              src={sceneUrl}
              alt="Where is Waldo game"
              onClick={handleImageClick}
              onMouseDown={handleImageMouseDown}
              onMouseMove={handleImageMouseMove}
              onMouseUp={handleImageMouseUp}
              onMouseLeave={handleImageMouseUp}
              draggable={false}
              className="scene-image"
              style={{
                cursor: imageCursor,
                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              }}
            />

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
