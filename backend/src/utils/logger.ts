import winston from "winston";

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss:ms",
  }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    ({ timestamp, level, message }) =>
      `[${timestamp}] [${level}]: ${message}`
  )
);

// Explicitly type the transports array
const transports: winston.transport[] = [];

// Always log to console
transports.push(new winston.transports.Console());

// Only write log files when NOT running on Vercel, Render, or in Production mode
const isProductionLike =
  process.env.VERCEL ||
  process.env.RENDER ||
  process.env.NODE_ENV === 'production';

if (!isProductionLike) {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    })
  );

  transports.push(
    new winston.transports.File({
      filename: "logs/combined.log",
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  levels,
  format: logFormat,
  transports,
});

export default logger;