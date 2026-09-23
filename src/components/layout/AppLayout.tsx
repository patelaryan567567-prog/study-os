import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAppStore } from "@/store";
import { useAIChatStore } from "@/store/aiChatStore";
import { useState, useLayoutEffect, useRef, useEffect } from "react";
import { isNative } from "@/native/capacitorBridge";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAndroidBackHandler } from "@/hooks/useAndroidBackHandler";
import { CommandPalette } from "@/components/productivity/CommandPalette";
import { startPomodoro } from "@/services/focusClock";

const orbStyle = (
  top: string | undefined,
  bottom: string | undefined,
  left: string | undefined,
  right: string | undefined,
  width: string,
  height: string,
  color: string,
) => ({
  position: "absolute" as const,
  ...(top !== undefined && { top }),
  ...(bottom !== undefined && { bottom }),
  ...(left !== undefined && { left }),
  ...(right !== undefined && { right }),
  width,
  height,
  borderRadius: "50%",
  background: color,
  filter: "blur(80px)",
});

export function AppLayout() {
  const { focusMode } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const native = isNative();
  const topbarRef = useRef<HTMLDivElement>(null);

  // Native app (Android edge-to-edge): the scroll area is pinned to
  // `calc(100dvh - topbar height)` so its bottom edge never lands behind the
  // topbar/window (which previously clipped the last row of every page and
  // made it impossible to scroll down to it). Measure the topbar's real
  // rendered height (it includes the status-bar safe-area padding) into
  // `--studyos-topbar-height`, keeping it fresh on any size change.
  useLayoutEffect(() => {
    if (!native) return;
    const measure = () => {
      const el = topbarRef.current;
      if (!el) return;
      document.documentElement.style.setProperty(
        "--studyos-topbar-height",
        `${el.offsetHeight}px`,
      );
    };
    measure();
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined" && topbarRef.current) {
      observer = new ResizeObserver(measure);
      observer.observe(topbarRef.current);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [native]);

  // Desktop-only global keyboard shortcuts (disabled in the mobile/native app).
  useKeyboardShortcuts((action) => {
    if (action === "pomodoro") {
      startPomodoro();
      navigate("/focus");
    }
    else if (action === "note") navigate("/notes");
    else navigate("/tasks");
  });

  // Android hardware back button: close overlays → go back one page →
  // double-press to exit (native app only).
  useAndroidBackHandler();

  // Bootstrap the global AI chat store in the background on EVERY page: it
  // loads chat history, restores the account's saved API keys (so a re-login
  // never asks for them again) and keeps the topbar "AI working" indicator
  // alive across route changes. Idempotent — safe on every mount.
  useEffect(() => {
    void useAIChatStore.getState().init();
  }, []);

  if (focusMode) {
    return (
      <div
        className="h-full w-full"
        style={{ background: "var(--color-bg-primary)" }}
      >
        <Outlet />
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{ background: "#05060f" }}
    >
      {/* ── Ambient orbs — subtle, no white ── */}
      <div
        className="ambient-orbs fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          style={orbStyle(
            "-200px",
            undefined,
            "-150px",
            undefined,
            "700px",
            "700px",
            "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 60%)",
          )}
        />
        <div
          style={orbStyle(
            "-100px",
            undefined,
            undefined,
            "5%",
            "500px",
            "500px",
            "radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 60%)",
          )}
        />
        <div
          style={orbStyle(
            undefined,
            "-150px",
            "15%",
            undefined,
            "450px",
            "450px",
            "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)",
          )}
        />
        <div
          style={orbStyle(
            undefined,
            "-100px",
            undefined,
            "-100px",
            "500px",
            "500px",
            "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 60%)",
          )}
        />
        {/* Dot grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── Sidebar ── */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* ── Main area ── */}
      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden"
        style={{
          position: "relative",
          zIndex: 1,
          // No backdrop-filter here: it is expensive on every platform and on
          // Windows/Electron a blur layer above the content intermittently
          // swallows clicks meant for text fields (see electron/main.ts). The
          // frosted look is preserved by the per-surface backdrop utilities.
        }}
      >
        <div ref={topbarRef} className="shrink-0">
          <Topbar
            onMenuClick={() => setSidebarOpen(true)}
            dragDisabled={isSidebarOpen}
          />
        </div>
        <main className="app-scroll-area flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, ...(native ? {} : { y: 12 }) }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, ...(native ? {} : { y: -8 }) }}
              transition={{ duration: native ? 0.12 : 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="h-full"
              style={{
                padding: "clamp(12px, 2vw, 24px)",
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {!native && <CommandPalette />}
    </div>
  );
}
