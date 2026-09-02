"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane, Receipt, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/",
    label: "経費精算",
    icon: Receipt,
    isActive: (pathname: string) => pathname === "/" || pathname.startsWith("/new"),
    activeClass: "bg-primary text-primary-foreground",
    inactiveClass: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  {
    href: "/business-trip-report",
    label: "出張報告書",
    icon: Plane,
    isActive: (pathname: string) => pathname.startsWith("/business-trip-report"),
    activeClass: "bg-primary text-primary-foreground",
    inactiveClass: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  {
    href: "/settings",
    label: "設定",
    icon: Settings,
    isActive: (pathname: string) => pathname.startsWith("/settings"),
    activeClass: "bg-primary text-primary-foreground",
    inactiveClass: "bg-primary/10 text-primary hover:bg-primary/20",
  },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b-[3px] border-primary bg-background print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <nav className="flex min-w-0 gap-2 overflow-x-auto">
          {TABS.map((tab) => {
            const active = tab.isActive(pathname);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors",
                  active ? tab.activeClass : tab.inactiveClass
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <a
          href="/"
          className="ml-auto inline-flex h-9 shrink-0 items-center rounded-[10px] bg-primary px-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          ← ポータル
        </a>
      </div>
    </header>
  );
}
