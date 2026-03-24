const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { normalizeUsername, validateUsername } = require("../utils/identity");
const {
  issueAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshCookieOptions,
} = require("../utils/token");

const buildAuthPayload = (user) => {
  const accessToken = issueAccessToken({ userId: user.id, username: user.username });
  const refresh = issueRefreshToken({ userId: user.id });

  return {
    accessToken,
    refresh,
  };
};

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

    const { accessToken, refresh } = buildAuthPayload(user);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        jti: refresh.jti,
        tokenHash: refresh.tokenHash,
        expiresAt: refresh.expiresAt,
      },
    });

    res.cookie("refreshToken", refresh.token, refreshCookieOptions);

    return res.status(201).json({
      user,
      accessToken,
    });
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

    const { accessToken, refresh } = buildAuthPayload(user);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        jti: refresh.jti,
        tokenHash: refresh.tokenHash,
        expiresAt: refresh.expiresAt,
      },
    });

    res.cookie("refreshToken", refresh.token, refreshCookieOptions);

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
      },
      accessToken,
    });
  } catch (error) {
    return next(error);
  }
};

const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new ApiError(401, "refresh token is required");
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, "invalid refresh token");
    }

    if (!payload?.jti || !payload?.userId) {
      throw new ApiError(401, "invalid refresh token payload");
    }

    const tokenHash = hashToken(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: {
        jti: payload.jti,
      },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        revokedAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.tokenHash !== tokenHash) {
      throw new ApiError(401, "refresh token is no longer valid");
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(401, "refresh token expired");
    }

    await prisma.refreshToken.update({
      where: {
        jti: payload.jti,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const nextRefresh = issueRefreshToken({ userId: storedToken.userId });
    await prisma.refreshToken.create({
      data: {
        userId: storedToken.userId,
        jti: nextRefresh.jti,
        tokenHash: nextRefresh.tokenHash,
        expiresAt: nextRefresh.expiresAt,
      },
    });

    const accessToken = issueAccessToken({
      userId: storedToken.user.id,
      username: storedToken.user.username,
    });

    res.cookie("refreshToken", nextRefresh.token, refreshCookieOptions);

    return res.status(200).json({
      accessToken,
      user: storedToken.user,
    });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        if (payload?.jti) {
          await prisma.refreshToken.updateMany({
            where: {
              jti: payload.jti,
            },
            data: {
              revokedAt: new Date(),
            },
          });
        }
      } catch {
        // Ignore invalid refresh token and continue clearing cookie.
      }
    }

    res.clearCookie("refreshToken", refreshCookieOptions);
    return res.status(200).json({ success: true });
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
  refreshSession,
  logout,
  me,
};
