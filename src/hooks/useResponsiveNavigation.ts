import { useEffect, useRef, useState } from "react";
import type { Page } from "../app/navigation";
export function useResponsiveNavigation(page: Page) {
  const [compact, setCompact] = useState(() => matchMedia("(max-width: 780px)").matches);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null),
    navigation = useRef<HTMLElement>(null),
    wasNavigationOpen = useRef(false);
  useEffect(() => {
    const media = matchMedia("(max-width: 780px)");
    const change = () => {
      setCompact(media.matches);
      setNavigationOpen(false);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (compact && navigationOpen)
      navigation.current?.querySelector<HTMLButtonElement>("button")?.focus();
    else if (wasNavigationOpen.current) {
      if (compact) menuTrigger.current?.focus();
      else document.getElementById("main-content")?.focus();
    }
    wasNavigationOpen.current = navigationOpen;
  }, [compact, navigationOpen]);
  useEffect(() => {
    setNavigationOpen(false);
  }, [page]);
  return {
    compact,
    navigationOpen,
    setNavigationOpen,
    menuTrigger,
    navigation,
    closeNavigation: () => setNavigationOpen(false),
  };
}
