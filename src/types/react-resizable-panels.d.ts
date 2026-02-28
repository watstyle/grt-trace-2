declare module "react-resizable-panels" {
  import { ComponentPropsWithoutRef, ReactNode } from "react";

  export type PanelGroupProps = ComponentPropsWithoutRef<"div"> & {
    direction: "horizontal" | "vertical";
    children?: ReactNode;
  };

  export type PanelProps = ComponentPropsWithoutRef<"div"> & {
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    children?: ReactNode;
  };

  export type PanelResizeHandleProps = ComponentPropsWithoutRef<"div"> & {
    children?: ReactNode;
  };

  export function PanelGroup(props: PanelGroupProps): JSX.Element;
  export function Panel(props: PanelProps): JSX.Element;
  export function PanelResizeHandle(props: PanelResizeHandleProps): JSX.Element;
}
