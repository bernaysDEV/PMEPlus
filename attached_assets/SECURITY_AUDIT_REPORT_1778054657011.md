# تقرير المراجعة الأمنية لمشروع PME

تاريخ التقرير: 2026-05-06  
نوع المراجعة: مراجعة ساكنة للكود والإعدادات والاعتماديات  
النطاق: خادم Express/TypeScript، واجهة React، التخزين، المصادقة، CSRF، CORS، Rate limiting، ونتائج `npm audit --omit=dev`

## ملخص تنفيذي

يحتوي المشروع على عدة طبقات حماية جيدة مثل:

- استخدام `helmet` لإضافة ترويسات أمنية.
- جلسات `httpOnly` مع `secure` في الإنتاج.
- استخدام `bcrypt` لكلمات المرور.
- وجود RBAC وصلاحيات تفصيلية.
- وجود حماية CSRF مبدئية.
- فلترة لبعض أنواع ملفات الرفع.

لكن توجد ثغرات مهمة تحتاج معالجة عاجلة، خصوصاً في ترتيب تحميل المسارات، ومسارات التخزين العامة، واستثناءات CSRF، ومحدودية Rate limiting. أخطر نتيجة حالياً هي احتمال كشف ملفات من التخزين عبر مسارات عامة أو proxy عام، خصوصاً مع fallback إلى buckets قديمة ومسارات `.private`.

## جدول الأولويات

| الأولوية | الخطر | الحالة | الملفات الأساسية |
|---|---|---|---|
| حرجة | تسريب ملفات من التخزين عبر `/objects/*` و`/public-objects/*` | يحتاج إصلاح عاجل | `server/index.ts`, `server/objectStorage.ts` |
| حرجة | Proxy عام لأي `gs://` path | يحتاج إصلاح عاجل | `server/routes.ts` |
| عالية | بعض route modules مركبة قبل المصادقة وCSRF | يحتاج إعادة ترتيب | `server/index.ts`, `server/routes.ts` |
| عالية | APM endpoints عامة وتكشف معلومات تشغيل | يحتاج حماية أو تعطيل | `server/index.ts` |
| عالية | استثناءات CSRF واسعة بالـ prefixes | يحتاج تضييق | `server/csrf.ts` |
| عالية | Rate limiting يتجاوز أصحاب الجلسات | يحتاج إعادة تصميم | `server/index.ts` |
| متوسطة | CSP ضعيفة بسبب `unsafe-inline` و`https:` عام | يحتاج تحسين تدريجي | `server/index.ts` |
| متوسطة | سياسة كلمة مرور ضعيفة نسبياً | يحتاج تشديد | `server/routes.ts` |
| عالية | ثغرات اعتماديات إنتاجية | يحتاج تحديث/استبدال | `package.json`, `package-lock.json` |

## 1. تسريب ملفات من التخزين عبر مسارات عامة

الشدة: حرجة  
الملفات:

- `server/index.ts` عند مسار `/public-objects/*`
- `server/index.ts` عند مسار `/objects/*`
- `server/objectStorage.ts` داخل `searchPublicObject`
- `server/objectStorage.ts` داخل `downloadObject`

### الوصف

المساران `/public-objects/*` و`/objects/*` يستخدمان `searchPublicObject` ثم يستدعيان `downloadObject` مع الخيار:

```ts
{ forcePublic: true }
```

هذا يعني أن `downloadObject` يتجاوز فحص ACL ويعامل الملف كعام. المشكلة الأكبر أن `searchPublicObject` لا يبحث فقط داخل المسارات العامة، بل يحتوي أيضاً على fallback إلى bucket قديم، ويبحث في:

- `public/<filePath>`
- `.private/<filePath>`

في حالة legacy bucket، إذا وجد الملف داخل `.private` فإنه يعيده مباشرة بدون التحقق من أن ACL public.

### الأثر المحتمل

- كشف ملفات خاصة أو تاريخية إذا كان المسار معروفاً أو قابلاً للتخمين.
- تسريب مرفقات أو صور أو ملفات رفعت في مساحة خاصة.
- احتمالية خلط بيانات بين bucket جديد وlegacy bucket.

