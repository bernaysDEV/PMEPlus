// Object Storage regression probes (task-74).
// Mounts the real publicObjectsHandler / protectedObjectHandler from
// server/storageHandlers.ts on an in-process Express app and asserts the
// public-ACL gate, anonymous-private 401, and gs://-style path 401.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import express, { Response } from "express";
import http from "http";
import { AddressInfo } from "net";

// --- Mock the GCS/S3/ACL boundary BEFORE importing storageHandlers ---------

vi.mock("@google-cloud/storage", () => {
  class FakeStorage {
    bucket() {
      return { file: () => ({ exists: async () => [false] }) };
    }
  }
  class FakeFile {}
  return { Storage: FakeStorage, File: FakeFile };
});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {},
  PutObjectCommand: class {},
  GetObjectCommand: class {},
  HeadObjectCommand: class {},
  DeleteObjectCommand: class {},
}));

// Per-test knobs the mocks consult so we can flip ACL / search behavior
// without re-mounting the app.
const knobs = {
  publicSearch: (_p: string) => null as any,
  acl: { visibility: "private" } as any,
  canAccess: false,
};

vi.mock("../../server/objectAcl", () => ({
  ObjectAclPolicy: {},
  ObjectPermission: { READ: "read", WRITE: "write" },
  canAccessObject: vi.fn(async () => knobs.canAccess),
  getObjectAclPolicy: vi.fn(async () => knobs.acl),
  setObjectAclPolicy: vi.fn(async () => {}),
}));

vi.mock("../../server/objectStorage", () => {
  class ObjectNotFoundError extends Error {
    constructor() {
      super("object not found");
    }
  }
  class ObjectStorageService {
    async searchPublicObject(p: string) {
      return knobs.publicSearch(p);
    }
    async getObjectEntityFile(_path: string) {
      // Production resolves a real File from the path. We hand back a
      // sentinel; the real auth gate is canAccessObjectEntity below.
      return { name: ".private/uploads/secret.bin" };
    }
    async canAccessObjectEntity(_args: any) {
      return knobs.canAccess;
    }
    async downloadObject(file: any, res: Response) {
      res.status(200).send(`served:${file?.path ?? file?.name ?? "?"}`);
    }
  }
  return {
    ObjectStorageService,
    ObjectNotFoundError,
    objectStorageClient: { bucket: () => ({ file: () => ({}) }) },
  };
});

let server: http.Server;
let baseUrl = "";

beforeAll(async () => {
  // Import lazily so the mocks above are in place first. This pulls in the
  // SAME handler functions that production wires up.
  const { publicObjectsHandler, protectedObjectHandler } = await import(
    "../../server/storageHandlers"
  );

  const app = express();
  // Lightweight auth shim — lets a test simulate an authenticated caller by
  // setting `x-test-user`. Production uses passport.
  app.use((req: any, _res, next) => {
    const u = req.headers["x-test-user"];
    if (typeof u === "string" && u.length > 0) req.user = { id: u };
    next();
  });
  app.get("/public-objects/*", publicObjectsHandler);
  app.get("/objects/:objectPath(*)", protectedObjectHandler);

  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Object Storage public-objects gate (real handler)", () => {
  it("returns 404 for a private path requested via /public-objects/", async () => {
    knobs.publicSearch = (p: string) => (p.startsWith("public/") ? { path: p } : null);
    const res = await fetch(`${baseUrl}/public-objects/.private/uploads/secret.bin`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for a gs://-style bucket prefix that isn't public/", async () => {
    knobs.publicSearch = (p: string) => (p.startsWith("public/") ? { path: p } : null);
    const res = await fetch(
      `${baseUrl}/public-objects/replit-objstore-foo/.private/uploads/secret.bin`,
    );
    expect(res.status).toBe(404);
  });

  it("serves files explicitly under public/", async () => {
    knobs.publicSearch = (p: string) => (p.startsWith("public/") ? { path: p } : null);
    const res = await fetch(`${baseUrl}/public-objects/public/avatar.png`);
    expect(res.status).toBe(200);
  });
});

describe("Object Storage /objects/* anonymous gate (real handler)", () => {
  it("returns 401 for an unauthenticated request to a private object", async () => {
    knobs.acl = { visibility: "private" };
    knobs.canAccess = false;
    const res = await fetch(`${baseUrl}/objects/uploads/secret.bin`);
    expect(res.status).toBe(401);
  });

  it("returns 401 even when the path mimics a gs:// media-proxy resolution", async () => {
    // The media proxy normalizes a gs:// URL into an /objects/<path>
    // resolution; the same auth gate must refuse it for an anonymous caller.
    knobs.acl = { visibility: "private" };
    knobs.canAccess = false;
    const res = await fetch(
      `${baseUrl}/objects/${encodeURIComponent(
        "gs://replit-objstore-foo/.private/uploads/secret.bin",
      )}`,
    );
    expect(res.status).toBe(401);
  });

  it("returns 200 for a public-ACL object (no auth required)", async () => {
    knobs.acl = { visibility: "public" };
    knobs.canAccess = false;
    const res = await fetch(`${baseUrl}/objects/public-banner.png`);
    expect(res.status).toBe(200);
  });

  it("returns 200 for an authorised caller against a private object", async () => {
    knobs.acl = { visibility: "private" };
    knobs.canAccess = true;
    const res = await fetch(`${baseUrl}/objects/uploads/owned-by-me.bin`, {
      headers: { "x-test-user": "user-42" },
    });
    expect(res.status).toBe(200);
  });

  it("returns 401 for an authenticated-but-out-of-scope caller", async () => {
    // The principal is logged in (req.user.id is set) but the ACL store
    // says they don't own / have access to this object. The handler must
    // still refuse — auth alone is not authorization.
    knobs.acl = { visibility: "private" };
    knobs.canAccess = false;
    const res = await fetch(`${baseUrl}/objects/uploads/someone-elses.bin`, {
      headers: { "x-test-user": "user-99" },
    });
    expect(res.status).toBe(401);
  });
});
