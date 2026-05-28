import { Role } from "@prisma/client";

const roleToPrefix: Record<Role, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  ADMIN: "/admin",
  PARENT: "/parent",
};

export const studentOnlyPrefixes = ["/student", "/dashboard", "/schedule", "/invoices", "/videos"];
export const teacherOnlyPrefixes = ["/teacher"];
export const adminOnlyPrefixes = ["/admin"];
export const parentOnlyPrefixes = ["/parent"];

export function defaultRouteForRole(role: Role): string {
  return roleToPrefix[role];
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (adminOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return role === Role.ADMIN;
  }

  if (parentOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return role === Role.PARENT;
  }

  if (teacherOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return role === Role.TEACHER;
  }

  if (studentOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return role === Role.STUDENT;
  }

  if (pathname.startsWith("/messages")) {
    return role === Role.STUDENT || role === Role.TEACHER || role === Role.ADMIN || role === Role.PARENT;
  }

  return true;
}
