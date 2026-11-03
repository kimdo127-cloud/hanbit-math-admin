// 메뉴 구조 한 곳에서 관리: 사이드바와 브레드크럼이 같이 쓴다
// 메뉴는 업무 단위로 묶는다 (업무 흐름·CRUD 단위 업무 기준). 권한 등급별로 보이는 메뉴가 다르다
import { BookOpen, CalendarCheck, LayoutDashboard, Receipt, RefreshCcw, UserCog, Users } from "lucide-react";

export type Need = "makeups" | "payments" | "students" | "staff";
export const GROUPS: { title?: string; items: { href: string; label: string; icon: typeof LayoutDashboard; need?: Need }[] }[] = [
  { items: [{ href: "/", label: "대시보드", icon: LayoutDashboard }] },
  {
    title: "수업 운영",
    items: [
      { href: "/attendance", label: "출결 확인", icon: CalendarCheck },
      { href: "/makeups", label: "보강", icon: RefreshCcw, need: "makeups" },
      { href: "/classes", label: "강좌", icon: BookOpen },
    ],
  },
  { title: "학생 관리", items: [{ href: "/students", label: "학생", icon: Users, need: "students" }] },
  { title: "수납 관리", items: [{ href: "/payments", label: "수납 · 환불", icon: Receipt, need: "payments" }] },
  { title: "설정", items: [{ href: "/staff", label: "직원 계정", icon: UserCog, need: "staff" }] },
];
export const MENU = GROUPS.flatMap((g) => g.items);

// 주소 → [메뉴 묶음, 메뉴]. 메뉴 묶음은 화면이 아니라 글자만
export function menuTrail(pathname: string): { label: string; href?: string }[] {
  if (pathname === "/") return [{ label: "대시보드" }];
  for (const g of GROUPS) {
    const it = g.items.find((i) => i.href !== "/" && pathname.startsWith(i.href));
    if (it) return [...(g.title ? [{ label: g.title }] : []), { label: it.label, href: it.href }];
  }
  return [];
}
