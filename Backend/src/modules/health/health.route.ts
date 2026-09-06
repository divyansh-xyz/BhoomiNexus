import { Router, Request, Response } from "express";
import { pool } from "../../config/db";
import { redisClient } from "../../config/redis";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  let dbConnected = false;
  let redisConnected = false;

  try {
    const dbRes = await pool.query("SELECT 1");
    if (dbRes.rowCount === 1) dbConnected = true;
  } catch (error) {
    dbConnected = false;
  }

  if (redisClient.isReady) {
    redisConnected = true;
  }

  res.status(200).json({
    status: "UP",
    database: dbConnected ? "connected" : "disconnected",
    redis: redisConnected ? "connected" : "disconnected",
  });
});

export default router;
