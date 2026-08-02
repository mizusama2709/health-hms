import {
  LayoutGrid,
  FileText,
  Plug,
  Calendar,
  ListChecks,
  Box,
  PieChart,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

const ICONS_BY_LABEL: Record<string, LucideIcon> = {
  Dashboard: LayoutGrid,
  Patients: FileText,
  Inbox: Plug,
  Schedule: Calendar,
  Queue: ListChecks,
  Reports: PieChart,
  Staff: UserCircle,
};

export function getNavIcon(label: string): LucideIcon {
  return ICONS_BY_LABEL[label] ?? Box;
}
