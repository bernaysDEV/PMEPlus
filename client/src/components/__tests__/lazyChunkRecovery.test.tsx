import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComponentType } from "react";

import { CHUNK_RECOVERY_ERROR } from "@/lib/softRetryImport";

// Make the soft-retry helper effectively instant in tests so the four
// attempts (1 initial + 3 retries) don't add real wall-clock delay. We
// keep the rest of the recovery semantics — including the sentinel
// CHUNK_RECOVERY_ERROR — exactly as production uses them.
vi.mock("@/lib/softRetryImport", async () => {
  const actual = await vi.importActual<typeof import("@/lib/softRetryImport")>(
    "@/lib/softRetryImport",
  );
  return {
    ...actual,
    softRetryImport: <T,>(loader: () => Promise<T>) =>
      actual.softRetryImport(loader, 3, 1),
  };
});

// Spy on the cache-bust helpers so we can assert no escalation path was
// taken when a section's chunk fails. The recovery flow in the production
// app reaches `cacheBustReload` via the global ErrorBoundary; the section
// boundary should never get there for a chunk error.
vi.mock("@/lib/cacheBust", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cacheBust")>(
    "@/lib/cacheBust",
  );
  return {
    ...actual,
    cacheBustReload: vi.fn(),
    hardReset: vi.fn(),
  };
});

import { cacheBustReload, hardReset } from "@/lib/cacheBust";
import { LazyChunk } from "@/components/LazyChunk";
import { LazySection } from "@/components/LazySection";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

const locationMocks = (
  globalThis as unknown as {
    __locationMocks: { reload: ReturnType<typeof vi.fn>; replace: ReturnType<typeof vi.fn>; assign: ReturnType<typeof vi.fn> };
  }
).__locationMocks;

function makeChunkError(): Error {
  return new Error("Failed to fetch dynamically imported module: /assets/chunk-abc.js");
}

function ResolvedComponent() {
  return <div data-testid="resolved-section">resolved-content</div>;
}

// React surfaces caught render errors via window.dispatchEvent("error") and
// also logs them through console.error; SectionErrorBoundary additionally
// console.warns the sentinel CHUNK_LOAD_RECOVERY_PENDING. All of that noise
// is *expected* for these tests — they exist precisely to drive the failure
// path — so silence it to keep CI logs readable. We restore the originals
// after the suite so other tests aren't affected.
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let windowErrorHandler: (event: ErrorEvent) => void;

beforeAll(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  // jsdom re-dispatches uncaught errors caught by React's error boundary as
  // window 'error' events. Swallow them here so vitest doesn't mark the
  // test as failing from an "unhandled" event.
  windowErrorHandler = (event: ErrorEvent) => {
    if (event?.error?.message?.includes(CHUNK_RECOVERY_ERROR) ||
        event?.message?.includes(CHUNK_RECOVERY_ERROR) ||
        event?.error?.message?.includes("Loading chunk") ||
        event?.message?.includes("Loading chunk")) {
      event.preventDefault();
    }
  };
  window.addEventListener("error", windowErrorHandler);
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  window.removeEventListener("error", windowErrorHandler);
});

beforeEach(() => {
  vi.mocked(cacheBustReload).mockClear();
  vi.mocked(hardReset).mockClear();
});

