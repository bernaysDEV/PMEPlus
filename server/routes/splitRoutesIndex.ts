import type { Express } from "express";
import systemSettingsRouter from "./systemSettings";
import adminActivityLogsRouter from "./adminActivityLogs";
import keywordFollowingRouter from "./keywordFollowing";
import interestsRouter from "./interests";
import newsMapRouter from "./newsMap";
import socialFollowingRouter from "./socialFollowing";
import liveNewsRouter from "./liveNews";
import setupRouter from "./setup";
import smartInterestsRouter from "./smartInterests";
import homepageRouter from "./homepage";
import focalPointsRouter from "./focalPoints";
import { registerTwoFactorRoutes } from "./twoFactorRoutes";
import editorPresenceRouter from "./editorPresence";
import { registerThemeRoutes } from "./themes";
import { registerStoryRoutes } from "./stories";
import { registerAbTestRoutes } from "./abTests";

/**
 * Registers all route modules that were split out of the monolithic server/routes.ts.
 * Each module is a mounted Express.Router with absolute /api/... paths, so
 * behavior is identical to the original inline definitions.
 */
export function registerSplitRoutes(app: Express) {
  app.use(systemSettingsRouter);
  app.use(adminActivityLogsRouter);
  app.use(keywordFollowingRouter);
  app.use(interestsRouter);
  app.use(newsMapRouter);
  app.use(socialFollowingRouter);
  app.use(liveNewsRouter);
  app.use(setupRouter);
  app.use(smartInterestsRouter);
  app.use(homepageRouter);
  app.use(focalPointsRouter);
  registerTwoFactorRoutes(app);
  app.use(editorPresenceRouter);
  registerThemeRoutes(app);
  registerStoryRoutes(app);
  registerAbTestRoutes(app);
}
