const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { normalizeUsername, validateUsername } = require("../utils/identity");

const register = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      throw new ApiError(400, "username and password are required");
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      throw new ApiError(400, usernameError);
    }

    if (password.length < 6) {
      throw new ApiError(400, "password must be at least 6 characters");
    }

    const cleanedUsername = username.trim();
    const usernameNormalized = normalizeUsername(cleanedUsername);

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ usernameNormalized }, { username: cleanedUsername }],
      },
    });

    if (existingUser) {
      throw new ApiError(409, "username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: cleanedUsername,
        usernameNormalized,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      throw new ApiError(400, "username and password are required");
    }

    if (!process.env.JWT_SECRET) {
      throw new ApiError(500, "JWT secret is not configured");
    }

    const cleanedUsername = username.trim();
    const usernameNormalized = normalizeUsername(cleanedUsername);

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ usernameNormalized }, { username: cleanedUsername }],
      },
    });

    if (!user) {
      throw new ApiError(401, "invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new ApiError(401, "invalid credentials");
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({ token });
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, "unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "user not found");
    }

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  me,
};
