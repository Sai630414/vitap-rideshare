import jwt from "jsonwebtoken";
import { IUser } from "../models/User";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;

const ACCESS_TOKEN_EXPIRY =
  process.env.ACCESS_TOKEN_EXPIRY || "15m";

const REFRESH_TOKEN_EXPIRY =
  process.env.REFRESH_TOKEN_EXPIRY || "7d";

/**
 * Generate Access Token
 */
export const createAccessToken = (user: IUser): string => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    }
  );
};

/**
 * Generate Refresh Token
 */
export const createRefreshToken = (user: IUser): string => {
  return jwt.sign(
    {
      id: user._id,
    },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
    }
  );
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};