### توصية الإصلاح

1. اجعل `/objects/*` مساراً خاصاً فقط ولا يستخدم `searchPublicObject`.
2. لا تستخدم `forcePublic: true` إلا بعد التأكد أن الملف داخل prefix عام مؤكد مثل `public/`.
3. احذف fallback إلى `.private` من `searchPublicObject` أو اجعله يتطلب ACL صريحاً:

```ts
const aclPolicy = await getObjectAclPolicy(file);
if (aclPolicy?.visibility !== "public") return null;
```

4. أضف تحققاً مركزياً يمنع تنزيل أي ملف من `.private` بدون مستخدم مصادق وفحص `canAccessObject`.
5. أضف اختبارات لمسارات:

- `/public-objects/public-file`
- `/public-objects/private-file`
- `/objects/private-file`
- ملفات legacy bucket داخل `.private`

## 2. Proxy عام لأي `gs://` path

الشدة: حرجة  
الملف: `server/routes.ts` عند `/api/storage/proxy/:gsPath`

### الوصف

المسار يقبل من المستخدم قيمة `gsPath` كاملة، مثل:

```text
gs://bucket-name/path/to/file
```

ثم يفكها ويقرأ مباشرة من التخزين بدون مصادقة وبدون تحقق من bucket أو prefix أو ACL.

### الأثر المحتمل

- قراءة أي ملف يستطيع حساب الخدمة الوصول إليه.
- كشف ملفات خاصة من buckets مرتبطة بالمشروع.
- تسهيل enumeration لمسارات التخزين إذا كانت الأسماء متوقعة.

### توصية الإصلاح

1. لا تقبل `gs://` كاملاً من المستخدم.
2. استبدل المسار بـ endpoint يعتمد على `mediaFileId`:

```text
GET /api/media/proxy/:id
```

3. اجلب السجل من قاعدة البيانات ثم تحقق من:

- أن الملف عام، أو
- أن المستخدم مالك الملف، أو
- أن لديه صلاحية قراءة الملف.

4. اسمح فقط بـ bucket الحالي وprefix محدد.
5. امنع أي path يحتوي على `.private/` إلا بعد فحص ACL.

## 3. تركيب بعض route modules قبل المصادقة وCSRF

الشدة: عالية  
الملفات:

- `server/index.ts`
- `server/routes.ts`

### الوصف

في `server/index.ts` يتم تركيب بعض المسارات قبل استدعاء `registerRoutes(app, server)`. داخل `registerRoutes` يتم تنفيذ:

```ts
await setupAuth(app);
app.use("/api", validateCsrfToken);
```

لكن قبل ذلك يتم تركيب:

- `/api/audio-newsletters`
- `/api/v1`

ومسارات أخرى لاحقاً بعد `registerRoutes` مثل:

- `/api/nano-banana`
- `/api/notebooklm`
- `/api/visual-ai`
- `/api/auto-image`
- `/api/thumbnails`
- `/api/rss`
- `/api/ai-tasks`
- `/api/advanced-analytics`
- `/api/media-store`

المسارات التي تتركب قبل auth/CSRF لن تمر بالضرورة عبر نفس طبقات الحماية المركزية.

### الأثر المحتمل

- تجاوز CSRF لبعض POST/PUT/PATCH/DELETE.
- فشل أو ارتباك في `req.isAuthenticated` لبعض route modules.
- تفاوت أمني بين مسارات API حسب ترتيب تركيبها.

### توصية الإصلاح

اجعل ترتيب middleware مركزياً:

1. parsers/cookie/rate limits
2. `setupAuth(app)`
3. `app.get("/api/csrf-token", getCsrfToken)`
4. `app.use("/api", validateCsrfToken)`
5. تركيب كل route modules

ويفضّل نقل `setupAuth` وCSRF من `registerRoutes` إلى `server/index.ts` حتى يكون الترتيب واضحاً ومضموناً لكل المسارات.

