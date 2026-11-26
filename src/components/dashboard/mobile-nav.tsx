"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SetupSidebarCard } from "@/components/teacher/setup-sidebar-card";
import type { SetupStep } from "@/lib/setup-step";
import { NavLinks } from "./nav-links";

export function MobileNav({ footer, examTitle, teacherTools, newsUnread, setup }: { footer: React.ReactNode; examTitle?: string; teacherTools?: boolean; newsUnread?: number; setup?: SetupStep[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="gap-6 p-4 pt-5"
        // Close after tapping any link (main nav or Account in the user menu).
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Main navigation</SheetDescription>
        <Logo href="/dashboard" className="px-2" />
        <div className="flex-1 overflow-y-auto">
          <NavLinks examTitle={examTitle} teacherTools={teacherTools} newsUnread={newsUnread} onNavigate={() => setOpen(false)} />
        </div>
        {setup && <SetupSidebarCard steps={setup} homePath="/dashboard" onNavigate={() => setOpen(false)} />}
        {footer}
      </SheetContent>
    </Sheet>
  );
}
