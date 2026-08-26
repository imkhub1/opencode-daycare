"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/shared/Icon";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { SidebarUser } from "@/components/shared/SidebarUser";
import type { AppProfile } from "@/utils/supabase/profile";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useLocale } from "@/components/shared/LocaleProvider";
import type { Dictionary } from "@/utils/i18n/dictionary";

export type AreaNavigationItem = {
  href: string;
  label: keyof Dictionary["navigation"];
  icon: IconName;
};

type ShellProfile = Pick<AppProfile, "fullName" | "role">;

export function Brand({ href, subtitle }: { href: string; subtitle: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-[#f8c3a8] to-[#f2937a] text-white">
        <Icon name="sun" className="size-5" />
      </span>
      <span>
        <span className="block font-display text-lg font-semibold leading-none text-ink">OpenDayCare</span>
        <span className="mt-1 block text-xs text-[#a89a8b]">{subtitle}</span>
      </span>
    </Link>
  );
}

function Navigation({
  items,
  compact = false,
}: {
  items: AreaNavigationItem[];
  compact?: boolean;
}) {
  const { dictionary } = useLocale();
  const pathname = usePathname();
  const activeHref = [...items]
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href;

  return (
    <nav
      aria-label={dictionary.navigation.main}
      className={compact ? "flex flex-col gap-1" : "flex flex-1 flex-col gap-1"}
    >
      {items.map((item) => {
        const active = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-[11px] text-sm font-semibold ${active ? "bg-coral-soft text-[#d9583c] font-extrabold" : "text-[#6e6359] hover:bg-[#f6ecdf]"}`}
          >
            <Icon name={item.icon} className="size-[19px]" />
            {dictionary.navigation[item.label]}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  profile,
  navigation,
  primaryAction,
  brandSubtitle,
  children,
}: {
  profile: ShellProfile;
  navigation: AreaNavigationItem[];
  primaryAction?: AreaNavigationItem;
  brandSubtitle: keyof Dictionary["navigation"];
  children: ReactNode;
}) {
  const { dictionary } = useLocale();
  const landingHref = navigation[0]?.href ?? "/";

  return (
    <div className="min-h-screen bg-sand md:flex">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <div className="flex items-start justify-between gap-2 px-2 pb-6">
          <Brand href={landingHref} subtitle={dictionary.navigation[brandSubtitle]} />
          <LanguageSwitcher />
        </div>
        {primaryAction && (
          <Link
            href={primaryAction.href}
            className="mb-5 flex items-center justify-center gap-2 rounded-[14px] bg-linear-to-b from-[#f4977e] to-[#ee8164] px-3 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#ee8164]/25"
          >
            <Icon name={primaryAction.icon} className="size-[17px]" />
            {dictionary.navigation[primaryAction.label]}
          </Link>
        )}
        <Navigation items={navigation} />
        <div className="mt-3 border-t border-line pt-4">
          <div className="flex items-center gap-3 px-2">
            <SidebarUser profile={profile} />
            <LogoutButton><Icon name="log-out" className="size-4" /></LogoutButton>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between">
            <Brand href={landingHref} subtitle={dictionary.navigation[brandSubtitle]} />
            <details className="relative">
              <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-xl bg-sand text-ink">
                <Icon name="menu" className="size-5" />
                <span className="sr-only">{dictionary.navigation.openMenu}</span>
              </summary>
              <div className="absolute right-0 top-12 w-56 rounded-2xl border border-line bg-surface p-2 shadow-xl shadow-[#3f362e]/10">
                {primaryAction && (
                  <Link
                    href={primaryAction.href}
                    className="mb-1 flex items-center gap-3 rounded-xl bg-coral px-3 py-3 text-sm font-bold text-white"
                  >
                    <Icon name={primaryAction.icon} className="size-5" />
                    {dictionary.navigation[primaryAction.label]}
                  </Link>
                )}
                <Navigation items={navigation} compact />
              </div>
            </details>
            <LanguageSwitcher className="absolute right-16 top-3" />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
