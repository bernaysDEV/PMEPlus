import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  PlusCircle,
  Edit,
  Trash2,
  Search,
  Loader2,
  ExternalLink,
  Upload,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest, getCsrfToken } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/DashboardLayout";
import type { Developer } from "@shared/schema";

const developerFormSchema = z.object({
  nameAr: z.string().min(2, "الاسم بالعربية مطلوب (حرفان على الأقل)"),
  nameEn: z.string().min(2, "الاسم بالإنجليزية مطلوب (حرفان على الأقل)"),
  slug: z
    .string()
    .min(2, "الرابط المختصر مطلوب")
    .regex(/^[a-z0-9-]+$/i, "الرابط يجب أن يحتوي حروف لاتينية وأرقام وشرطات فقط"),
  logoUrl: z
    .string()
    .url("رابط الشعار يجب أن يكون صحيحاً")
    .optional()
    .or(z.literal("")),
  country: z.string().length(2, "رمز الدولة يجب أن يكون من حرفين (مثال: AE)"),
  countryNameAr: z.string().min(2, "اسم الدولة بالعربية مطلوب"),
  city: z.string().optional().or(z.literal("")),
  cityNameAr: z.string().optional().or(z.literal("")),
  website: z
    .string()
    .url("رابط الموقع يجب أن يكون صحيحاً")
    .optional()
    .or(z.literal("")),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "اللون يجب بصيغة hex مثل #0a3d62")
    .optional()
    .or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  establishedYear: z
    .union([
      z
        .number()
        .int()
        .min(1800, "سنة التأسيس غير صحيحة")
        .max(new Date().getFullYear(), "سنة التأسيس غير صحيحة"),
      z.nan(),
    ])
    .optional()
    .nullable(),
  sortOrder: z.coerce.number().int().min(0),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
});

type DeveloperFormValues = z.infer<typeof developerFormSchema>;

const defaultValues: DeveloperFormValues = {
  nameAr: "",
  nameEn: "",
  slug: "",
  logoUrl: "",
  country: "",
  countryNameAr: "",
  city: "",
  cityNameAr: "",
  website: "",
  brandColor: "",
  description: "",
  establishedYear: null,
  sortOrder: 0,
  isFeatured: false,
  isActive: true,
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("");
}

function nullify(values: DeveloperFormValues) {
  const out: Record<string, unknown> = { ...values };
  ["logoUrl", "city", "cityNameAr", "website", "brandColor", "description"].forEach((k) => {
    if (out[k] === "") out[k] = null;
  });
  if (
    out.establishedYear === undefined ||
    out.establishedYear === null ||
    Number.isNaN(out.establishedYear as number)
  ) {
    out.establishedYear = null;
  }
  return out;
}

