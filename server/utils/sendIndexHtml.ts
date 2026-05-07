import type { Response } from "express";
import fs from "fs";

export function setNoBrowserCacheHeaders(res: Response): void {
  res.removeHeader("Cache-Control");
  res.removeHeader("cache-control");
  res.removeHeader("Pragma");
  res.removeHeader("Expires");
  res.setHeader(
    "Cache-Control",
    "no-cache, no-store, must-revalidate, s-maxage=60, stale-while-revalidate=120"
  );
  res.setHeader("CDN-Cache-Control", "max-age=60");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

export function sendIndexHtml(
  res: Response,
  indexPath: string,
  statusCode = 200
): void {
  setNoBrowserCacheHeaders(res);
  res.status(statusCode).type("text/html; charset=utf-8");
  try {
    const html = fs.readFileSync(indexPath, "utf-8");
    res.send(html);
  } catch (err) {
    res.status(500).type("text/plain").send("Error loading page");
  }
}
