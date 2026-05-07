/**
 * Seed the `permissions` table from PERMISSION_CODES defined in
 * `shared/rbac-constants.ts`. Idempotent: existing rows (matched by `code`)
 * are updated; missing rows are inserted; rows are never deleted.
 *
 * Usage:
 *   tsx scripts/seed-permissions.ts
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import * as schema from "../shared/schema.js";
import { PERMISSION_CODES } from "../shared/rbac-constants.js";

neonConfig.webSocketConstructor = ws;

const MODULE_LABELS_AR: Record<string, string> = {
  articles: "المقالات",
  categories: "التصنيفات",
  users: "المستخدمون",
  comments: "التعليقات",
  media: "الوسائط",
  settings: "الإعدادات",
  analytics: "التحليلات",
  tags: "الوسوم",
  system: "النظام",
  audio_newsletters: "النشرات الصوتية",
  audio_briefs: "الأخبار الصوتية السريعة",
  opinion: "مقالات الرأي",
  dashboard: "لوحة التحكم",
  communications: "التواصل",
  breaking_ticker: "شريط الأخبار العاجلة",
  staff: "الموظفون",
};

const MODULE_LABELS_EN: Record<string, string> = {
  articles: "Articles",
  categories: "Categories",
  users: "Users",
  comments: "Comments",
  media: "Media",
  settings: "Settings",
  analytics: "Analytics",
  tags: "Tags",
  system: "System",
  audio_newsletters: "Audio Newsletters",
  audio_briefs: "Audio Briefs",
  opinion: "Opinion",
  dashboard: "Dashboard",
  communications: "Communications",
  breaking_ticker: "Breaking News Ticker",
  staff: "Staff",
};

const ACTION_LABELS_AR: Record<string, string> = {
  view: "عرض",
  view_own: "عرض الخاصة",
  view_audit: "عرض سجل النشاط",
  view_stats: "عرض الإحصائيات",
  view_messages: "عرض الرسائل",
  view_moderators: "عرض المشرفين",
  view_quick_actions: "عرض الإجراءات السريعة",
  view_visitors: "عرض الزوار",
  view_productivity: "عرض الإنتاجية",
  create: "إنشاء",
  edit: "تعديل",
  edit_own: "تعديل الخاصة",
  edit_any: "تعديل الكل",
  update: "تحديث",
  delete: "حذف",
  delete_own: "حذف الخاصة",
  delete_any: "حذف الكل",
  publish: "نشر",
  unpublish: "إلغاء النشر",
  archive: "أرشفة",
  feature: "تمييز",
  approve: "موافقة",
  reject: "رفض",
  ban: "حظر",
  ban_user: "حظر مستخدم",
  suspend: "تعليق",
  change_role: "تغيير الدور",
  upload: "رفع",
  ai_generate: "توليد بالذكاء الاصطناعي",
  schedule: "جدولة",
  polls: "استطلاعات الرأي",
  smart_links: "الروابط الذكية",
  generate_images: "توليد الصور",
  generate: "توليد",
  infographics: "إنفوجرافيك",
  news_type: "نوع الخبر",
  comprehensive_edit: "التحرير الشامل",
  content_type_selector: "اختيار نوع المحتوى",
  hide_homepage: "إخفاء من الصفحة الرئيسية",
  manage_all: "إدارة الكل",
  manage: "إدارة",
  manage_settings: "إدارة الإعدادات",
  manage_roles: "إدارة الأدوار",
  submit_review: "تقديم للمراجعة",
  review: "مراجعة",
  staff: "تواصل الموظفين",
};

const ACTION_LABELS_EN: Record<string, string> = {
  view: "View",
  view_own: "View Own",
  view_audit: "View Audit Log",
  view_stats: "View Stats",
  view_messages: "View Messages",
  view_moderators: "View Moderators",
  view_quick_actions: "View Quick Actions",
  view_visitors: "View Visitors",
  view_productivity: "View Productivity",
  create: "Create",
  edit: "Edit",
  edit_own: "Edit Own",
  edit_any: "Edit Any",
  update: "Update",
  delete: "Delete",
  delete_own: "Delete Own",
  delete_any: "Delete Any",
  publish: "Publish",
  unpublish: "Unpublish",
  archive: "Archive",
  feature: "Feature",
  approve: "Approve",
  reject: "Reject",
  ban: "Ban",
  ban_user: "Ban User",
  suspend: "Suspend",
  change_role: "Change Role",
  upload: "Upload",
  ai_generate: "AI Generate",
  schedule: "Schedule",
  polls: "Polls",
  smart_links: "Smart Links",
  generate_images: "Generate Images",
  generate: "Generate",
  infographics: "Infographics",
  news_type: "News Type",
  comprehensive_edit: "Comprehensive Edit",
  content_type_selector: "Content Type Selector",
  hide_homepage: "Hide from Homepage",
  manage_all: "Manage All",
  manage: "Manage",
  manage_settings: "Manage Settings",
  manage_roles: "Manage Roles",
  submit_review: "Submit for Review",
  review: "Review",
  staff: "Staff Communications",
};

function humanize(token: string): string {
  return token
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function buildLabels(code: string): { label: string; labelAr: string; module: string } {
  const [module, action] = code.split(".");
  const moduleAr = MODULE_LABELS_AR[module] ?? humanize(module);
  const moduleEn = MODULE_LABELS_EN[module] ?? humanize(module);
  const actionAr = ACTION_LABELS_AR[action] ?? humanize(action);
  const actionEn = ACTION_LABELS_EN[action] ?? humanize(action);
  return {
    module,
    labelAr: `${moduleAr} - ${actionAr}`,
    label: `${moduleEn} - ${actionEn}`,
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const db = drizzle({ client: pool, schema });

  try {
    const codes = Object.values(PERMISSION_CODES) as string[];
    console.log(`Seeding ${codes.length} permissions...`);

    let inserted = 0;
    let updated = 0;

    for (const code of codes) {
      const { label, labelAr, module } = buildLabels(code);

      const result = await db.execute(sql`
        INSERT INTO permissions (code, label, label_ar, module)
        VALUES (${code}, ${label}, ${labelAr}, ${module})
        ON CONFLICT (code) DO UPDATE SET
          label = EXCLUDED.label,
          label_ar = EXCLUDED.label_ar,
          module = EXCLUDED.module
        RETURNING (xmax = 0) AS inserted
      `);

      const row = (result as any).rows?.[0];
      if (row?.inserted) inserted++;
      else updated++;
    }

    console.log(`Done. Inserted: ${inserted}, Updated: ${updated}, Total: ${codes.length}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
