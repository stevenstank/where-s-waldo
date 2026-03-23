const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");

const SVG_WIDTH = 1800;
const SVG_HEIGHT = 1200;
const CROWD_COUNT = 900;

const randomPercent = (min, max) => Number((Math.random() * (max - min) + min).toFixed(2));

const hashStringToInt = (input) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
};

const createSeededRng = (seedText) => {
  let seed = hashStringToInt(seedText);
  return () => {
    seed = (1664525 * seed + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
};

const buildCrowdSvg = ({ gameId, waldoX, waldoY }) => {
  const rng = createSeededRng(gameId);
  const crowd = [];

  for (let i = 0; i < CROWD_COUNT; i += 1) {
    const x = Math.floor(rng() * SVG_WIDTH);
    const y = Math.floor(rng() * SVG_HEIGHT);
    const r = Math.floor(rng() * 120) + 80;
    const g = Math.floor(rng() * 120) + 80;
    const b = Math.floor(rng() * 120) + 80;
    const size = Math.floor(rng() * 6) + 5;

    crowd.push(`<circle cx="${x}" cy="${y}" r="${size}" fill="rgb(${r},${g},${b})" />`);
    crowd.push(`<rect x="${x - size * 0.4}" y="${y + size * 0.6}" width="${size * 0.8}" height="${size * 1.5}" fill="rgb(${Math.max(r - 20, 0)},${Math.max(g - 20, 0)},${Math.max(b - 20, 0)})" />`);
  }

  const wx = (waldoX / 100) * SVG_WIDTH;
  const wy = (waldoY / 100) * SVG_HEIGHT;
  const waldoScale = 0.75;

  const waldo = [
    `<g transform="translate(${wx.toFixed(1)} ${wy.toFixed(1)}) scale(${waldoScale})">`,
    '<circle cx="0" cy="-11" r="6" fill="#f2d1b3" />',
    '<rect x="-6" y="-6" width="12" height="3" fill="#d21d2b" />',
    '<rect x="-6" y="-3" width="12" height="3" fill="#ffffff" />',
    '<rect x="-5" y="0" width="10" height="10" fill="#d21d2b" />',
    '<rect x="-5" y="4" width="10" height="2" fill="#ffffff" />',
    '<rect x="-4" y="10" width="3" height="8" fill="#2a58a2" />',
    '<rect x="1" y="10" width="3" height="8" fill="#2a58a2" />',
    '</g>',
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-label="Crowded search scene">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d6edf6" />
      <stop offset="100%" stop-color="#f5ecd6" />
    </linearGradient>
  </defs>
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="url(#bg)" />
  ${crowd.join("")}
  ${waldo}
</svg>`;
};

const startGame = async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new ApiError(401, "invalid token user");
      }
    }

    const game = await prisma.game.create({
      data: {
        startTime: new Date(),
        userId,
        waldoX: randomPercent(5, 95),
        waldoY: randomPercent(5, 95),
        waldoTolerance: 2.2,
      },
    });

    return res.status(201).json({ gameId: game.id });
  } catch (error) {
    return next(error);
  }
};

const finishGame = async (req, res, next) => {
  try {
    const { gameId } = req.body;

    if (!gameId || typeof gameId !== "string") {
      throw new ApiError(400, "gameId is required");
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        completed: true,
      },
    });

    if (!game) {
      throw new ApiError(404, "game not found");
    }

    if (game.completed) {
      throw new ApiError(400, "game already completed");
    }

    const endTime = new Date();

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        endTime,
        completed: true,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        completed: true,
      },
    });

    const timeTaken = (updatedGame.endTime.getTime() - updatedGame.startTime.getTime()) / 1000;

    return res.status(200).json({ timeTaken });
  } catch (error) {
    return next(error);
  }
};

const getGameScene = async (req, res, next) => {
  try {
    const { gameId } = req.params;

    if (!gameId || typeof gameId !== "string") {
      throw new ApiError(400, "gameId is required");
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        waldoX: true,
        waldoY: true,
      },
    });

    if (!game) {
      throw new ApiError(404, "game not found");
    }

    const svg = buildCrowdSvg({
      gameId: game.id,
      waldoX: game.waldoX,
      waldoY: game.waldoY,
    });

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(svg);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  startGame,
  finishGame,
  getGameScene,
};
