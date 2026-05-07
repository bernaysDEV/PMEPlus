import { db } from "../db";
import { developers, type InsertDeveloper } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Seed regional real-estate developers used by the homepage
 * "نبض الشركات العقارية" (Real Estate Companies Pulse) block.
 *
 * Idempotent: skips developers whose slug already exists.
 */
const SEED_DEVELOPERS: InsertDeveloper[] = [
  // ===== الإمارات / UAE =====
  {
    nameAr: "إعمار العقارية",
    nameEn: "Emaar Properties",
    slug: "emaar",
    logoUrl: "https://logo.clearbit.com/emaar.com",
    country: "AE",
    countryNameAr: "الإمارات",
    city: "dubai",
    cityNameAr: "دبي",
    website: "https://www.emaar.com",
    brandColor: "#0a3d62",
    description: "أكبر مطور عقاري في دبي ومنطقة الشرق الأوسط",
    sortOrder: 1,
    isActive: true,
    isFeatured: true,
  },
  {
    nameAr: "الدار العقارية",
    nameEn: "Aldar Properties",
    slug: "aldar",
    logoUrl: "https://logo.clearbit.com/aldar.com",
    country: "AE",
    countryNameAr: "الإمارات",
    city: "abu-dhabi",
    cityNameAr: "أبوظبي",
    website: "https://www.aldar.com",
    brandColor: "#1d3557",
    description: "المطور العقاري الرائد في إمارة أبوظبي",
    sortOrder: 2,
    isActive: true,
    isFeatured: true,
  },
  {
    nameAr: "داماك العقارية",
    nameEn: "Damac Properties",
    slug: "damac",
    logoUrl: "https://logo.clearbit.com/damacproperties.com",
    country: "AE",
    countryNameAr: "الإمارات",
    city: "dubai",
    cityNameAr: "دبي",
    website: "https://www.damacproperties.com",
    brandColor: "#a83232",
    description: "مطور المشاريع الفاخرة في دبي والمنطقة",
    sortOrder: 3,
    isActive: true,
    isFeatured: true,
  },
  {
    nameAr: "نخيل العقارية",
    nameEn: "Nakheel",
    slug: "nakheel",
    logoUrl: "https://logo.clearbit.com/nakheel.com",
    country: "AE",
    countryNameAr: "الإمارات",
    city: "dubai",
    cityNameAr: "دبي",
    website: "https://www.nakheel.com",
    brandColor: "#0066b3",
    description: "صاحب مشروع نخلة جميرا والجزر العالم",
    sortOrder: 4,
    isActive: true,
  },
  {
    nameAr: "ميراس",
    nameEn: "Meraas",
    slug: "meraas",
    logoUrl: "https://logo.clearbit.com/meraas.com",
    country: "AE",
    countryNameAr: "الإمارات",
    city: "dubai",
    cityNameAr: "دبي",
    website: "https://www.meraas.com",
    brandColor: "#c89b3c",
    description: "مطور تجارب نمط الحياة العصرية في دبي",
    sortOrder: 5,
    isActive: true,
  },
  {
    nameAr: "صبحا العقارية",
    nameEn: "Sobha Realty",
    slug: "sobha",
    logoUrl: "https://logo.clearbit.com/sobharealty.com",
    country: "AE",
    countryNameAr: "الإمارات",
    city: "dubai",
    cityNameAr: "دبي",
    website: "https://www.sobharealty.com",
    brandColor: "#1f1f1f",
    description: "مطور عقاري متعدد الجنسيات بمعايير عالية الجودة",
    sortOrder: 6,
    isActive: true,
  },
  // ===== المملكة العربية السعودية / Saudi Arabia =====
  {
    nameAr: "روشن",
    nameEn: "Roshn",
    slug: "roshn",
    logoUrl: "https://logo.clearbit.com/roshn.sa",
    country: "SA",
    countryNameAr: "السعودية",
    city: "riyadh",
    cityNameAr: "الرياض",
    website: "https://www.roshn.sa",
    brandColor: "#5b2d8a",
    description: "المطور العقاري الوطني التابع لصندوق الاستثمارات العامة",
    sortOrder: 7,
    isActive: true,
    isFeatured: true,
  },
  {
    nameAr: "دار الأركان",
    nameEn: "Dar Al Arkan",
    slug: "dar-al-arkan",
    logoUrl: "https://logo.clearbit.com/daralarkan.com",
    country: "SA",
    countryNameAr: "السعودية",
    city: "riyadh",
    cityNameAr: "الرياض",
    website: "https://www.daralarkan.com",
    brandColor: "#b88746",
    description: "أكبر شركة تطوير عقاري في المملكة العربية السعودية",
    sortOrder: 8,
    isActive: true,
  },
  {
    nameAr: "نيوم",
    nameEn: "NEOM",
    slug: "neom",
    logoUrl: "https://logo.clearbit.com/neom.com",
    country: "SA",
    countryNameAr: "السعودية",
    city: "tabuk",
    cityNameAr: "تبوك",
    website: "https://www.neom.com",
    brandColor: "#0e7c66",
    description: "مشروع المدينة المستقبلية على البحر الأحمر",
    sortOrder: 9,
    isActive: true,
  },
  {
    nameAr: "القدية",
    nameEn: "Qiddiya",
    slug: "qiddiya",
    logoUrl: "https://logo.clearbit.com/qiddiya.com",
    country: "SA",
    countryNameAr: "السعودية",
    city: "riyadh",
    cityNameAr: "الرياض",
    website: "https://www.qiddiya.com",
    brandColor: "#d44a3c",
    description: "العاصمة الترفيهية والرياضية والثقافية في المملكة",
    sortOrder: 10,
    isActive: true,
  },
  // ===== قطر / Qatar =====
  {
    nameAr: "الديار القطرية",
    nameEn: "Qatari Diar",
    slug: "qatari-diar",
    logoUrl: "https://logo.clearbit.com/qataridiar.com",
    country: "QA",
    countryNameAr: "قطر",
    city: "doha",
    cityNameAr: "الدوحة",
    website: "https://www.qataridiar.com",
    brandColor: "#7a1b2e",
    description: "ذراع التطوير العقاري لجهاز قطر للاستثمار",
    sortOrder: 11,
    isActive: true,
  },
  {
    nameAr: "بروة العقارية",
    nameEn: "Barwa Real Estate",
    slug: "barwa",
    logoUrl: "https://logo.clearbit.com/barwa.com.qa",
    country: "QA",
    countryNameAr: "قطر",
    city: "doha",
    cityNameAr: "الدوحة",
    website: "https://www.barwa.com.qa",
    brandColor: "#2c5f8a",
    description: "أكبر شركة تطوير عقاري مدرجة في قطر",
    sortOrder: 12,
    isActive: true,
  },
  // ===== الكويت / Kuwait =====
  {
    nameAr: "أجيال العقارية",
    nameEn: "Ajial Real Estate",
    slug: "ajial",
    country: "KW",
    countryNameAr: "الكويت",
    city: "kuwait-city",
    cityNameAr: "مدينة الكويت",
    brandColor: "#0b6e4f",
    description: "شركة تطوير عقاري كويتية رائدة",
    sortOrder: 13,
    isActive: true,
  },
  // ===== مصر / Egypt =====
  {
    nameAr: "طلعت مصطفى",
    nameEn: "Talaat Moustafa Group",
    slug: "talaat-moustafa",
    logoUrl: "https://logo.clearbit.com/talaatmoustafa.com",
    country: "EG",
    countryNameAr: "مصر",
    city: "cairo",
    cityNameAr: "القاهرة",
    website: "https://www.talaatmoustafa.com",
    brandColor: "#8b1a1a",
    description: "أكبر مطور عقاري في مصر وصاحب مدينتي",
    sortOrder: 14,
    isActive: true,
  },
  {
    nameAr: "بالم هيلز للتعمير",
    nameEn: "Palm Hills Developments",
    slug: "palm-hills",
    logoUrl: "https://logo.clearbit.com/palmhillsdevelopments.com",
    country: "EG",
    countryNameAr: "مصر",
    city: "cairo",
    cityNameAr: "القاهرة",
    website: "https://www.palmhillsdevelopments.com",
    brandColor: "#2e7d32",
    description: "مطور رائد للمجتمعات السكنية في مصر",
    sortOrder: 15,
    isActive: true,
  },
];

