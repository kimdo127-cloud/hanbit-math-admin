"use client";
// 학생 상세 (공통 규칙: 경로·뒤로 → 제목 → 탭, 기본은 보기 모드, [수정] → 편집 모드 + 하단 저장 바)
// 탭: 기본 정보 / 수강 / 출결 / 보강 / 수납·환불 / 변경 이력
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Crumbs, Dialog, EditBar, Loader, Modal, Select, Table, Td, TextField, Toast, fmtDate, won } from "@/components/ui";
import { EnrollModal } from "@/components/enroll-modal";
import { ApiError, endEnrollment, getStudentDetail, GRADE_LABEL, listMakeups, today, updateStudent, type MakeupRow } from "@/lib/api";
import { shiftMonth } from "@/lib/calc";
import type { Grade } from "@/lib/types";

type Detail = Awaited<ReturnType<typeof getStudentDetail>>;
const TABS = ["기본 정보", "수강", "출결", "보강", "수납·환불", "변경 이력"] as const;
type Tab = (typeof TABS)[number];

const ENTITY_LABEL: Record<string, string> = { student: "학생", enrollment: "수강", attendance: "출결", makeup: "보강", payment: "수납", refund: "환불", class: "강좌", staff: "직원" };
const MK_STATE: Record<MakeupRow["state"], { label: string; tone: "brand" | "success" | "warning" | "grey" }> = {
  available: { label: "신청 전", tone: "warning" },
  booked: { label: "보강 예정", tone: "brand" },
  done: { label: "보강 완료", tone: "success" },
  full: { label: "남은 수업 없음", tone: "grey" },
  expired: { label: "기간 지남", tone: "grey" },
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex border-b border-grey-100 py-3.5 text-[15px] last:border-0">
      <span className="w-32 shrink-0 text-grey-500">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}

