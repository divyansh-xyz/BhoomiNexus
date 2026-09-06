import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { connectRedis } from "./config/redis";
import { logger } from "./utils/logger";

const startServer = async () => {
  try {
    // 1. Connect to Database & Redis
    await connectDB();
    await connectRedis();

    // 2. Start Express Server
    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error(error, "❌ Failed to start the server:");
    process.exit(1);
  }
};

startServer();
