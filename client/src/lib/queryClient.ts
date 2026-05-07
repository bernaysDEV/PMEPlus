import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

function getCsrfTokenFromCookie(): string | null {
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] : null;
}

let csrfToken: string | null = null;
let csrfInitPromise: Promise<void> | null = null;
let csrfRetryCount = 0;
const MAX_CSRF_RETRIES = 3;

async function fetchCsrfToken(): Promise<void> {
  if (csrfInitPromise) {
    return csrfInitPromise;
  }
  
  csrfInitPromise = (async () => {
    while (csrfRetryCount < MAX_CSRF_RETRIES) {
      try {
        const res = await fetch("/api/csrf-token", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          csrfToken = data.csrfToken;
          csrfRetryCount = 0;
          return;
        }
      } catch (e) {
        console.error("Failed to fetch CSRF token, attempt", csrfRetryCount + 1, e);
      }
      csrfRetryCount++;
      if (csrfRetryCount < MAX_CSRF_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, csrfRetryCount - 1)));
      }
    }
    csrfToken = getCsrfTokenFromCookie();
  })();
  
  await csrfInitPromise;
  csrfInitPromise = null;
}

export async function ensureCsrfToken(): Promise<string | null> {
  if (!csrfToken && !getCsrfTokenFromCookie()) {
    await fetchCsrfToken();
  }
  return csrfToken || getCsrfTokenFromCookie();
}

export async function initializeCsrf(): Promise<void> {
  await fetchCsrfToken();
}

async function refreshCsrfToken(): Promise<string | null> {
  csrfToken = null;
  csrfRetryCount = 0;
  csrfInitPromise = null;
  await fetchCsrfToken();
  return csrfToken;
}

export function getCsrfToken(): string | null {
  return csrfToken || getCsrfTokenFromCookie();
}

function handleSessionExpiration() {
  const currentPath = window.location.pathname + window.location.search;
  if (currentPath !== '/login') {
    localStorage.setItem('redirectAfterLogin', currentPath);
  }
  
  toast({
    title: "انتهت صلاحية جلستك",
    description: "يرجى تسجيل الدخول مرة أخرى",
    variant: "destructive",
  });
  
  setTimeout(() => {
    window.location.href = '/login';
  }, 2000);
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    if (res.status === 401) {
      handleSessionExpiration();
    }
    
    if (res.status === 429) {
      throw new Error("RATE_LIMITED");
    }
    
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      try {
        const data = JSON.parse(text);
        if (data?.message) {
          throw new Error(data.message);
        }
      } catch (e) {
        if (e instanceof Error && e.message !== text) {
          throw e;
        }
      }
      throw new Error("الخادم غير متاح مؤقتاً، يرجى المحاولة مرة أخرى");
    }
    
    if (res.status === 403) {
      try {
        const data = JSON.parse(text);
        if (data.message) {
          toast({
            title: "تنبيه",
            description: data.message,
            variant: "destructive",
          });
          throw new Error(data.message);
        }
      } catch (e) {
        if (e instanceof Error && e.message !== text) {
          throw e;
        }
      }
    }
    
    if (res.status === 409) {
      try {
        const data = JSON.parse(text);
        if (data.message) {
          throw new Error(data.message);
        }
      } catch (e) {
        if (e instanceof Error && e.message !== text) {
          throw e;
        }
      }
    }
    
    try {
      const data = JSON.parse(text);
      if (data.message) {
        throw new Error(data.message);
      }
    } catch (e) {
      if (e instanceof Error && e.message !== text) {
        throw e;
      }
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  url: string,
  options?: {
    method?: string;
    body?: string | FormData;
    headers?: Record<string, string>;
    isFormData?: boolean;
    onUploadProgress?: (progress: { loaded: number; total: number }) => void;
    _csrfRetry?: boolean;
  }
): Promise<T> {
  const method = options?.method || "GET";
  const isStateChangingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());

  if (isStateChangingMethod) {
    await ensureCsrfToken();
  }

  if (options?.isFormData && options.body instanceof FormData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && options.onUploadProgress) {
          options.onUploadProgress({ loaded: e.loaded, total: e.total });
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const contentType = xhr.getResponseHeader("content-type");
            if (contentType && contentType.includes("application/json")) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              resolve(xhr.response);
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        } else {
          if (xhr.status === 401) {
            handleSessionExpiration();
          }
          
          if (xhr.status === 403) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.message && (
                data.message.includes('رمز الحماية') || 
                data.message.includes('الجلسة غير متوفرة')
              )) {
                refreshCsrfToken();
                toast({
                  title: "يرجى المحاولة مرة أخرى",
                  description: "تم تحديث رمز الحماية",
                  variant: "default",
                });
                reject(new Error(data.message));
                return;
              }
              if (data.message) {
                toast({
                  title: "تنبيه",
                  description: data.message,
                  variant: "destructive",
                });
                reject(new Error(data.message));
                return;
              }
            } catch (e) {
            }
          }
          
          if (xhr.status === 409) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.message) {
                reject(new Error(data.message));
                return;
              }
            } catch (e) {
            }
          }
          
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.message) {
              reject(new Error(data.message));
              return;
            }
          } catch (e) {
          }
          
          reject(new Error(`${xhr.status}: ${xhr.responseText || xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.open(options?.method || 'POST', url);
      xhr.withCredentials = true;
      
      const token = getCsrfToken();
      if (token) {
        xhr.setRequestHeader("x-csrf-token", token);
      }
      
      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }

      xhr.send(options.body);
    });
  }

  async function makeRequest(retryAttempt = 0): Promise<T> {
    const currentCsrfToken = getCsrfToken();
    
    const headers: Record<string, string> = {
      ...(options?.body && typeof options.body === 'string' ? { "Content-Type": "application/json" } : {}),
      ...(options?.headers || {}),
    };
    
    if (isStateChangingMethod && currentCsrfToken) {
      headers["x-csrf-token"] = currentCsrfToken;
    }
    
    const res = await fetch(url, {
      method,
      headers,
      body: typeof options?.body === 'string' ? options.body : undefined,
      credentials: "include",
    });

    if (res.status === 403 && retryAttempt === 0 && isStateChangingMethod) {
      const text = await res.clone().text();
      try {
        const data = JSON.parse(text);
        if (data.message && (
          data.message.includes('رمز الحماية') || 
          data.message.includes('الجلسة غير متوفرة')
        )) {
          await refreshCsrfToken();
          return makeRequest(1);
        }
      } catch {
      }
    }

    await throwIfResNotOk(res);
    
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    
    return res as T;
  }
  
  return makeRequest();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = '';
    const params: Record<string, string> = {};
    
    for (const part of queryKey) {
      if (typeof part === 'string') {
        url += (url && !url.endsWith('/') ? '/' : '') + part;
      } else if (typeof part === 'object' && part !== null) {
        Object.entries(part).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params[key] = String(value);
          }
        });
      }
    }
    
    const queryString = new URLSearchParams(params).toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as unknown as T;
    }

    await throwIfResNotOk(res);
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return null as unknown as T;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 300000,
      gcTime: 600000,
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message === "RATE_LIMITED") {
          return failureCount < 3;
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(2000 * (attemptIndex + 1), 10000),
    },
    mutations: {
      retry: false,
    },
  },
});

if (typeof window !== 'undefined' && (window as any).__HOMEPAGE_DATA__) {
  queryClient.setQueryData(["/api/homepage-lite"], (window as any).__HOMEPAGE_DATA__);
  delete (window as any).__HOMEPAGE_DATA__;
}
