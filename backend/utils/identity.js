const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

const normalizeUsername = (rawUsername) => rawUsername.trim().toLowerCase();

const validateUsername = (rawUsername) => {
  if (typeof rawUsername !== "string") {
    return "username is required";
  }

  const username = rawUsername.trim();

  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`;
  }

  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(username)) {
    return "username must start with a letter and use only letters, numbers, or underscores";
  }

  if (/__/.test(username)) {
    return "username cannot include consecutive underscores";
  }

  if (/guest|anonymous|invalidtoken/i.test(username)) {
    return "username contains reserved words";
  }

  if (/\d{5,}/.test(username)) {
    return "username cannot include long numeric sequences";
  }

  return null;
};

const createGuestName = (gameId) => {
  const clean = String(gameId || "").replace(/[^a-zA-Z0-9]/g, "");
  const suffix = (clean.slice(-4) || "0000").toUpperCase();
  return `Guest #${suffix}`;
};

module.exports = {
  normalizeUsername,
  validateUsername,
  createGuestName,
};
