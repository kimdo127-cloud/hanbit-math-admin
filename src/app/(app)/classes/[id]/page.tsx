"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Crumbs, Loader, Table, Td, Toast, fmtDate, won } from "@/components/ui";
import { EnrollModal } from "@/components/enroll-modal";
import { currentStaff, getClassDetail, GRADE_LABEL, scheduleText } from "@/lib/api";

export default function ClassDetailPage() {
  const id = Number(useParams().id);
  const isMember = currentStaff()?.role === "member"; // 멤버는 학생 상세(매니저 이상)로 가지 않는다
  const isAdmin = currentStaff()?.role === "admin";
  const [d, setD] = useState<Awaited<ReturnType<typeof getClassDetail>> | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    getClassDetail(id).then(setD);
  }, [id]);
  if (!d) return <Loader />;
  const c = d.cls;

  return (
    <>
      <Crumbs items={[{ label: c.name }]} />
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold">{c.name}</h1>
            <Badge>{GRADE_LABEL[c.target_grade]}</Badge>
            {c.count >= c.capacity && <Badge tone="danger">마감</Badge>}
          </div>
          <p className="mt-1 text-[14px] text-grey-500">
            {scheduleText(c.schedules)} · {c.teacherName} · 월 {won(c.monthly_fee)}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link href={`/classes/${c.id}/edit`} className="flex h-10 items-center rounded-m border border-grey-200 bg-white px-4 text-[15px] font-semibold hover:bg-grey-50">
              수정
            </Link>
          )}
          <Link href={`/classes/${c.id}/level-test`} className="flex h-10 items-center rounded-m border border-grey-200 bg-white px-4 text-[15px] font-semibold hover:bg-grey-50">
            레벨테스트 입력
          </Link>
          <Link href={`/attendance?class=${c.id}`} className="flex h-10 items-center rounded-m bg-brand px-4 text-[15px] font-semibold text-white">
            출결 확인
          </Link>
        </div>
      </div>
      <div className="mb-8 grid grid-cols-3 gap-4">
        <section className="col-span-1 rounded-3xl bg-white p-5">
          <p className="text-[13px] font-bold text-grey-500">강좌 소개</p>
          <p className="mt-2 text-[14px] leading-relaxed text-grey-700">{c.description || "-"}</p>
          <dl className="mt-4 space-y-1.5 text-[14px]">
            <div className="flex gap-3">
              <dt className="w-10 text-grey-500">수준</dt>
              <dd className="font-semibold">{c.level || "-"}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-10 text-grey-500">교재</dt>
              <dd className="font-semibold">{c.textbook || "-"}</dd>
            </div>
          </dl>
        </section>
        <section className="col-span-2 rounded-3xl bg-white p-5">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[13px] font-bold text-grey-500">진도 계획 (앞으로)</p>
              <ul className="mt-2 space-y-1.5 text-[14px]">
                {d.plan.slice(0, 6).map((p, i) => (
                  <li key={p.date} className="tabular flex gap-3">
                    <span className="w-6 text-grey-400">{i + 1}</span>
                    <span className="w-24 text-grey-500">{fmtDate(p.date)}</span>
                    <span className={p.topic ? "" : "text-grey-400"}>{p.topic ?? "계획 없음"}</span>
                  </li>
                ))}
                {d.plan.length === 0 && <li className="text-grey-500">예정된 수업이 없어요.</li>}
              </ul>
            </div>
            <div>
              <p className="text-[13px] font-bold text-grey-500">최근 수업 내용</p>
              <ul className="mt-2 space-y-1.5 text-[14px]">
                {d.recent.map((p) => (
                  <li key={p.date} className="tabular flex gap-3">
                    <span className="w-24 text-grey-500">{fmtDate(p.date)}</span>
                    <span>{p.topic ?? "-"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <div className="mb-3 flex items-center justify-between">
      <p className="text-[15px] font-bold">
        수강생 <span className="tabular text-grey-500">{c.count}/{c.capacity}명</span>
      </p>
        {!isMember && (
          <Button size="s" variant="secondary" className="gap-1 border border-grey-200 !bg-white" onClick={() => setAdding(true)}>
            <Plus size={14} /> 학생 추가
          </Button>
        )}
      </div>
      <Table head={["이름", "학년", "시작일", "이번 달 출석률", "출석·지각·결석"]} empty="수강생이 없어요.">
        {d.roster.map((r) => (
          <tr key={r.enrollmentId} className="hover:bg-grey-50">
            <Td>
              {isMember ? (
                <span className="font-semibold">{r.student.name}</span>
              ) : (
                <Link href={`/students/${r.student.id}`} className="font-semibold hover:text-brand">
                  {r.student.name}
                </Link>
              )}
            </Td>
            <Td>
              {GRADE_LABEL[r.student.grade]} {r.offGrade && <Badge tone="brand">선행</Badge>}
            </Td>
            <Td className="text-grey-500">{fmtDate(r.start_date)}</Td>
            <Td className="tabular font-semibold">{r.attendance.rate === null ? "-" : `${r.attendance.rate}%`}</Td>
            <Td className="tabular text-grey-500">
              {r.attendance.present}·{r.attendance.late}·{r.attendance.absent}
            </Td>
          </tr>
        ))}
      </Table>
      <EnrollModal
        open={adding}
        classInfo={c}
        onClose={() => setAdding(false)}
        onDone={(m) => {
          setAdding(false);
          setToast(m);
          getClassDetail(id).then(setD);
        }}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