describe("section-level chunk recovery (no full-page reload)", () => {
  it("LazyChunk shows the inline retry placeholder and does NOT trigger a page reload when the chunk import fails", async () => {
    const chunkError = makeChunkError();
    const loader = vi
      .fn<() => Promise<ComponentType>>()
      // softRetryImport will retry 3 times after the first failure (4 total),
      // so reject 4 times before any retry-button-driven recovery.
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError);

    render(
      <LazyChunk
        loader={loader}
        render={(C) => <C />}
        fallback={<div data-testid="lazy-chunk-loading">loading…</div>}
        testId="lazy-chunk"
      />,
    );

    expect(await screen.findByTestId("lazy-chunk-error")).toBeInTheDocument();
    expect(screen.getByTestId("lazy-chunk-error-button")).toBeInTheDocument();

    // The whole point: no global reload escalation should have fired.
    expect(locationMocks.reload).not.toHaveBeenCalled();
    expect(locationMocks.replace).not.toHaveBeenCalled();
    expect(cacheBustReload).not.toHaveBeenCalled();
    expect(hardReset).not.toHaveBeenCalled();

    // Loader was hit the expected 4 times during soft retry.
    expect(loader).toHaveBeenCalledTimes(4);
  });

  it("LazyChunk recovers when the user taps the retry button and the loader subsequently succeeds", async () => {
    const user = userEvent.setup();
    const chunkError = makeChunkError();
    const loader = vi
      .fn<() => Promise<ComponentType>>()
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockResolvedValue(ResolvedComponent);

    render(
      <LazyChunk
        loader={loader}
        render={(C) => <C />}
        fallback={<div data-testid="lazy-chunk-loading">loading…</div>}
        testId="lazy-chunk"
      />,
    );

    const retryBtn = await screen.findByTestId("lazy-chunk-error-button");

    await act(async () => {
      await user.click(retryBtn);
    });

    expect(await screen.findByTestId("resolved-section")).toBeInTheDocument();
    // Retry should have re-invoked the loader at least once more.
    expect(loader.mock.calls.length).toBeGreaterThanOrEqual(5);

    // Still no escalation, even after a successful recovery.
    expect(locationMocks.reload).not.toHaveBeenCalled();
    expect(locationMocks.replace).not.toHaveBeenCalled();
    expect(cacheBustReload).not.toHaveBeenCalled();
  });

  it("home-page LazySection shows section-inline-error and never reloads on a failed chunk", async () => {
    const chunkError = makeChunkError();
    const loader = vi
      .fn<() => Promise<ComponentType>>()
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError);

    render(
      <LazySection
        eager
        loader={loader}
        render={(C) => <C />}
      />,
    );

    expect(await screen.findByTestId("section-inline-error")).toBeInTheDocument();
    expect(screen.getByTestId("button-section-retry")).toBeInTheDocument();

    expect(locationMocks.reload).not.toHaveBeenCalled();
    expect(locationMocks.replace).not.toHaveBeenCalled();
    expect(cacheBustReload).not.toHaveBeenCalled();
    expect(hardReset).not.toHaveBeenCalled();
    expect(loader).toHaveBeenCalledTimes(4);
  });

  it("home-page LazySection re-invokes the loader on retry and renders the resolved component", async () => {
    const user = userEvent.setup();
    const chunkError = makeChunkError();
    const loader = vi
      .fn<() => Promise<ComponentType>>()
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockRejectedValueOnce(chunkError)
      .mockResolvedValue(ResolvedComponent);

    render(
      <LazySection
        eager
        loader={loader}
        render={(C) => <C />}
      />,
    );

    const retryBtn = await screen.findByTestId("button-section-retry");

    await act(async () => {
      await user.click(retryBtn);
    });

    expect(await screen.findByTestId("resolved-section")).toBeInTheDocument();
    expect(loader.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(locationMocks.reload).not.toHaveBeenCalled();
    expect(cacheBustReload).not.toHaveBeenCalled();
  });

  it("SectionErrorBoundary shows the inline fallback for chunk-load errors and does not re-throw", async () => {
    const chunkError = new Error(
      "ChunkLoadError: Loading chunk 42 failed at /assets/chunk-42.js",
    );

    function Boom(): JSX.Element {
      throw chunkError;
    }

    render(
      <SectionErrorBoundary fallback={<div data-testid="boundary-fallback">caught</div>}>
        <Boom />
      </SectionErrorBoundary>,
    );

    expect(screen.getByTestId("boundary-fallback")).toBeInTheDocument();
    expect(locationMocks.reload).not.toHaveBeenCalled();
    expect(cacheBustReload).not.toHaveBeenCalled();
  });

  it("softRetryImport rejects with the CHUNK_RECOVERY_ERROR sentinel after retries are exhausted (no reload)", async () => {
    const actual = await vi.importActual<typeof import("@/lib/softRetryImport")>(
      "@/lib/softRetryImport",
    );

    const chunkError = makeChunkError();
    const loader = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValue(chunkError);

    await expect(actual.softRetryImport(loader, 2, 1)).rejects.toMatchObject({
      message: CHUNK_RECOVERY_ERROR,
    });

    expect(loader).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    expect(locationMocks.reload).not.toHaveBeenCalled();
    expect(cacheBustReload).not.toHaveBeenCalled();
  });
});
