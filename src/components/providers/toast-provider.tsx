"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (params: { type?: ToastType; title: string; message?: string }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = "info", title, message }: { type?: ToastType; title: string; message?: string }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => addToast({ type: "success", title, message }), [addToast]);
  const error = useCallback((title: string, message?: string) => addToast({ type: "error", title, message }), [addToast]);
  const warning = useCallback((title: string, message?: string) => addToast({ type: "warning", title, message }), [addToast]);
  const info = useCallback((title: string, message?: string) => addToast({ type: "info", title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map((t) => {
          let bg = "bg-card border-border text-foreground";
          let icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;

          if (t.type === "success") {
            bg = "bg-emerald-950/90 border-emerald-800 text-emerald-100 dark:bg-emerald-900/90";
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          } else if (t.type === "error") {
            bg = "bg-rose-950/90 border-rose-800 text-rose-100 dark:bg-rose-900/90";
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          } else if (t.type === "warning") {
            bg = "bg-amber-950/90 border-amber-800 text-amber-100 dark:bg-amber-900/90";
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${bg}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{t.title}</div>
                {t.message && <div className="text-xs opacity-90 mt-0.5 leading-relaxed">{t.message}</div>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="opacity-70 hover:opacity-100 p-0.5 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