export default function RealEstateDevelopersAdmin() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Developer | null>(null);
  const [deleting, setDeleting] = useState<Developer | null>(null);
  const [search, setSearch] = useState("");

  const { data: developers, isLoading } = useQuery<Developer[]>({
    queryKey: ["/api/developers"],
  });

  const form = useForm<DeveloperFormValues>({
    resolver: zodResolver(developerFormSchema),
    defaultValues,
  });

  const editForm = useForm<DeveloperFormValues>({
    resolver: zodResolver(developerFormSchema),
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: async (values: DeveloperFormValues) => {
      return await apiRequest("/api/developers", {
        method: "POST",
        body: JSON.stringify(nullify(values)),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate-pulse"] });
      toast({ title: "تمت الإضافة", description: "تم إضافة المطور بنجاح" });
      setIsCreateOpen(false);
      form.reset(defaultValues);
    },
    onError: (err: Error) => {
      toast({
        title: "خطأ",
        description: err.message || "فشل إضافة المطور",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: DeveloperFormValues }) => {
      return await apiRequest(`/api/developers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(nullify(values)),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate-pulse"] });
      toast({ title: "تم التحديث", description: "تم تحديث بيانات المطور" });
      setEditing(null);
    },
    onError: (err: Error) => {
      toast({
        title: "خطأ",
        description: err.message || "فشل تحديث المطور",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/developers/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/developers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/real-estate-pulse"] });
      toast({ title: "تم الحذف", description: "تم حذف المطور بنجاح" });
      setDeleting(null);
    },
    onError: (err: Error) => {
      toast({
        title: "خطأ",
        description: err.message || "فشل حذف المطور",
        variant: "destructive",
      });
    },
  });

  const openEdit = (dev: Developer) => {
    editForm.reset({
      nameAr: dev.nameAr,
      nameEn: dev.nameEn,
      slug: dev.slug,
      logoUrl: dev.logoUrl ?? "",
      country: dev.country,
      countryNameAr: dev.countryNameAr,
      city: dev.city ?? "",
      cityNameAr: dev.cityNameAr ?? "",
      website: dev.website ?? "",
      brandColor: dev.brandColor ?? "",
      description: dev.description ?? "",
      establishedYear: dev.establishedYear ?? null,
      sortOrder: dev.sortOrder,
      isFeatured: dev.isFeatured,
      isActive: dev.isActive,
    });
    setEditing(dev);
  };

  const filtered = useMemo(() => {
    if (!developers) return [] as Developer[];
    const q = search.trim().toLowerCase();
    if (!q) return developers;
    return developers.filter(
      (d) =>
        d.nameAr.toLowerCase().includes(q) ||
        d.nameEn.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q),
    );
  }, [developers, search]);

  return (
    <DashboardLayout>
      <div dir="rtl" className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold md:text-2xl" data-testid="text-page-title">
                المطورون العقاريون
              </h1>
              <p className="text-xs text-muted-foreground">
                إدارة شركات التطوير العقاري الظاهرة في كتلة "نبض الشركات العقارية"
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              form.reset(defaultValues);
              setIsCreateOpen(true);
            }}
            data-testid="button-add-developer"
          >
            <PlusCircle className="ml-2 h-4 w-4" />
            إضافة مطور
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span>قائمة المطورين</span>
              <div className="relative w-full max-w-sm">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الرابط..."
                  className="pr-9"
                  data-testid="input-search-developers"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">لا توجد نتائج</p>
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.map((dev) => (
                  <li
                    key={dev.id}
                    className="flex items-center gap-3 p-3 md:gap-4 md:p-4"
                    data-testid={`row-admin-developer-${dev.id}`}
                  >
                    <Avatar className="h-10 w-10 shrink-0 md:h-12 md:w-12">
                      {dev.logoUrl ? <AvatarImage src={dev.logoUrl} alt={dev.nameAr} /> : null}
                      <AvatarFallback className="text-xs font-bold">
                        {getInitials(dev.nameAr)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className="truncate text-sm font-semibold md:text-base"
                          data-testid={`text-admin-name-${dev.id}`}
                        >
                          {dev.nameAr}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          {dev.countryNameAr}
                        </Badge>
                        {dev.isActive ? (
                          <Badge variant="default" className="text-[10px]">
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            غير نشط
                          </Badge>
                        )}
                        {dev.isFeatured ? (
                          <Badge
                            className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                            data-testid={`badge-featured-${dev.id}`}
                          >
                            <Star className="ml-1 h-3 w-3" />
                            مميَّز
                          </Badge>
                        ) : null}
                        {dev.establishedYear ? (
                          <span className="text-[10px] text-muted-foreground">
                            تأسست {dev.establishedYear}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>الرابط: {dev.slug}</span>
                        {dev.website && (
                          <a
                            href={dev.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-primary"
                            data-testid={`link-website-${dev.id}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            الموقع
                          </a>
                        )}
                        <span>الترتيب: {dev.sortOrder}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(dev)}
                        data-testid={`button-edit-developer-${dev.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(dev)}
                        data-testid={`button-delete-developer-${dev.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة مطور عقاري</DialogTitle>
            <DialogDescription>أدخل بيانات شركة التطوير العقاري</DialogDescription>
          </DialogHeader>
          <DeveloperFormFields
            form={form}
            onSubmit={(values) => createMutation.mutate(values)}
            submitLabel="إضافة"
            isPending={createMutation.isPending}
            onCancel={() => setIsCreateOpen(false)}
            testIdPrefix="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل المطور</DialogTitle>
            <DialogDescription>تحديث بيانات شركة التطوير العقاري</DialogDescription>
          </DialogHeader>
          {editing && (
            <DeveloperFormFields
              form={editForm}
              onSubmit={(values) =>
                updateMutation.mutate({ id: editing.id, values })
              }
              submitLabel="حفظ التعديلات"
              isPending={updateMutation.isPending}
              onCancel={() => setEditing(null)}
              testIdPrefix="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المطور</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد حذف "{deleting?.nameAr}"؟ سيتم إلغاء ربطه بالمقالات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              )}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

interface DeveloperFormFieldsProps {
  form: ReturnType<typeof useForm<DeveloperFormValues>>;
  onSubmit: (values: DeveloperFormValues) => void;
  submitLabel: string;
  isPending: boolean;
  onCancel: () => void;
  testIdPrefix: string;
}

function DeveloperFormFields({
  form,
  onSubmit,
  submitLabel,
  isPending,
  onCancel,
  testIdPrefix,
}: DeveloperFormFieldsProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nameAr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الاسم بالعربية *</FormLabel>
                <FormControl>
                  <Input {...field} data-testid={`input-${testIdPrefix}-nameAr`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الاسم بالإنجليزية *</FormLabel>
                <FormControl>
                  <Input {...field} dir="ltr" data-testid={`input-${testIdPrefix}-nameEn`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الرابط المختصر *</FormLabel>
              <FormControl>
                <Input {...field} dir="ltr" data-testid={`input-${testIdPrefix}-slug`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الشعار</FormLabel>
              <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14 shrink-0 rounded-md">
                  {field.value ? <AvatarImage src={field.value} alt="logo" /> : null}
                  <AvatarFallback className="rounded-md text-xs text-muted-foreground">
                    LOGO
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <FormControl>
                    <Input
                      {...field}
                      dir="ltr"
                      placeholder="https://..."
                      data-testid={`input-${testIdPrefix}-logoUrl`}
                    />
                  </FormControl>
                  <LogoUploader
                    onUploaded={(url) => field.onChange(url)}
                    testIdPrefix={testIdPrefix}
                  />
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رمز الدولة (ISO) *</FormLabel>
                <FormControl>
                  <Input {...field} dir="ltr" placeholder="AE" maxLength={2} data-testid={`input-${testIdPrefix}-country`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="countryNameAr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم الدولة بالعربية *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="الإمارات" data-testid={`input-${testIdPrefix}-countryNameAr`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المدينة</FormLabel>
                <FormControl>
                  <Input {...field} dir="ltr" placeholder="dubai" data-testid={`input-${testIdPrefix}-city`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cityNameAr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المدينة بالعربية</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="دبي" data-testid={`input-${testIdPrefix}-cityNameAr`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الموقع الإلكتروني</FormLabel>
              <FormControl>
                <Input {...field} dir="ltr" placeholder="https://..." data-testid={`input-${testIdPrefix}-website`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brandColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>لون العلامة التجارية</FormLabel>
              <FormControl>
                <Input {...field} dir="ltr" placeholder="#0a3d62" data-testid={`input-${testIdPrefix}-brandColor`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>وصف مختصر</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} data-testid={`textarea-${testIdPrefix}-description`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="establishedYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>سنة التأسيس</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="1997"
                    value={
                      field.value === null || field.value === undefined
                        ? ""
                        : String(field.value)
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === "" ? null : Number(v));
                    }}
                    data-testid={`input-${testIdPrefix}-establishedYear`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sortOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ترتيب العرض</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    data-testid={`input-${testIdPrefix}-sortOrder`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-3">
                <FormLabel className="m-0 inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4" />
                  مميَّز
                </FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid={`switch-${testIdPrefix}-isFeatured`}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-3">
                <FormLabel className="m-0">نشط</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid={`switch-${testIdPrefix}-isActive`}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel} data-testid={`button-${testIdPrefix}-cancel`}>
            إلغاء
          </Button>
          <Button type="submit" disabled={isPending} data-testid={`button-${testIdPrefix}-submit`}>
            {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

interface LogoUploaderProps {
  onUploaded: (url: string) => void;
  testIdPrefix: string;
}

function LogoUploader({ onUploaded, testIdPrefix }: LogoUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "يرجى اختيار صورة (PNG/JPG/WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "الملف كبير",
        description: "الحد الأقصى لحجم الشعار هو 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "developer-logo");
      formData.append("title", file.name);

      const csrfToken = getCsrfToken();
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: csrfToken ? { "x-csrf-token": csrfToken } : undefined,
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(errBody.message || `فشل الرفع (${response.status})`);
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("لم يتم استلام رابط الصورة من الخادم");
      }
      onUploaded(data.url);
      toast({ title: "تم الرفع", description: "تم رفع الشعار بنجاح" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل رفع الشعار";
      toast({ title: "خطأ", description: message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <label
      className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover-elevate active-elevate-2"
      data-testid={`label-${testIdPrefix}-logo-upload`}
    >
      {isUploading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
      <span>{isUploading ? "جاري الرفع..." : "رفع شعار من الجهاز"}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={handleFileChange}
        disabled={isUploading}
        data-testid={`input-${testIdPrefix}-logo-file`}
      />
    </label>
  );
}
