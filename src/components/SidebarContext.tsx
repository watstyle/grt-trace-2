import { ReactNode, createContext, useContext, useMemo, useState } from "react";

type SidebarContextValue = {
  isOpen: boolean;
  onTriggerEnter: () => void;
  onTriggerLeave: () => void;
  onPanelEnter: () => void;
  onPanelLeave: () => void;
  onBackArrowEnter: () => void;
  closeNow: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

type SidebarProviderProps = {
  children: ReactNode;
};

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [triggerArmed, setTriggerArmed] = useState(false);
  const [panelHover, setPanelHover] = useState(false);

  const value = useMemo<SidebarContextValue>(
    () => ({
      isOpen: triggerArmed || panelHover,
      onTriggerEnter: () => {
        setTriggerArmed(true);
      },
      onTriggerLeave: () => {
        // keep panel open while pointer travels downward from trigger
      },
      onPanelEnter: () => {
        setPanelHover(true);
      },
      onPanelLeave: () => {
        setTriggerArmed(false);
        setPanelHover(false);
      },
      onBackArrowEnter: () => {
        setTriggerArmed(false);
        setPanelHover(false);
      },
      closeNow: () => {
        setTriggerArmed(false);
        setPanelHover(false);
      },
    }),
    [panelHover, triggerArmed],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
