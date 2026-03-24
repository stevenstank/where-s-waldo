const RAW_API_URL = (import.meta.env.VITE_API_URL || "").trim();
const BASE_URL = RAW_API_URL.replace(/\/+$/, "");
const TOKEN_KEY = "accessToken";

if (import.meta.env.PROD && !BASE_URL) {
  console.error("VITE_API_URL is not set in production. API calls may fail.");
}

const toApiUrl = (path) => `${BASE_URL}${path}`;

const getStoredToken = () => localStorage.getItem(TOKEN_KEY) || "";

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getAuthToken = () => getStoredToken();

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json")
    ? response.json()
    : response.text();
};

const request = async (url, options = {}) => {
  const token = getStoredToken();

  const { skipAuthRefresh = false, ...fetchOptions } = options;

  let response;

  try {
    response = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(fetchOptions.headers || {}),
      },
      ...fetchOptions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`Network error: ${message}. Check CORS and VITE_API_URL settings.`);
  }

  if (response.status === 401 && !skipAuthRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(url, {
        ...options,
        skipAuthRefresh: true,
      });
    }
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && data.message
        ? data.message
        : "Request failed";
    throw new Error(message);
  }

  return data;
};

const refreshAccessToken = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      setAuthToken("");
      return false;
    }

    const data = await parseResponse(response);
    if (!data?.accessToken) {
      setAuthToken("");
      return false;
    }

    setAuthToken(data.accessToken);
    return true;
  } catch {
    setAuthToken("");
    return false;
  }
};

export const startGame = async () =>
  request(toApiUrl("/api/game/start"));

export const getGameState = async (gameId) => request(toApiUrl(`/api/game/${gameId}/state`));

export const getGameSceneUrl = (gameId) => toApiUrl(`/api/game/${gameId}/scene.svg`);

export const validateClick = async ({ gameId, positionId, x, y }) =>
  request(toApiUrl("/api/validate"), {
    method: "POST",
    body: JSON.stringify({ gameId, positionId, x, y }),
  });

export const finishGame = async (gameId) =>
  request(toApiUrl("/api/game/finish"), {
    method: "POST",
    body: JSON.stringify({ gameId }),
  });

export const submitScore = async ({ gameId }) =>
  request(toApiUrl("/api/score"), {
    method: "POST",
    body: JSON.stringify({ gameId }),
  });

export const login = async ({ username, password }) =>
  request(toApiUrl("/api/auth/login"), {
    method: "POST",
    skipAuthRefresh: true,
    body: JSON.stringify({ username, password }),
  });

export const register = async ({ username, password }) =>
  request(toApiUrl("/api/auth/register"), {
    method: "POST",
    skipAuthRefresh: true,
    body: JSON.stringify({ username, password }),
  });

export const logout = async () => {
  setAuthToken("");
  return request(toApiUrl("/api/auth/logout"), {
    method: "POST",
    skipAuthRefresh: true,
    body: JSON.stringify({}),
  });
};

export const getCurrentUser = async () => request(toApiUrl("/api/auth/me"));

export const getLeaderboard = async () => request(toApiUrl("/api/leaderboard"));

export const getLeaderboardPage = async ({ page = 1, pageSize = 10 } = {}) =>
  request(toApiUrl(`/api/leaderboard?page=${page}&pageSize=${pageSize}`));

export { BASE_URL };
