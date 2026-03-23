const BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "token";

const getStoredToken = () => localStorage.getItem(TOKEN_KEY) || "";

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getAuthToken = () => getStoredToken();

const request = async (url, options = {}) => {
  const token = getStoredToken();

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  request(`${BASE_URL}/api/game/start`, {
    method: "POST",
    headers: token ? withToken(token) : undefined,
    body: JSON.stringify({}),
  });

export const getGameSceneUrl = (gameId) => `${BASE_URL}/api/game/${gameId}/scene.svg`;

export const validateClick = async ({ gameId, x, y }) =>
  request(`${BASE_URL}/api/validate`, {
    method: "POST",
    body: JSON.stringify({ gameId, x, y }),
  });

export const finishGame = async (gameId) =>
  request(`${BASE_URL}/api/game/finish`, {
    method: "POST",
    body: JSON.stringify({ gameId }),
  });

export const submitScore = async ({ gameId, timeTaken, name, token }) =>
  request(`${BASE_URL}/api/score`, {
    method: "POST",
    headers: token ? withToken(token) : undefined,
    body: JSON.stringify({ gameId, timeTaken, name }),
  });

export const login = async ({ username, password }) =>
  request(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const register = async ({ username, password }) =>
  request(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const getCurrentUser = async () => request(`${BASE_URL}/api/auth/me`);

export const getLeaderboard = async () => request(`${BASE_URL}/api/leaderboard`);

export { BASE_URL };
