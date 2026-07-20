import { createContext, useContext, useState, useEffect } from "react";

export const SidebarContext = createContext(null);

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebar_collapsed", collapsed);
    } catch {}
  }, [collapsed]);

  const toggle = () => setCollapsed((v) => !v);
  return { collapsed, toggle };
}

export const useSidebarContext = () => useContext(SidebarContext);
