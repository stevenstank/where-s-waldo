require("dotenv").config();

const prisma = require("../config/prisma");
const { normalizeUsername, validateUsername, createGuestName } = require("../utils/identity");

const sanitizeUsername = (username, userId, usedNormalized) => {
  const trimmed = String(username || "").trim();
  let candidate = trimmed;

  if (validateUsername(candidate)) {
    candidate = `Player_${userId.slice(0, 6)}`;
  }

  let normalized = normalizeUsername(candidate);
  let attempts = 0;

  while (usedNormalized.has(normalized) && attempts < 100) {
    attempts += 1;
    candidate = `${candidate.slice(0, 15)}${attempts}`;
    normalized = normalizeUsername(candidate);
  }

  usedNormalized.add(normalized);

  return {
    username: candidate,
    usernameNormalized: normalized,
  };
};

const cleanUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      usernameNormalized: true,
    },
    orderBy: { username: "asc" },
  });

  const usedNormalized = new Set();
  let updatedCount = 0;

  for (const user of users) {
    const next = sanitizeUsername(user.username, user.id, usedNormalized);
    if (user.username !== next.username || user.usernameNormalized !== next.usernameNormalized) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          username: next.username,
          usernameNormalized: next.usernameNormalized,
        },
      });
      updatedCount += 1;
    }
  }

  return updatedCount;
};

const cleanScores = async () => {
  const [guestScores, registeredScores] = await Promise.all([
    prisma.score.findMany({
      where: { userId: null },
      select: { id: true, gameId: true, name: true },
    }),
    prisma.score.findMany({
      where: { userId: { not: null } },
      select: { id: true, name: true },
    }),
  ]);

  let updatedCount = 0;

  for (const score of guestScores) {
    const nextGuestName = createGuestName(score.gameId);
    if (score.name !== nextGuestName) {
      await prisma.score.update({
        where: { id: score.id },
        data: { name: nextGuestName },
      });
      updatedCount += 1;
    }
  }

  for (const score of registeredScores) {
    if (score.name !== null) {
      await prisma.score.update({
        where: { id: score.id },
        data: { name: null },
      });
      updatedCount += 1;
    }
  }

  return updatedCount;
};

const main = async () => {
  const userUpdates = await cleanUsers();
  const scoreUpdates = await cleanScores();

  console.log(`Cleaned users: ${userUpdates}`);
  console.log(`Cleaned scores: ${scoreUpdates}`);
};

main()
  .catch((error) => {
    console.error("Identity cleanup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
