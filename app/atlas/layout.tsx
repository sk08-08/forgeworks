import type { ReactNode } from "react";
import { AtlasShell } from "@/features/atlas/components/atlas-shell";

export default function AtlasLayout({ children }: { children: ReactNode }) {
  return <AtlasShell>{children}</AtlasShell>;
}