## 4. APM endpoints عامة

الشدة: عالية  
الملف: `server/index.ts`

### الوصف

المسارات التالية عامة:

- `GET /api/apm/stats`
- `POST /api/apm/reset`

تعرض `stats` معلومات مثل:

- `uptime`
- `memoryUsage`
- متوسط زمن الاستجابة
- p95 response time
- slow requests
- top error paths

كما أن `reset` يغيّر حالة النظام بدون مصادقة.

### الأثر المحتمل

- كشف معلومات تشغيل داخلية تساعد على الاستهداف.
- معرفة أكثر المسارات خطأً أو بطئاً.
- العبث بقياسات المراقبة.

### توصية الإصلاح

1. احمِ هذه المسارات:

```ts
requireAuth
requirePermission("system.manage_settings")
```

2. أو عطّلها بالكامل في الإنتاج:

```ts
if (process.env.NODE_ENV !== "production") {
  app.get("/api/apm/stats", ...)
}
```

3. لا تعرض `memoryUsage` وerror paths في response عام.

## 5. استثناءات CSRF واسعة جداً

الشدة: عالية  
الملف: `server/csrf.ts`

### الوصف

قائمة `EXEMPT_PATHS` تستخدم prefixes واسعة مثل:

- `/api/articles/`
- `/api/en/articles/`
- `/api/v1/`
- `/api/whatsapp/`
- `/api/store/cart`
- `/api/editor-presence/`

ودالة الفحص تقبل أي path يبدأ بهذه القيم:

```ts
path.startsWith(exempt)
```

### الأثر المحتمل

أي مسار جديد state-changing يضاف تحت هذه prefixes سيتجاوز CSRF تلقائياً، حتى لو كان يحتاج حماية.

### توصية الإصلاح

1. استبدل prefix allowlist بقواعد دقيقة تشمل method وpath.
2. مثال:

```ts
const EXEMPT_ROUTES = [
  { method: "POST", path: /^\/api\/articles\/[^/]+\/view$/ },
  { method: "POST", path: /^\/api\/analytics\/visitors\/ping$/ },
];
```

3. راجع كل استثناء وحدد لماذا هو عام.
4. لا تستثنِ `/api/v1/` بالكامل. استخدم token auth مستقل للموبايل أو CSRF للطلبات المعتمدة على cookie.

## 6. Rate limiting يتجاوز المستخدمين أصحاب الجلسات

الشدة: عالية  
الملف: `server/index.ts`

### الوصف

في `generalApiLimiter` و`writeLimiter` يوجد:

```ts
if (hasSessionCookie(req)) return true;
```

أي طلب يحتوي `connect.sid` يتجاوز حدود الطلبات العامة والكتابية.

### الأثر المحتمل

- حساب مخترق يستطيع إغراق الخادم بطلبات كتابة.
- استنزاف خدمات AI/TTS/التخزين.
- DoS داخلي من مستخدم مسجل.

### توصية الإصلاح

1. لا تتجاوز limits لمجرد وجود session.
2. استخدم مفاتيح rate limit مبنية على:

- userId للمستخدم المصادق.
- IP للزوار.
- userId + endpoint للعمليات المكلفة.

3. ضع حدوداً خاصة للمسارات المكلفة:

- AI generation
- TTS voice test
- media upload
- analytics tracking
- auth/password reset

## 7. CSP ضعيفة بسبب `unsafe-inline` و`https:` عام

الشدة: متوسطة  
الملف: `server/index.ts`

### الوصف

سياسة CSP في الإنتاج تسمح بـ:

```ts
scriptSrc: ["'self'", "'unsafe-inline'", "https:", "blob:"]
connectSrc: ["'self'", "https:", "ws:", "wss:"]
frameSrc: ["'self'", "https:"]
styleSrc: ["'self'", "'unsafe-inline'", "https:"]
```

وجود `unsafe-inline` و`https:` عام يقلل كثيراً من فاعلية CSP ضد XSS.

### الأثر المحتمل

