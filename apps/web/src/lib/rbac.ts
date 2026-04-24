import { Role } from "@prisma/client";

const roleToPrefix: Record<Role, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  ADMIN: "/admin",
};

export const studentOnlyPrefixes = ["/student", "/dashboard", "/schedule", "/invoices", "/videos", "/messages"];
export const teacherOnlyPrefixes = ["/teacher"];
export const adminOnlyPrefixes = ["/admin"];

export function defaultRouteForRole(role: Role): string {
  return roleToPrefix[role];
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (adminOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return role === Role.ADMIN;
  }

  if (teacherOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return role === Role.TEACHER;
  }

  if (studentOnlyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return role === Role.STUDENT;
  }

  return true;
}
