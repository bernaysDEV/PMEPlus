import { Router, Request, Response } from "express";
import { db } from "../db";
import { 
  articlePurchases, 
  tapPayments,
  paymentDailySummary,
  paymentAlerts,
  paymentExportLogs,
  users,
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc, asc, count, sum, between } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const requireAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ success: false, error: "غير مصرح" });
  }
  const user = req.user as any;
  if (!["admin", "super_admin", "owner"].includes(user.role)) {
    return res.status(403).json({ success: false, error: "صلاحيات غير كافية" });
  }
  next();
};

router.use(requireAdmin);

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, period = "today" } = req.query;
    
    let start: Date, end: Date;
    const now = new Date();
    
    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      switch (period) {
        case "today":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = now;
          break;
        case "week":
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case "month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = now;
          break;
        case "year":
          start = new Date(now.getFullYear(), 0, 1);
          end = now;
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = now;
      }
    }
    
    const articleStats = await db
      .select({
        total: count(),
        successful: sql<number>`COUNT(*) FILTER (WHERE ${articlePurchases.status} = 'completed')`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${articlePurchases.status} = 'failed')`,
        pending: sql<number>`COUNT(*) FILTER (WHERE ${articlePurchases.status} = 'pending')`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${articlePurchases.status} = 'completed' THEN ${articlePurchases.priceHalalas} ELSE 0 END), 0)`,
      })
      .from(articlePurchases)
      .where(and(
        gte(articlePurchases.createdAt, start),
        lte(articlePurchases.createdAt, end)
      ));
    
    const article = articleStats[0] || { total: 0, successful: 0, failed: 0, pending: 0, revenue: 0 };
    
    const totalPayments = Number(article.total);
    const totalSuccessful = Number(article.successful);
    const totalRevenue = Number(article.revenue);
    const successRate = totalPayments > 0 ? (totalSuccessful / totalPayments) * 100 : 0;
    
    const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyAverageRevenue = totalRevenue / daysDiff;
    
    res.json({
      success: true,
      data: {
        period: { start, end, days: daysDiff },
        article: {
          total: Number(article.total),
          successful: Number(article.successful),
          failed: Number(article.failed),
          pending: Number(article.pending),
          revenueHalalas: Number(article.revenue),
          revenueSAR: (Number(article.revenue) / 100).toFixed(2),
        },
        combined: {
          totalPayments,
          totalSuccessful,
          totalFailed: Number(article.failed),
          totalPending: Number(article.pending),
          totalRevenueHalalas: totalRevenue,
          totalRevenueSAR: (totalRevenue / 100).toFixed(2),
          successRate: successRate.toFixed(1),
          dailyAverageHalalas: Math.round(dailyAverageRevenue),
          dailyAverageSAR: (dailyAverageRevenue / 100).toFixed(2),
        },
      },
    });
  } catch (error: any) {
    console.error("[Payment Analytics] Error fetching summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/trends", async (req: Request, res: Response) => {
  try {
    const { days = "30" } = req.query;
    const daysCount = parseInt(days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);
    
    const articleTrends = await db
      .select({
        date: sql<string>`DATE(${articlePurchases.createdAt})`.as("date"),
        count: count(),
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${articlePurchases.status} = 'completed' THEN ${articlePurchases.priceHalalas} ELSE 0 END), 0)`,
        successful: sql<number>`COUNT(*) FILTER (WHERE ${articlePurchases.status} = 'completed')`,
      })
      .from(articlePurchases)
      .where(gte(articlePurchases.createdAt, startDate))
      .groupBy(sql`DATE(${articlePurchases.createdAt})`)
      .orderBy(sql`DATE(${articlePurchases.createdAt})`);
    
    const trends = articleTrends.map((t: any) => ({
      date: t.date,
      articleCount: Number(t.count),
      articleRevenue: Number(t.revenue),
      totalRevenue: Number(t.revenue),
      articleRevenueSAR: (Number(t.revenue) / 100).toFixed(2),
      totalRevenueSAR: (Number(t.revenue) / 100).toFixed(2),
    }));
    
    res.json({
      success: true,
      data: {
        days: daysCount,
        trends,
      },
    });
  } catch (error: any) {
    console.error("[Payment Analytics] Error fetching trends:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      page = "1", 
      limit = "50" 
    } = req.query;
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offset = (pageNum - 1) * limitNum;
    
    let articleQuery = db
      .select({
        id: articlePurchases.id,
        type: sql<string>`'article'`.as("type"),
        chargeId: articlePurchases.chargeId,
        amountHalalas: articlePurchases.priceHalalas,
        status: articlePurchases.status,
        createdAt: articlePurchases.createdAt,
        articleId: articlePurchases.articleId,
        userId: articlePurchases.userId,
      })
      .from(articlePurchases);
    
    const conditions = [];
    if (status) conditions.push(eq(articlePurchases.status, status as string));
    if (startDate) conditions.push(gte(articlePurchases.createdAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(articlePurchases.createdAt, new Date(endDate as string)));
    
    if (conditions.length > 0) {
      articleQuery = articleQuery.where(and(...conditions)) as any;
    }
    
    const articleResults = await articleQuery
      .orderBy(desc(articlePurchases.createdAt))
      .limit(limitNum)
      .offset(offset);
    
    const results = articleResults.map(r => ({
      ...r,
      amountSAR: (Number(r.amountHalalas) / 100).toFixed(2),
      paymentType: "article",
    }));
    
    res.json({
      success: true,
      data: {
        transactions: results,
        pagination: {
          page: pageNum,
          limit: limitNum,
          hasMore: results.length >= limitNum,
        },
      },
    });
  } catch (error: any) {
    console.error("[Payment Analytics] Error fetching transactions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/failed", async (req: Request, res: Response) => {
  try {
    const { days = "7" } = req.query;
    const daysCount = parseInt(days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);
    
    const failedArticle = await db
      .select({
        id: articlePurchases.id,
        chargeId: articlePurchases.chargeId,
        amountHalalas: articlePurchases.priceHalalas,
        status: articlePurchases.status,
        createdAt: articlePurchases.createdAt,
        articleId: articlePurchases.articleId,
        userId: articlePurchases.userId,
      })
      .from(articlePurchases)
      .where(and(
        gte(articlePurchases.createdAt, startDate),
        sql`${articlePurchases.status} IN ('failed', 'pending')`
      ))
      .orderBy(desc(articlePurchases.createdAt))
      .limit(50);
    
    const allFailed = failedArticle.map(f => ({ 
      ...f, 
      paymentType: "article", 
      amountSAR: (Number(f.amountHalalas) / 100).toFixed(2) 
    }));
    
    res.json({
      success: true,
      data: {
        count: allFailed.length,
        transactions: allFailed,
      },
    });
  } catch (error: any) {
    console.error("[Payment Analytics] Error fetching failed payments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/alerts", async (req: Request, res: Response) => {
  try {
    const { unreadOnly = "true", limit = "20" } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 50);
    
    const conditions = [];
    if (unreadOnly === "true") {
      conditions.push(eq(paymentAlerts.isRead, false));
    }
    
    const alerts = await db
      .select()
      .from(paymentAlerts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(paymentAlerts.createdAt))
      .limit(limitNum);
    
    const unreadCount = await db
      .select({ count: count() })
      .from(paymentAlerts)
      .where(eq(paymentAlerts.isRead, false));
    
    res.json({
      success: true,
      data: {
        alerts,
        unreadCount: Number(unreadCount[0]?.count || 0),
      },
    });
  } catch (error: any) {
    console.error("[Payment Analytics] Error fetching alerts:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/alerts/:id/read", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db
      .update(paymentAlerts)
      .set({ isRead: true })
      .where(eq(paymentAlerts.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Payment Analytics] Error marking alert as read:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/alerts/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    await db
      .update(paymentAlerts)
      .set({ 
        isResolved: true, 
        resolvedAt: new Date(),
        resolvedBy: user.id,
      })
      .where(eq(paymentAlerts.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Payment Analytics] Error resolving alert:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/export", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, format = "csv" } = req.query;
    const user = req.user as any;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: "يجب تحديد تاريخ البداية والنهاية" });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    const articleData = await db
      .select({
        id: articlePurchases.id,
        type: sql<string>`'مقال'`.as("type"),
        chargeId: articlePurchases.chargeId,
        amountHalalas: articlePurchases.priceHalalas,
        status: articlePurchases.status,
        createdAt: articlePurchases.createdAt,
      })
      .from(articlePurchases)
      .where(and(
        gte(articlePurchases.createdAt, start),
        lte(articlePurchases.createdAt, end)
      ))
      .orderBy(desc(articlePurchases.createdAt));
    
    const allData = articleData;
    
    await db.insert(paymentExportLogs).values({
      exportedBy: user.id,
      exportType: "custom_range",
      format: format as string,
      startDate: startDate as string,
      endDate: endDate as string,
      recordsCount: allData.length,
    });
    
    if (format === "json") {
      return res.json({
        success: true,
        data: {
          period: { start, end },
          recordsCount: allData.length,
          records: allData.map(d => ({
            ...d,
            amountSAR: (Number(d.amountHalalas) / 100).toFixed(2),
          })),
        },
      });
    }
    
    const statusArabic: Record<string, string> = {
      completed: "مكتمل",
      pending: "معلق",
      failed: "فاشل",
    };
    
    const csvHeader = "المعرف,النوع,رقم العملية,المبلغ (ريال),الحالة,التاريخ\n";
    const csvRows = allData.map(d => 
      `${d.id},${d.type},${d.chargeId || ""},${(Number(d.amountHalalas) / 100).toFixed(2)},${statusArabic[d.status] || d.status},${new Date(d.createdAt).toISOString()}`
    ).join("\n");
    
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=payments_${startDate}_${endDate}.csv`);
    res.send("\uFEFF" + csvHeader + csvRows);
    
  } catch (error: any) {
    console.error("[Payment Analytics] Error exporting data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/kpis", async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const todayArticle = await db
      .select({ revenue: sql<number>`COALESCE(SUM(CASE WHEN ${articlePurchases.status} = 'completed' THEN ${articlePurchases.priceHalalas} ELSE 0 END), 0)` })
      .from(articlePurchases)
      .where(gte(articlePurchases.createdAt, todayStart));
    
    const monthArticle = await db
      .select({ revenue: sql<number>`COALESCE(SUM(CASE WHEN ${articlePurchases.status} = 'completed' THEN ${articlePurchases.priceHalalas} ELSE 0 END), 0)` })
      .from(articlePurchases)
      .where(gte(articlePurchases.createdAt, monthStart));
    
    const lastMonthArticle = await db
      .select({ revenue: sql<number>`COALESCE(SUM(CASE WHEN ${articlePurchases.status} = 'completed' THEN ${articlePurchases.priceHalalas} ELSE 0 END), 0)` })
      .from(articlePurchases)
      .where(and(
        gte(articlePurchases.createdAt, lastMonthStart),
        lte(articlePurchases.createdAt, lastMonthEnd)
      ));
    
    const lifetimeArticle = await db
      .select({ revenue: sql<number>`COALESCE(SUM(CASE WHEN ${articlePurchases.status} = 'completed' THEN ${articlePurchases.priceHalalas} ELSE 0 END), 0)` })
      .from(articlePurchases);
    
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const successRateArticle = await db
      .select({
        total: count(),
        successful: sql<number>`COUNT(*) FILTER (WHERE ${articlePurchases.status} = 'completed')`,
      })
      .from(articlePurchases)
      .where(gte(articlePurchases.createdAt, thirtyDaysAgo));
    
    const todayRevenue = Number(todayArticle[0]?.revenue || 0);
    const monthRevenue = Number(monthArticle[0]?.revenue || 0);
    const lastMonthRevenue = Number(lastMonthArticle[0]?.revenue || 0);
    const lifetimeRevenue = Number(lifetimeArticle[0]?.revenue || 0);
    
    const totalPayments = Number(successRateArticle[0]?.total || 0);
    const successfulPayments = Number(successRateArticle[0]?.successful || 0);
    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;
    
    const monthGrowth = lastMonthRevenue > 0 
      ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;
    
    res.json({
      success: true,
      data: {
        today: {
          revenueHalalas: todayRevenue,
          revenueSAR: (todayRevenue / 100).toFixed(2),
        },
        thisMonth: {
          revenueHalalas: monthRevenue,
          revenueSAR: (monthRevenue / 100).toFixed(2),
          growth: monthGrowth.toFixed(1),
        },
        lastMonth: {
          revenueHalalas: lastMonthRevenue,
          revenueSAR: (lastMonthRevenue / 100).toFixed(2),
        },
        lifetime: {
          revenueHalalas: lifetimeRevenue,
          revenueSAR: (lifetimeRevenue / 100).toFixed(2),
        },
        metrics: {
          successRate: successRate.toFixed(1),
          totalPayments,
          successfulPayments,
        },
      },
    });
  } catch (error: any) {
    console.error("[Payment Analytics] Error fetching KPIs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
