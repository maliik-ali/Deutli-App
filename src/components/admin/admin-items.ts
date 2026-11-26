import { BookA, FileText, Headphones, Building2, LayoutDashboard, LifeBuoy, Search, Sparkles, Star, UserCheck, Video, Wallet, type LucideIcon } from "lucide-react";

/** The admin menu. Same look as the student and teacher menus. */
export const ADMIN_ITEMS: { href: string; label: string; icon: LucideIcon; badge?: "feedback" }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/mock-papers", label: "Mock exam papers", icon: FileText },
  { href: "/admin/daily-practice", label: "Daily Practice texts", icon: Headphones },
  { href: "/admin/dictionary", label: "Word dictionary", icon: BookA },
  { href: "/admin/classes", label: "Live classes", icon: Video },
  { href: "/admin/academies", label: "Workspaces", icon: Building2 },
  { href: "/admin/teachers", label: "Teachers and students", icon: UserCheck },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/pro-requests", label: "Pro requests", icon: Sparkles },
  { href: "/admin/join-requests", label: "Join requests", icon: Search },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/feedback", label: "Feedback", icon: LifeBuoy, badge: "feedback" },
];
