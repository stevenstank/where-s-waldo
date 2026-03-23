import { useEffect, useState } from "react";
import { getLeaderboard } from "../services/api";
import "./Leaderboard.css";

function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getLeaderboard();
        setRows(data);
      } catch (loadError) {
        setError(loadError.message || "Failed to load leaderboard");
      }
    };

    load();
  }, []);

  return (
    <main className="leaderboard-page card">
      <h1>Leaderboard</h1>
      {error ? <p className="leaderboard-error">{error}</p> : null}

      {rows.length > 0 ? (
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
                <tr key={`${entry.name}-${entry.timeTaken}-${index}`} className={`rank-row rank-row-${Math.min(index + 1, 3)}`}>
                  <td>#{index + 1}</td>
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
        </div>
      ) : (
        <p className="leaderboard-empty">No scores yet.</p>
      )}
    </main>
  );
}

export default Leaderboard;
