import { useEffect, useRef, useState } from "react";
import type { HelpModalView } from "../../components/builder/types";

export function useHelpModal() {
  const helpSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [isHelpOpen, setHelpOpen] = useState(false);
  const [requestedHelpSection, setRequestedHelpSection] = useState<
    string | null
  >(null);
  const [helpView, setHelpView] = useState<HelpModalView>("overview");

  useEffect(() => {
    if (!isHelpOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHelpOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHelpOpen]);

  useEffect(() => {
    if (!isHelpOpen || helpView !== "overview" || !requestedHelpSection) {
      return;
    }

    const target = helpSectionRefs.current[requestedHelpSection];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setRequestedHelpSection(null);
  }, [helpView, isHelpOpen, requestedHelpSection]);

  useEffect(() => {
    helpSectionRefs.current = {};
  }, [helpView]);

  const openHelpWithSection = (section: string) => {
    setRequestedHelpSection(section);
    setHelpView("overview");
    setHelpOpen(true);
  };

  const openHelpWithView = (view: HelpModalView) => {
    setHelpView(view);
    setHelpOpen(true);
  };

  return {
    helpSectionRefs,
    isHelpOpen,
    setHelpOpen,
    requestedHelpSection,
    setRequestedHelpSection,
    helpView,
    setHelpView,
    openHelpWithSection,
    openHelpWithView,
  };
}