export async function seedDevelopers(): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  for (const dev of SEED_DEVELOPERS) {
    try {
      const result = await db
        .insert(developers)
        .values(dev)
        .onConflictDoNothing({ target: developers.slug })
        .returning({ id: developers.id });
      if (result.length > 0) {
        inserted++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[seedDevelopers] Failed to seed ${dev.slug}:`, err);
    }
  }
  return { inserted, skipped };
}

/**
 * Run the seeder only if the developers table is empty.
 * Safe to call on every server boot.
 */
export async function ensureDevelopersSeeded(): Promise<void> {
  try {
    const result = await db.execute<{ cnt: number }>(
      sql`SELECT COUNT(*)::int AS cnt FROM developers`,
    );
    const firstRow = result.rows?.[0];
    const cnt = Number(firstRow?.cnt ?? 0);
    if (cnt === 0) {
      console.log("[seedDevelopers] developers table is empty — seeding regional developers…");
      const r = await seedDevelopers();
      console.log(`[seedDevelopers] ✅ Seed completed — inserted: ${r.inserted}, skipped: ${r.skipped}`);
    }
  } catch (err) {
    // Non-fatal: the table might not yet exist on first boot before db push
    console.warn("[seedDevelopers] Skipped auto-seed (table may not exist yet):", (err as Error).message);
  }
}
