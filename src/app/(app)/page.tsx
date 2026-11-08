"use client";
// 대시보드 (사례: 클래스업 '오늘의 브리핑'·경영 분석, Teachworks 위젯)
// ① 처리할 일: 있을 때만 한 줄씩, 항목 자체가 제목. 누르면 처리 화면으로. 빨간색은 지금 처리해야 하는 일만
// ② 이번 달 현황: 숫자 4개 (원장·실장). 빨간색을 쓰지 않는다
// ③ 오늘 수업 등원 현황
// 강사(멤버)는 담당 강좌의 처리할 일과 오늘 수업만
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Loader, PageHeader, SectionTitle, fmtDate } from "@/components/ui";
import { getDashboard, listChatLogs } from "@/lib/api";

type Dash = Awaited<ReturnType<typeof getDashboard>>;

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [unknownAsk, setUnknownAsk] = useState(0);
  useEffect(() => {
    getDashboard().then((x) => {
      setD(x);
      // 챗봇이 규정에서 답을 못 찾은 질문 (최근 7일) → 규정 보강 대상
      if (!x.member)
        listChatLogs()
          .then((logs) => {
            const from = new Date(x.today + "T00:00");
            from.setDate(from.getDate() - 7);
            const f = from.toISOString().slice(0, 10);
            setUnknownAsk(logs.filter((l) => l.status === "unknown" && String(l.asked_at).slice(0, 10) >= f).length);
          })
          .catch(() => {});
    });
  }, []);
  if (!d) return <Loader />;

  const nowHM = new Date().toTimeString().slice(0, 5);
  const tasks = [...d.tasks, ...(unknownAsk ? [{ key: "ask", label: `챗봇이 못 답한 질문 ${unknownAsk}건`, detail: "최근 7일 · 규정에 넣을지 확인", href: "/chat-logs", urgent: false }] : [])];

  return (
    <>
      <PageHeader title="대시보드" desc={`${fmtDate(d.today)} 기준`} />

      {tasks.length > 0 && (
        <ul className="mb-8 divide-y divide-grey-100 overflow-hidden rounded-3xl bg-white">
          {tasks.map((t) => (
            <li key={t.key}>
              <Link href={t.href} className="flex items-center gap-3 px-5 py-4 hover:bg-grey-50">
                <span className={`size-2 shrink-0 rounded-full ${t.urgent ? "bg-danger" : "bg-brand"}`} />
                <span className={`text-[15px] font-bold ${t.urgent ? "text-danger" : ""}`}>{t.label}</span>
                <span className="flex-1 truncate text-[14px] text-grey-500">{t.detail}</span>
                <ChevronRight size={18} className="text-grey-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {d.kpis.length > 0 && (
        <div className="mb-8 grid grid-cols-4 gap-3">
          {d.kpis.map((k) => (
            <Link key={k.label} href={k.href} className="rounded-3xl bg-white p-5 hover:bg-grey-50">
              <p className="text-[13px] text-grey-500">{k.label}</p>
              <p className="tabular mt-1 text-[28px] font-bold">{k.value}</p>
              <p className="tabular mt-0.5 text-[13px] text-grey-500">{k.sub}</p>
            </Link>
          ))}
        </div>
      )}

      <section>
        <SectionTitle>{d.member ? "오늘 내 수업" : "오늘 수업"}</SectionTitle>
        <ul className="divide-y divide-grey-100 overflow-hidden rounded-3xl bg-white">
          {d.todayClasses.length === 0 && <li className="py-10 text-center text-[14px] text-grey-500">오늘은 수업이 없어요.</li>}
          {d.todayClasses.map((c) => (
            <li key={c.classId}>
              <Link href={`/attendance?class=${c.classId}&date=${d.today}`} className="flex items-center gap-3 px-5 py-4 hover:bg-grey-50">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">{c.name}</p>
                  <p className="text-[13px] text-grey-500">
                    {c.time} · {c.teacher}
                    {c.topic && ` · ${c.topic}`}
                  </p>
                </div>
                <p className="tabular w-56 text-right text-[13px]">
                  등원 <b>{c.arrived}</b>/{c.expected}명
                  {c.late > 0 && <span className="text-warning"> · 지각 {c.late}</span>}
                  {c.absent > 0 && <span className="text-grey-500"> · 결석 {c.absent}</span>}
                  {c.makeupIn > 0 && <span className="text-brand"> · 보강 {c.makeupIn}</span>}
                </p>
                <span className="w-24 text-right">
                  {c.missing === 0 ? <Badge tone="success">확인 완료</Badge> : nowHM >= c.start ? <Badge tone="warning">미등원 {c.missing}</Badge> : <Badge>수업 전</Badge>}
                </span>
                <ChevronRight size={18} className="text-grey-400" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
