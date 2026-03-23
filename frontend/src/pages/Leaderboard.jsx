import { useEffect, useState } from "react";
import { getLeaderboard } from "../services/api";

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
    <main style={{ padding: "24px" }}>
      <h1>Leaderboard</h1>
      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}
      {rows.length > 0 ? (
        <ol style={{ paddingLeft: "20px" }}>
          {rows.map((entry, index) => (
            <li key={`${entry.name}-${entry.timeTaken}-${index}`}>
              {entry.name} - {entry.timeTaken}s
            </li>
          ))}
        </ol>
      ) : (
        <p>No scores yet.</p>
      )}
    </main>
  );
}

export default Leaderboard;