export default function StudentDetailPage() {
  const id = Number(useParams().id);
  const [d, setD] = useState<Detail | null>(null);
  const [mk, setMk] = useState<MakeupRow[]>([]);
  const [tab, setTab] = useState<Tab>("기본 정보");
  const [edit, setEdit] = useState<{ name: string; grade: Grade; school: string; birth_date: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState<{ id: number; name: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [endDate, setEndDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    getStudentDetail(id).then(setD).catch((e) => setError(e.message));
    const m = today().slice(0, 7);
    Promise.all([listMakeups(shiftMonth(m, -1)), listMakeups(m)]).then(([a, b]) => setMk([...b, ...a].filter((r) => r.student.id === id)));
  }, [id]);
  useEffect(load, [load]);

  if (!d) return <Loader />;
  const s = d.student;
  const a = d.attendance;
  const active = d.enrollments.filter((e) => !e.end_date);

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await updateStudent(id, edit);
      setEdit(null);
      setToast("학생 정보를 수정했어요");
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const confirmEnd = async () => {
    if (!ending) return;
    try {
      await endEnrollment(ending.id, endDate);
      setEnding(null);
      setToast("수강 중단을 처리했어요. 환불은 수납 · 환불에서 기록해요");
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <>
      <Crumbs items={[{ label: s.name }]} />
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold">{s.name}</h1>
            <Badge>{GRADE_LABEL[s.grade]}</Badge>
            {active.length === 0 && <Badge tone="grey">다니는 강좌 없음</Badge>}
          </div>
          <p className="mt-1 text-[14px] text-grey-500">
            {s.school} · {active.map((e) => e.className).join(", ") || "수강 없음"}
          </p>
        </div>
        <div className="tabular flex gap-6 text-right text-[13px] text-grey-500">
          <div>
            이번 달 출석률
            <p className="text-[20px] font-bold text-grey-900">{a.rate === null ? "-" : `${a.rate}%`}</p>
          </div>
          <div>
            이번 달 미납
            <p className={`text-[20px] font-bold ${d.payments.some((p) => p.status === "unpaid") ? "text-danger" : "text-grey-900"}`}>
              {won(d.payments.filter((p) => p.status === "unpaid").reduce((t, p) => t + p.amount, 0))}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-grey-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => !edit && setTab(t)}
            disabled={!!edit && t !== tab}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[15px] font-semibold disabled:opacity-40 ${tab === t ? "border-grey-900 text-grey-900" : "border-transparent text-grey-500"}`}
          >
            {t}
            {t === "변경 이력" && <span className="ml-1 text-[12px] text-grey-400">{d.logs.length}</span>}
          </button>
        ))}
      </div>

      {tab === "기본 정보" && (
        <div className="grid grid-cols-2 gap-6">
          <section className={`rounded-3xl bg-white p-6 ${edit ? "ring-2 ring-brand" : ""}`}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[17px] font-bold">학생 정보</h2>
              {!edit && (
                <Button variant="secondary" size="s" onClick={() => setEdit({ name: s.name, grade: s.grade, school: s.school, birth_date: s.birth_date })}>
                  수정
                </Button>
              )}
            </div>
            {edit ? (
              <div className="space-y-4 pt-2">
                <TextField label="이름" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Select label="학년" value={edit.grade} onChange={(e) => setEdit({ ...edit, grade: Number(e.target.value) as Grade })}>
                    {(Object.keys(GRADE_LABEL) as unknown as Grade[]).map((g) => (
                      <option key={g} value={g}>
                        {GRADE_LABEL[g]}
                      </option>
                    ))}
                  </Select>
                  <TextField label="생년월일" type="date" value={edit.birth_date} onChange={(e) => setEdit({ ...edit, birth_date: e.target.value })} />
                </div>
                <TextField label="학교" value={edit.school} onChange={(e) => setEdit({ ...edit, school: e.target.value })} />
                <p className="text-[12px] text-grey-500">바꾼 내용은 변경 이력에 남아요.</p>
              </div>
            ) : (
              <>
                <Row k="이름" v={s.name} />
                <Row k="학년" v={GRADE_LABEL[s.grade]} />
                <Row k="학교" v={s.school} />
                <Row k="생년월일" v={fmtDate(s.birth_date)} />
              </>
            )}
          </section>
          <section className="rounded-3xl bg-white p-6">
            <h2 className="mb-2 text-[17px] font-bold">가족 · 연락처</h2>
            <Row k="보호자 계정" v={d.parent ? `${d.parent.name} (${d.parent.email})` : "앱 가입 전"} />
            {d.contacts.map((c) => (
              <Row key={c.id} k={c.relation} v={<span className="tabular">{c.phone}</span>} />
            ))}
            <Row
              k="형제"
              v={
                d.siblings.length ? (
                  d.siblings.map((x) => (
                    <Link key={x.id} href={`/students/${x.id}`} className="mr-3 text-brand">
                      {x.name}
                    </Link>
                  ))
                ) : (
                  <span className="font-normal text-grey-500">없음</span>
                )
              }
            />
            <p className="mt-3 text-[12px] text-grey-500">연락처는 보호자가 앱에서 관리해요.</p>
          </section>
        </div>
      )}

      {tab === "수강" && (
        <>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[14px] text-grey-500">보호자가 앱에서 직접 신청하거나, 상담·전화·방문 요청이면 여기서 운영이 등록해요.</p>
          <Button size="m" onClick={() => setAdding(true)}>
            수강 등록
          </Button>
        </div>
        <Table head={["강좌", "기간", "상태", "환불", ""]} empty="수강 이력이 없어요.">
          {d.enrollments.map((e) => (
            <tr key={e.id}>
              <Td>
                <b>{e.className}</b> {e.offGrade && <Badge tone="brand">선행</Badge>}
              </Td>
              <Td className="tabular text-grey-700">{e.end_date ? `${fmtDate(e.start_date)} ~ ${fmtDate(e.end_date)}` : `${fmtDate(e.start_date)}부터`}</Td>
              <Td>{e.end_date ? <Badge>수강 중단</Badge> : <Badge tone="brand">다니는 중</Badge>}</Td>
              <Td>
                {!e.end_date ? (
                  <span className="text-grey-400">-</span>
                ) : e.refunded_at ? (
                  <span className="tabular">
                    {won(e.refund_amount ?? 0)} <span className="text-grey-500">· {fmtDate(e.refunded_at)}</span>
                  </span>
                ) : (
                  <Link href="/payments?tab=refund">
                    <Badge tone="warning">환불 기록 전</Badge>
                  </Link>
                )}
              </Td>
              <Td className="text-right">
                {!e.end_date && (
                  <Button
                    variant="secondary"
                    size="s"
                    onClick={() => {
                      setEnding({ id: e.id, name: e.className });
                      setEndDate(today());
                    }}
                  >
                    수강 중단
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
        </>
      )}

      {tab === "출결" && (
        <>
          <p className="mb-3 text-[14px] text-grey-500">
            {Number(today().slice(5, 7))}월 · 출석 {a.present} · 지각 {a.late} · 결석 {a.absent} → {a.effectiveAbsent}회 빠짐 (지각 3번 = 결석 1번)
          </p>
          <Table head={["날짜", "강좌", "출결", "등원 시각", "수업 내용", "보강"]} empty="이번 달 출결 기록이 없어요.">
            {d.records.map((r) => (
              <tr key={r.attendanceId}>
                <Td className="tabular text-grey-700">{fmtDate(r.date)}</Td>
                <Td>{r.className}</Td>
                <Td>{r.status === "present" ? <Badge tone="success">출석</Badge> : r.status === "late" ? <Badge tone="warning">지각 {r.lateMin}분</Badge> : <Badge tone="danger">결석</Badge>}</Td>
                <Td className="tabular">{r.checkedAt ?? "-"}</Td>
                <Td className="text-grey-700">{r.topic ?? "-"}</Td>
                <Td className="text-brand">{r.makeup ? `${fmtDate(r.makeup.date)} ${r.makeup.className}` : ""}</Td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {tab === "보강" && (
        <Table head={["결석한 수업", "보강", "상태"]} empty="최근 두 달 결석이 없어요.">
          {mk.map((r) => (
            <tr key={r.attendanceId}>
              <Td>
                {fmtDate(r.date)} <span className="text-grey-500">· {r.className}</span>
              </Td>
              <Td className="tabular">
                {r.booked ? `${fmtDate(r.booked.date)} ${r.booked.className} ${r.booked.time.split("~")[0]}` : <span className="text-grey-500">{r.state === "available" ? `${fmtDate(r.deadline)}까지 신청 가능` : "-"}</span>}
              </Td>
              <Td>
                <Badge tone={MK_STATE[r.state].tone}>{MK_STATE[r.state].label}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "수납·환불" && (
        <Table head={["달", "강좌", "금액", "상태", "납부일"]} empty="수납 기록이 없어요.">
          {d.paymentHistory.map((p) => (
            <tr key={`${p.month}-${p.classId}`}>
              <Td className="tabular">{Number(p.month.slice(5))}월</Td>
              <Td>{p.className}</Td>
              <Td className="tabular">
                {won(p.paidAmount ?? p.amount)}
                {p.discount && <span className="ml-1.5 text-[12px] text-brand">형제 할인</span>}
                  {p.partial && <span className="ml-1.5 text-[12px] text-brand">첫 달 {p.partial.count}/{p.partial.total}회분</span>}
              </Td>
              <Td>{p.status === "paid" ? <Badge tone="success">납부</Badge> : p.status === "upcoming" ? <Badge>청구 전</Badge> : <Badge tone="danger">미납</Badge>}</Td>
              <Td className="tabular text-grey-500">{p.paidAt ? fmtDate(p.paidAt) : "-"}</Td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "변경 이력" && (
        <Table head={["일시", "누가", "구분", "내용"]} empty="아직 변경 이력이 없어요.">
          {d.logs.map((l) => (
            <tr key={l.id}>
              <Td className="tabular w-40 text-grey-700">{`${Number(l.at.slice(5, 7))}/${Number(l.at.slice(8, 10))} ${l.at.slice(11, 16)}`}</Td>
              <Td className="w-36">
                {l.actor_name} <span className="text-[12px] text-grey-500">{l.actor_type === "parent" ? "보호자 · 앱" : "직원"}</span>
              </Td>
              <Td className="w-20">
                <Badge>{ENTITY_LABEL[l.entity]}</Badge>
              </Td>
              <Td>{l.summary}</Td>
            </tr>
          ))}
        </Table>
      )}

      <EnrollModal
        open={adding}
        student={s}
        enrolledClassIds={active.map((e) => e.class_id)}
        onClose={() => setAdding(false)}
        onDone={(m) => {
          setAdding(false);
          setToast(m);
          load();
        }}
      />
      {edit && <EditBar title="학생 정보 수정 중" onCancel={() => setEdit(null)} onSave={save} saving={saving} />}

      <Modal open={!!ending} onClose={() => setEnding(null)} title="수강 중단">
        <p className="mb-4 text-[14px] text-grey-700">
          <b>{ending?.name}</b> 수강을 중단해요. 기록은 지우지 않고 중단일만 남기고, 환불 계산의 기준이 돼요.
        </p>
        <TextField label="수강 중단일" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setEnding(null)}>
            취소
          </Button>
          <Button variant="danger" className="flex-1" onClick={confirmEnd}>
            수강 중단
          </Button>
        </div>
      </Modal>
      <Dialog open={!!error} title="처리할 수 없어요" body={error} primary="확인" onPrimary={() => setError(null)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
