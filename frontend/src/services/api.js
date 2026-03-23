const BASE_URL = import.meta.env.VITE_API_URL;

const request = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && data.message
        ? data.message
        : "Request failed";
    throw new Error(message);
  }

  return data;
};

const withToken = (token) =>
  token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};

export const startGame = async (token) =>
  request("/api/game/start", {
    method: "POST",
    headers: withToken(token),
    body: JSON.stringify({}),
  });

export const validateClick = async ({ gameId, characterName, x, y }) =>
  request("/api/validate", {
    method: "POST",
    body: JSON.stringify({ gameId, characterName, x, y }),
  });

export const finishGame = async (gameId) =>
  request("/api/game/finish", {
    method: "POST",
    body: JSON.stringify({ gameId }),
  });

export const submitScore = async ({ gameId, timeTaken, name, token }) =>
  request("/api/score", {
    method: "POST",
    headers: withToken(token),
    body: JSON.stringify({ gameId, timeTaken, name }),
  });

export const login = async ({ username, password }) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const register = async ({ username, password }) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const getLeaderboard = async () => request("/api/leaderboard");

export { BASE_URL };
