/**
 * Unified entry point that runs every category news seeder in sequence.
 * All underlying seeders are idempotent: existing articles (matched by slug)
 * are skipped, so it is safe to re-run this script repeatedly.
 *
 * Usage:
 *   npx tsx server/scripts/seedAllNews.ts
 */

import "dotenv/config";

import { main as seedRealEstateNews } from "./seedRealEstateNews";
import { main as seedTechNews } from "./seedTechNews";
import { main as seedSportsNews } from "./seedSportsNews";
import { main as seedBusinessNews } from "./seedBusinessNews";
import { main as seedLocalNews } from "./seedLocalNews";
import { main as seedWorldNews } from "./seedWorldNews";
import { main as seedLifeNews } from "./seedLifeNews";
import { main as seedStationsNews } from "./seedStationsNews";
import { main as seedTourismNews } from "./seedTourismNews";
import { main as seedCarsNews } from "./seedCarsNews";
import { main as seedMediaNews } from "./seedMediaNews";

export interface SeedSummary {
  category: string;
  total: number;
  inserted: number;
  skipped: number;
}

interface SeederTask {
  name: string;
  run: () => Promise<SeedSummary>;
}

const SEEDERS: SeederTask[] = [
  { name: "Local", run: seedLocalNews },
  { name: "World", run: seedWorldNews },
  { name: "Life", run: seedLifeNews },
  { name: "Stations", run: seedStationsNews },
  { name: "Sports", run: seedSportsNews },
  { name: "Tourism", run: seedTourismNews },
  { name: "Business", run: seedBusinessNews },
  { name: "Technology", run: seedTechNews },
  { name: "Cars", run: seedCarsNews },
  { name: "Media", run: seedMediaNews },
  { name: "Real Estate", run: seedRealEstateNews },
];

export interface SeedAllNewsResult {
  summaries: SeedSummary[];
  failures: { name: string; error: unknown }[];
}

export async function seedAllNews(): Promise<SeedAllNewsResult> {
  console.log("🌱 Running unified news seeder for all categories...\n");

  const summaries: SeedSummary[] = [];
  const failures: { name: string; error: unknown }[] = [];

  for (const seeder of SEEDERS) {
    console.log(`\n──────── ${seeder.name} ────────`);
    try {
      const summary = await seeder.run();
      summaries.push(summary);
    } catch (error) {
      console.error(`❌ Seeder "${seeder.name}" failed:`, error);
      failures.push({ name: seeder.name, error });
    }
  }

  console.log("\n──────── News Seed Summary ────────");
  for (const s of summaries) {
    console.log(
      `  • ${s.category}: inserted=${s.inserted}, skipped=${s.skipped}, total=${s.total}`,
    );
  }
  if (failures.length === 0) {
    console.log(`🎉 All ${SEEDERS.length} category seeders completed.`);
  } else {
    console.log(
      `⚠️  ${failures.length}/${SEEDERS.length} seeders failed: ${failures
        .map((f) => f.name)
        .join(", ")}`,
    );
    throw new Error(
      `Seeders failed: ${failures.map((f) => f.name).join(", ")}`,
    );
  }

  return { summaries, failures };
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  seedAllNews()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Unified seeding failed:", err);
      process.exit(1);
    });
}