- إذا وُجدت ثغرة حقن HTML/JS في المحتوى، ستكون CSP أقل قدرة على منع التنفيذ.
- السماح لأي مصدر HTTPS للسكريبتات يزيد أثر supply-chain أو injection.

### توصية الإصلاح

1. استخدم nonce أو hash للسكريبتات inline.
2. قلّص الدومينات المسموحة إلى قائمة دقيقة.
3. ابدأ بوضع `Content-Security-Policy-Report-Only` ثم راقب التقارير قبل enforcement.
4. راجع مكونات تستخدم `dangerouslySetInnerHTML` وتأكد من sanitization قبل العرض.

## 8. سياسة كلمة مرور ضعيفة نسبياً

الشدة: متوسطة  
الملف: `server/routes.ts`

### الوصف

التسجيل يقبل كلمة مرور بطول 6 أحرف فقط.

### الأثر المحتمل

- زيادة خطر التخمين والـ credential stuffing.
- ضعف أمان الحسابات غير المحمية بـ 2FA.

### توصية الإصلاح

1. ارفع الحد الأدنى إلى 12 حرفاً.
2. افحص كلمات المرور الشائعة أو المسربة.
3. طبّق نفس السياسة على:

- register
- reset password
- set password
- admin-created passwords

4. أبقِ bcrypt cost عند 12 أو أعلى حسب أداء الخادم.

## 9. تسجيل معلومات حساسة أو زائدة

الشدة: متوسطة  
الملفات:

- `server/auth.ts`
- `server/routes.ts`
- `server/objectStorage.ts`

### الوصف

توجد سجلات كثيرة تتضمن:

- بريد المستخدم أثناء login.
- حالة نجاح/فشل كلمة المرور.
- مسارات upload URL.
- أسماء buckets وpaths.

### الأثر المحتمل

- في حال وصول طرف غير مصرح للسجلات قد يستفيد من مسارات التخزين أو بيانات الحسابات.
- زيادة حساسية logs في بيئة الإنتاج.

### توصية الإصلاح

1. في الإنتاج، لا تسجل البريد الكامل. استخدم masking.
2. لا تطبع upload URLs أو private paths.
3. استخدم logger مركزي مع redaction للحقول:

- password
- token
- secret
- authorization
- cookie
- privateKey
- uploadURL

## 10. مسارات عامة قد تستنزف خدمات خارجية

الشدة: متوسطة إلى عالية حسب تكلفة الخدمة  
أمثلة:

- `POST /api/audio-newsletters/voices/test`
- مسارات tracking عامة
- بعض مسارات AI/chat العامة

### الوصف

بعض المسارات العامة تستدعي خدمات خارجية أو تكتب analytics. إن لم تكن محمية بحدود صارمة فقد تستنزف الميزانية أو الموارد.

### الأثر المحتمل

- استنزاف رصيد TTS/AI.
- نمو زائد في قاعدة البيانات بسبب tracking.
- DoS منطقي على خدمات الخلفية.

### توصية الإصلاح

1. أضف rate limits صارمة لكل مسار مكلف.
2. أضف CAPTCHA أو proof-of-work خفيف للعمليات العامة المكلفة.
3. حدّد حجم النصوص والمدخلات.
4. خزّن نتائج test voice مؤقتاً عندما يكون النص والvoice settings مكرراً.

## 11. ثغرات الاعتماديات

تم تشغيل:

```bash
npm audit --omit=dev --json
```

النتيجة:

- إجمالي الثغرات: 17
- عالية: 10
- متوسطة: 2
- منخفضة: 5
- حرجة: 0

### أهم النتائج

#### 11.1 `drizzle-orm`

الشدة: عالية  
الإصدار الحالي: `^0.39.1`  
النطاق المتأثر: أقل من `0.45.2`  
الوصف: SQL injection عبر escaping غير صحيح لبعض SQL identifiers.  
الحل: التحديث إلى `0.45.2` أو أحدث، ثم تشغيل TypeScript والاختبارات ومراجعة الاستعلامات المخصصة.

