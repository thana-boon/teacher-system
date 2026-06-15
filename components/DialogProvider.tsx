"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type AlertOpts = { title?: string; confirmText?: string };
type ConfirmOpts = {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type DialogContextValue = {
  alert: (message: string, opts?: AlertOpts) => Promise<void>;
  confirm: (message: string, opts?: ConfirmOpts) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within <DialogProvider>");
  return ctx;
}

type State = {
  open: boolean;
  type: "alert" | "confirm";
  title?: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
};

const CLOSED: State = {
  open: false,
  type: "alert",
  message: "",
  confirmText: "ตกลง",
  cancelText: "ยกเลิก",
  danger: false,
};

export default function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(CLOSED);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const alert = useCallback((message: string, opts?: AlertOpts) => {
    return new Promise<void>((resolve) => {
      resolver.current = () => resolve();
      setState({
        open: true,
        type: "alert",
        message,
        title: opts?.title,
        confirmText: opts?.confirmText ?? "ตกลง",
        cancelText: "",
        danger: false,
      });
    });
  }, []);

  const confirm = useCallback((message: string, opts?: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = (v: boolean) => resolve(v);
      setState({
        open: true,
        type: "confirm",
        message,
        title: opts?.title,
        confirmText: opts?.confirmText ?? "ยืนยัน",
        cancelText: opts?.cancelText ?? "ยกเลิก",
        danger: opts?.danger ?? false,
      });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setState((s) => ({ ...s, open: false }));
    resolver.current?.(result);
    resolver.current = null;
  }, []);

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {state.open && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">
              {state.title ?? (state.type === "confirm" ? "ยืนยันการทำรายการ" : "แจ้งเตือน")}
            </h3>
            <p className="whitespace-pre-line py-3">{state.message}</p>
            <div className="modal-action">
              {state.type === "confirm" && (
                <button className="btn btn-ghost" onClick={() => close(false)}>
                  {state.cancelText}
                </button>
              )}
              <button
                className={`btn ${state.danger ? "btn-error" : "btn-primary"}`}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmText}
              </button>
            </div>
          </div>
          <form
            method="dialog"
            className="modal-backdrop"
            onClick={() => close(false)}
          >
            <button>close</button>
          </form>
        </dialog>
      )}
    </DialogContext.Provider>
  );
}
