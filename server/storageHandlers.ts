// Shared handlers for the two object-storage routes (task-74).
// Mounted by server/index.ts (/public-objects/*) and server/routes.ts
// (/objects/:objectPath(*)). Extracted so security tests exercise the
// exact production logic.
import type { Request, Response } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { getObjectAclPolicy } from "./objectAcl";

interface AuthenticatedRequest extends Request {
  user?: { id?: string | number };
}

export const publicObjectsHandler = async (req: Request, res: Response) => {
  try {
    const subPath = (req.params as { [key: string]: string })[0] ?? (req.params as { [key: string]: string })["0"];
    if (!subPath) return res.status(400).end();

    const service = new ObjectStorageService();
    const file = await service.searchPublicObject(subPath);

    if (!file) {
      return res.status(404).json({ message: "الملف غير موجود" });
    }

    await service.downloadObject(file, res, { forcePublic: true });
  } catch (error) {
    console.error("[PublicObjects Proxy] Error:", error);
    if (!res.headersSent) res.status(500).end();
  }
};

export const protectedObjectHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const objectStorageService = new ObjectStorageService();
  try {
    const objectFile = await objectStorageService.getObjectEntityFile(req.path);

    const aclPolicy = await getObjectAclPolicy(objectFile);
    if (aclPolicy?.visibility === "public") {
      return objectStorageService.downloadObject(objectFile, res);
    }

    const userId = req.user?.id;
    const canAccess = await objectStorageService.canAccessObjectEntity({
      objectFile,
      userId: userId !== undefined ? String(userId) : undefined,
    });
    if (!canAccess) {
      return res.sendStatus(401);
    }
    objectStorageService.downloadObject(objectFile, res);
  } catch (error) {
    console.error("Error checking object access:", error);
    if (error instanceof ObjectNotFoundError) {
      return res.sendStatus(404);
    }
    return res.sendStatus(500);
  }
};