#### 11.2 `xlsx`

الشدة: عالية  
الوصف:

- Prototype Pollution
- ReDoS

لا يوجد fix مباشر عبر `npm audit`.

الحل:

- استبداله بـ `exceljs` إن أمكن.
- أو عزل معالجة Excel في worker/process محدود الموارد.
- فرض حدود حجم الملف وعدد الصفوف ووقت المعالجة.
- عدم قبول ملفات Excel من مستخدمين غير موثوقين بدون فحص.

#### 11.3 `tar` عبر Capacitor

الشدة: عالية  
الوصف: path traversal وarbitrary file overwrite في `node-tar`.  
الحل:

- تحديث Capacitor stack عند توفر إصدار آمن.
- عدم استخراج أرشيفات غير موثوقة.
- تشغيل build tooling في بيئة CI معزولة.

#### 11.4 `@xmldom/xmldom`

الشدة: عالية  
الوصف: XML injection وDoS عبر serialization.  
الحل:

- تحديث الحزم التي تجلبه transitively.
- عدم معالجة XML غير موثوق عبر هذه السلسلة.
- عزل استخدام أدوات Capacitor/Trapeze في بيئة build فقط.

#### 11.5 `express-rate-limit`

الشدة: متوسطة  
الوصف: ثغرة في dependency `ip-address`.  
الحل:

- راقب تحديث رسمي مناسب.
- لا تعتمد على HTML-emitting methods من `ip-address`.
- يمكن تثبيت override إذا توفر إصدار آمن متوافق.

## خطة إصلاح مقترحة

### خلال 24 ساعة

1. حماية أو تعطيل `/api/apm/stats` و`/api/apm/reset`.
2. تعطيل `/api/storage/proxy/:gsPath` أو جعله يتطلب auth وصلاحية.
3. إزالة `forcePublic` من `/objects/*`.
4. منع fallback إلى legacy `.private` من public object search.

### خلال أسبوع

1. إعادة ترتيب middleware بحيث تمر كل route modules عبر auth وCSRF.
2. تضييق CSRF exemptions إلى method/path allowlist.
3. إعادة تصميم rate limiting حسب userId/IP/endpoint.
4. تشديد سياسة كلمة المرور.
5. مراجعة كل مسارات AI/TTS العامة وإضافة limits.

### خلال أسبوعين

1. تحديث `drizzle-orm` واختبار الاستعلامات.
2. وضع خطة استبدال أو عزل `xlsx`.
3. تحسين CSP تدريجياً عبر Report-Only.
4. إضافة اختبارات أمنية تلقائية لمسارات التخزين وCSRF.
5. إضافة redaction للسجلات.

## اختبارات تحقق مقترحة بعد الإصلاح

1. طلب ملف private من `/public-objects/*` يجب أن يرجع 404 أو 403.
2. طلب ملف private من `/objects/*` بدون login يجب أن يرجع 401.
3. طلب `/api/storage/proxy/gs%3A%2F%2F...` بدون صلاحية يجب أن يرجع 401 أو 403.
4. كل POST غير مستثنى تحت `/api` بدون `x-csrf-token` يجب أن يرجع 403.
5. route module مركب خارج `registerRoutes` يجب أن يمر عبر auth وCSRF.
6. `/api/apm/stats` بدون صلاحية يجب أن يرجع 401 أو 403.
7. مستخدم مصادق لا يستطيع تجاوز rate limit على عمليات مكلفة.
8. ملفات SVG أو HTML المرفوعة لا تُعرض inline.
9. `npm audit --omit=dev` بعد التحديث يجب أن ينخفض، مع توثيق أي استثناءات متبقية.

## ملاحظات ختامية

هذه مراجعة ساكنة وليست اختبار اختراق ديناميكي. النتائج الحالية كافية لتحديد أولويات أمنية واضحة، لكن يوصى بعد الإصلاح بتشغيل اختبار ديناميكي محدود على بيئة staging، خصوصاً لمسارات التخزين، CSRF، الرفع، والـ APIs العامة المكلفة.
