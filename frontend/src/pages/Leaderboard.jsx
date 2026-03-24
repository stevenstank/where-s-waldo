import { useEffect, useState } from "react";
import { getLeaderboardPage } from "../services/api";
import "./Leaderboard.css";

function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const data = await getLeaderboardPage({
          page,
          pageSize: 10,
        });
        setRows(data.rows || []);
        setHasNextPage(Boolean(data.hasNextPage));
      } catch (loadError) {
        setError(loadError.message || "Failed to load leaderboard");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [page]);

  return (
    <main className="leaderboard-page card">
      <h1>Leaderboard</h1>
      {error ? <p className="leaderboard-error">{error}</p> : null}
      {isLoading ? <p className="leaderboard-empty">Loading scores...</p> : null}

      {!isLoading && rows.length > 0 ? (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Username</th>
                <th>Type</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry, index) => (
                <tr key={entry.id || `${entry.name}-${entry.timeTaken}-${index}`} className={`rank-row rank-row-${Math.min((entry.rank || index + 1), 3)}`}>
                  <td>#{entry.rank || index + 1}</td>
                  <td>{entry.name}</td>
                  <td>
                    <span className={`type-pill ${entry.isGuest ? "type-pill-guest" : "type-pill-auth"}`}>
                      {entry.isGuest ? "Guest" : "Account"}
                    </span>
                  </td>
                  <td>{entry.timeTaken.toFixed(2)}s</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="leaderboard-pagination">
            <button
              type="button"
              className="button-secondary"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              className="button-secondary"
              disabled={!hasNextPage || isLoading}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        !isLoading ? <p className="leaderboard-empty">No scores yet.</p> : null
      )}
    </main>
  );
}

export default Leaderboard;
