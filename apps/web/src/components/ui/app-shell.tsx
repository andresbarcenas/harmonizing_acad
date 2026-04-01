import Link from "next/link";
import { Role } from "@prisma/client";

import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

const studentNav: NavItem[] = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/schedule", label: "Agenda" },
  { href: "/videos", label: "Prácticas" },
  { href: "/messages", label: "Mensajes" },
  { href: "/notifications", label: "Notificaciones" },
  { href: "/settings", label: "Perfil" },
];

const teacherNav: NavItem[] = [
  { href: "/teacher/dashboard", label: "Hoy" },
  { href: "/teacher/requests", label: "Reagendaciones" },
  { href: "/teacher/videos", label: "Videos" },
  { href: "/messages", label: "Mensajes" },
  { href: "/notifications", label: "Notificaciones" },
];

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Resumen" },
  { href: "/admin/assignments", label: "Asignaciones" },
  { href: "/admin/availability", label: "Disponibilidad" },
  { href: "/notifications", label: "Notificaciones" },
  { href: "/settings", label: "Configuración" },
];

function navByRole(role: Role): NavItem[] {
  if (role === Role.TEACHER) return teacherNav;
  if (role === Role.ADMIN) return adminNav;
  return studentNav;
}

export function AppShell({
  role,
  activePath,
  userName,
  children,
}: {
  role: Role;
  activePath: string;
  userName: string;
  children: React.ReactNode;
}) {
  const items = navByRole(role);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-4 md:px-8">
      <header className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper)]/90 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link href={role === Role.STUDENT ? "/dashboard" : role === Role.TEACHER ? "/teacher/dashboard" : "/admin/dashboard"}>
            <BrandLogo compact={false} />
          </Link>
          <p className="text-xs text-[var(--color-ink-soft)] md:text-sm">{userName}</p>
        </div>
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => {
            const active = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm whitespace-nowrap transition",
                  active
                    ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                    : "bg-[var(--color-muted)] text-[var(--color-ink)] hover:bg-[color-mix(in_srgb,var(--color-gold)_18%,white)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
