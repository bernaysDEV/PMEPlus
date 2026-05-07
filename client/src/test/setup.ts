import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

(window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

const originalLocation = window.location;
const reloadMock = vi.fn();
const replaceMock = vi.fn();
const assignMock = vi.fn();

Object.defineProperty(window, "location", {
  configurable: true,
  enumerable: true,
  value: new Proxy(originalLocation, {
    get(target, prop, receiver) {
      if (prop === "reload") return reloadMock;
      if (prop === "replace") return replaceMock;
      if (prop === "assign") return assignMock;
      return Reflect.get(target, prop, receiver);
    },
  }),
});

(globalThis as unknown as { __locationMocks: { reload: typeof reloadMock; replace: typeof replaceMock; assign: typeof assignMock } }).__locationMocks = {
  reload: reloadMock,
  replace: replaceMock,
  assign: assignMock,
};

afterEach(() => {
  cleanup();
  reloadMock.mockClear();
  replaceMock.mockClear();
  assignMock.mockClear();
});
