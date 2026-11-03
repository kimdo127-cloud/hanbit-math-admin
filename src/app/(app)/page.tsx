"use client";
// 대시보드: 기한 있는 일(환불 기한·미납)을 위에, 오늘 수업 등원 현황을 아래에
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Loader, PageHeader, SectionTitle, Stat, fmtDate, won } from "@/components/ui";
import { getDashboard } from "@/lib/api";

export default function DashboardPage() {
  const [d, setD] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  useEffect(() => {
    getDashboard().then(setD);
  }, []);
  if (!d) return <Loader />;

  const unpaidTotal = d.unpaid.reduce((s, p) => s + p.amount, 0);
  const m = Number(d.month.slice(5));
  const nowHM = new Date().toTimeString().slice(0, 5);
  const overdue = d.refundsDue.filter((r) => r.dLeft < 0).length;

  return (
    <>
      <PageHeader title={`${d.me.name}님, 오늘 할 일이에요`} desc={`${fmtDate(d.today)} 기준`} />

      {!d.member && (
      <div className="grid grid-cols-4 gap-3">
        <Link href="/payments?tab=refund">
          <Stat label="환불 처리 대기" value={`${d.refundsDue.length}건`} tone={overdue ? "danger" : d.refundsDue.length ? "warning" : undefined} />
        </Link>
        <Link href="/payments">
          <Stat label={`${m}월 미납`} value={won(unpaidTotal)} tone={unpaidTotal ? "danger" : undefined} />
        </Link>
        <Link href="/makeups">
          <Stat label="7일 안 보강 예정" value={`${d.makeupsUpcoming}건`} tone={d.makeupsUpcoming ? "brand" : undefined} />
        </Link>
        <Link href="/classes">
          <Stat label="정원 마감·1자리" value={`${d.nearFull.length}개 강좌`} />
        </Link>
      </div>
      )}

      <div className={`grid gap-6 ${d.member ? "grid-cols-1" : "mt-8 grid-cols-2"}`}>
        <section>
          <SectionTitle>{d.member ? "오늘 내 수업 · 등원 현황" : "오늘 수업 · 등원 현황"}</SectionTitle>
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
                    <p className="tabular mt-1 text-[13px]">
                      등원 <b>{c.arrived}</b>/{c.expected}명
                      {c.late > 0 && <span className="text-warning"> · 지각 {c.late}</span>}
                      {c.absent > 0 && <span className="text-danger"> · 결석 {c.absent}</span>}
                      {c.makeupIn > 0 && <span className="text-brand"> · 보강 {c.makeupIn}명</span>}
                    </p>
                  </div>
                  {c.missing === 0 ? (
                    <Badge tone="success">확인 완료</Badge>
                  ) : nowHM >= c.start ? (
                    <Badge tone="warning">미등원 {c.missing}명</Badge>
                  ) : (
                    <Badge>수업 전 · 등원 {c.arrived}명</Badge>
                  )}
                  <ChevronRight size={18} className="text-grey-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {!d.member && (
        <section>
          <SectionTitle right={<Link href="/payments?tab=refund" className="text-[13px] font-semibold text-brand">환불 처리</Link>}>
            환불 처리 대기 (수강 중단 후 5일 안)
          </SectionTitle>
          <ul className="divide-y divide-grey-100 overflow-hidden rounded-3xl bg-white">
            {d.refundsDue.length === 0 && <li className="py-10 text-center text-[14px] text-grey-500">처리할 환불이 없어요.</li>}
            {d.refundsDue.map((r) => (
              <li key={r.enrollmentId} className="flex items-center justify-between px-5 py-4">
                <span className="text-[15px]">
                  <b>{r.name}</b> <span className="text-grey-500">· {r.className}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular text-[15px] font-bold">{won(r.amount)}</span>
                  {r.dLeft < 0 ? <Badge tone="danger">기한 {-r.dLeft}일 지남</Badge> : <Badge tone="warning">D-{r.dLeft}</Badge>}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <SectionTitle right={<Link href="/payments" className="text-[13px] font-semibold text-brand">수납 관리</Link>}>{m}월 미납</SectionTitle>
          </div>
          <ul className="divide-y divide-grey-100 overflow-hidden rounded-3xl bg-white">
            {d.unpaid.length === 0 && <li className="py-10 text-center text-[14px] text-grey-500">미납이 없어요.</li>}
            {d.unpaid.map((p) => (
              <li key={`${p.studentId}-${p.classId}`} className="flex items-center justify-between px-5 py-4">
                <span className="text-[15px]">
                  <b>{p.studentName}</b> <span className="text-grey-500">· {p.className}</span>
                </span>
                <span className="tabular text-[15px] font-bold">
                  {won(p.amount)}
                  {p.discount && <span className="ml-1.5 text-[12px] font-medium text-brand">형제 할인</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
        )}
      </div>
    </>
  );
}
