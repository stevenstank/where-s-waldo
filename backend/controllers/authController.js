const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");

const register = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      throw new ApiError(400, "username and password are required");
    }

    if (username.trim().length < 3 || password.length < 6) {
      throw new ApiError(400, "username must be at least 3 chars and password at least 6 chars");
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (existingUser) {
      throw new ApiError(409, "username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
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

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      throw new ApiError(401, "invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new ApiError(401, "invalid credentials");
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status(200).json({ token });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
};
