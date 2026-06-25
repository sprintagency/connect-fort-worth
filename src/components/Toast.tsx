"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

interface ToastState {
  msg: string;
  tag?: string;
  show: boolean;
}

interface ToastContextValue {
  toast: (msg: string, tag?: string) => void;
  state: ToastState;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  state: { msg: "", show: false },
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({ msg: "", show: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string, tag?: string) => {
    setState({ msg, tag, show: true });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setState((s) => ({ ...s, show: false })),
      1900,
    );
  }, []);

  return (
    <ToastContext.Provider value={{ toast, state }}>
      {children}
    </ToastContext.Provider>
  );
}

/** The visual toast. Render inside the .phone frame for correct positioning. */
export function Toaster() {
  const { state } = useToast();
  return (
    <div className={`toast ${state.show ? "show" : ""}`}>
      {state.msg}
      {state.tag ? <span className="tag">{state.tag}</span> : null}
    </div>
  );
}
