"use client";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader } from "@/components/ui";
import { GROUPS, MENU } from "@/lib/menu";
import { canSee, currentStaff, logout, refreshMe, resetDemo, ROLE_LABEL, type StaffPublic } from "@/lib/api";



export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<StaffPublic | null>(null);

  useEffect(() => {
    const s = currentStaff();
    if (!s) router.replace("/login");
    else setMe(s);
  }, [router, pathname]);
  // 권한 등급이 바뀌었을 수 있으니 들어올 때 서버에서 내 정보를 한 번 다시 받는다
  useEffect(() => {
    refreshMe()
      .then((s) => (s ? setMe(s) : router.replace("/login")))
      .catch(() => {});
  }, [router]);



  if (!me) return <Loader />;
  // 주소로 직접 들어와도 등급에 맞지 않으면 막는다 (API에서도 한 번 더 막음)
  const blocked = MENU.find((m) => m.need && m.href !== "/" && pathname.startsWith(m.href) && !canSee(me.role, m.need!));
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 flex h-dvh w-[232px] shrink-0 flex-col border-r border-grey-200 bg-white px-4 py-6">
        <p className="px-3 text-[17px] font-bold">
          한빛수학 <span className="text-brand">운영</span>
        </p>
        <nav className="mt-8 space-y-5">
          {GROUPS.map((g, gi) => {
            const items = g.items.filter((m) => !m.need || canSee(me.role, m.need));
            if (items.length === 0) return null;
            return (
              <div key={gi}>
                {g.title && <p className="mb-1.5 px-3 text-[12px] font-semibold text-grey-400">{g.title}</p>}
                <div className="space-y-1">
                  {items.map(({ href, label, icon: Icon }) => {
                    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`flex h-10 items-center gap-3 rounded-m px-3 text-[15px] font-semibold transition-colors ${
                          active ? "bg-grey-100 text-grey-900" : "text-grey-500 hover:bg-grey-50"
                        }`}
                      >
                        <Icon size={19} strokeWidth={active ? 2.2 : 1.7} />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2 border-t border-grey-200 px-3 pt-4">
          <p className="text-[14px] font-semibold">{me.name}</p>
          <p className="text-[12px] text-grey-500">
            {ROLE_LABEL[me.role]} · {me.position}
          </p>
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="flex items-center gap-1.5 pt-1 text-[13px] text-grey-500"
          >
            <LogOut size={14} /> 로그아웃
          </button>
          <Link href="/change-password" className="block text-[13px] text-grey-500">
            비밀번호 변경
          </Link>
          <button
            onClick={async () => {
              await resetDemo().catch(() => {});
              router.replace("/login");
            }}
            className="block text-[11px] text-grey-400"
          >
            (시연) 데이터 초기화
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-10 pt-8 pb-28">
        <div className="mx-auto max-w-[1120px]">
          {blocked ? <p className="py-24 text-center text-[15px] text-grey-500">이 메뉴는 {blocked.need === "staff" ? "관리자" : "매니저 이상"}만 볼 수 있어요.</p> : children}
        </div>
      </main>
    </div>
  );
}
