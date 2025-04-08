import pino from "pino";

export const baseLogger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "yyyy-mm-dd HH:MM:ss",
      ignore: "pid,hostname",
    },
  },
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});
