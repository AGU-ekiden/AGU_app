"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/",
    label: "経費精算",
    isActive: (pathname: string) => pathname === "/" || pathname.startsWith("/new"),
    activeClass: "bg-primary text-primary-foreground",
    inactiveClass: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  {
    href: "/business-trip-report",
    label: "出張報告書",
    isActive: (pathname: string) => pathname.startsWith("/business-trip-report"),
    activeClass: "bg-primary text-primary-foreground",
    inactiveClass: "bg-primary/10 text-primary hover:bg-primary/20",
  },
  {
    href: "/settings",
    label: "設定",
    isActive: (pathname: string) => pathname.startsWith("/settings"),
    activeClass: "bg-primary text-primary-foreground",
    inactiveClass: "bg-primary/10 text-primary hover:bg-primary/20",
  },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b-[3px] border-primary bg-background print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-3 py-2.5">
        <nav className="flex min-w-0 gap-1.5 overflow-x-auto">
          {TABS.map((tab) => {
            const active = tab.isActive(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex shrink-0 items-center rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors",
                  active ? tab.activeClass : tab.inactiveClass
                )}
              >
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
