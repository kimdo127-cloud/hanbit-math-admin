"use client";
// 학생 상세 (공통 규칙: 경로·뒤로 → 제목 → 탭, 기본은 보기 모드, [수정] → 편집 모드 + 하단 저장 바)
// 탭: 기본 정보 / 수강 / 출결 / 보강 / 레벨테스트 / 수납·환불 / 변경 이력
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Crumbs, Dialog, EditBar, Loader, Modal, Select, Table, Td, TextField, Toast, fmtDate, won } from "@/components/ui";
import { EnrollModal } from "@/components/enroll-modal";
import { addContactByStaff, addLevelTest, ApiError, deleteLevelTest, removeContactByStaff, sendParentInvite, setPrimaryContact, endEnrollment, getStudentDetail, GRADE_LABEL, listMakeups, today, updateStudent, type MakeupRow } from "@/lib/api";
import { ADVANCE_PASS, judgeLevel, LEVEL_MAX } from "@/lib/level";
import { inviteMessage } from "@/lib/invite-text";
import { shiftMonth } from "@/lib/calc";
import type { Grade, LevelTestKind } from "@/lib/types";

type Detail = Awaited<ReturnType<typeof getStudentDetail>>;
const TABS = ["기본 정보", "수강", "출결", "보강", "레벨테스트", "수납·환불", "변경 이력"] as const;
type Tab = (typeof TABS)[number];

const ENTITY_LABEL: Record<string, string> = { contact: "연락처", invitation: "앱 초대", student: "학생", enrollment: "수강", attendance: "출결", makeup: "보강", payment: "수납", refund: "환불", class: "강좌", staff: "직원", level_test: "레벨테스트" };
const INVITE_STATE: Record<string, { label: string; tone: "brand" | "success" | "warning" | "grey" }> = {
  joined: { label: "가입 완료", tone: "success" },
  active: { label: "초대 보냄", tone: "brand" },
  expired: { label: "초대 만료", tone: "warning" },
  none: { label: "초대 전", tone: "grey" },
};
const RELATIONS = ["엄마", "아빠", "할머니", "할아버지", "보호자"];
const at = (v: string) => `${Number(v.slice(5, 7))}/${Number(v.slice(8, 10))} ${v.slice(11, 16)}`;
const LEVEL_TONE: Record<string, "grey" | "brand" | "success"> = { 기본: "grey", 심화: "brand", 최상위: "success" };
type TestForm = { kind: LevelTestKind; testedOn: string; concept: string; type: string; advanced: string; memo: string };
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
  const [testForm, setTestForm] = useState<TestForm | null>(null);
  const [delTest, setDelTest] = useState<number | null>(null);
  const [inviteText, setInviteText] = useState<string | null>(null);
  const [newContact, setNewContact] = useState<{ relation: string; phone: string } | null>(null);

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

  // 레벨테스트 입력: 점수만 넣으면 판정은 규칙이 정한다 (화면은 미리 보기, 저장 때 백엔드가 다시 계산)
  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const preview = testForm && [testForm.concept, testForm.type, testForm.advanced].every((v) => v.trim() !== "")
    ? { total: num(testForm.concept) + num(testForm.type) + num(testForm.advanced), level: judgeLevel(num(testForm.concept), num(testForm.type), num(testForm.advanced)) }
    : null;
  const saveTest = async () => {
    if (!testForm) return;
    try {
      await addLevelTest(id, { kind: testForm.kind, testedOn: testForm.testedOn, concept: num(testForm.concept), type: num(testForm.type), advanced: num(testForm.advanced), memo: testForm.memo });
      setTestForm(null);
      setToast("레벨테스트 결과를 저장했어요");
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    }
  };
  const confirmDelTest = async () => {
    if (delTest === null) return;
    try {
      await deleteLevelTest(delTest);
      setDelTest(null);
      setToast("레벨테스트 기록을 지웠어요");
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    }
  };
  const latestTest = d.levelTests.find((t) => t.kind !== "advance");
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      setToast(msg);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    }
  };
  const sendInvite = async () => {
    try {
      const r = await sendParentInvite(id);
      setInviteText(inviteMessage(s.name, r));
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    }
  };
  const inv = d.invite;

  return (
    <>
      <Crumbs items={[{ label: s.name }]} />
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold">{s.name}</h1>
            <Badge>{GRADE_LABEL[s.grade]}</Badge>
            {latestTest && <Badge tone={LEVEL_TONE[latestTest.result_level]}>레벨 {latestTest.result_level}</Badge>}
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
            <div className="flex items-center border-b border-grey-100 py-3.5 text-[15px]">
              <span className="w-32 shrink-0 text-grey-500">앱 초대</span>
              <span className="flex flex-1 items-center gap-2">
                <Badge tone={INVITE_STATE[inv.state].tone}>{INVITE_STATE[inv.state].label}</Badge>
                {inv.state === "active" && inv.expiresAt && <span className="tabular text-[13px] text-grey-500">{inv.phone} · {at(inv.expiresAt)}까지</span>}
                {inv.state === "expired" && inv.expiresAt && <span className="tabular text-[13px] text-grey-500">{at(inv.expiresAt)}에 만료</span>}
                {inv.state === "joined" && inv.usedAt && <span className="tabular text-[13px] text-grey-500">{at(inv.usedAt)} 가입</span>}
              </span>
              {inv.state !== "joined" && (
                <Button size="s" variant={inv.state === "active" ? "secondary" : "primary"} onClick={sendInvite}>
                  {inv.state === "none" ? "초대 보내기" : "다시 보내기"}
                </Button>
              )}
            </div>
            {d.contacts.map((c) => (
              <div key={c.id} className="flex items-center border-b border-grey-100 py-3 text-[15px]">
                <span className="w-32 shrink-0 text-grey-500">{c.relation}</span>
                <span className="tabular flex-1 font-semibold">
                  {c.phone}
                  {c.is_primary && (
                    <span className="ml-2">
                      <Badge tone="brand">대표</Badge>
                    </span>
                  )}
                </span>
                {!c.is_primary && (
                  <>
                    <Button size="s" variant="ghost" onClick={() => run(() => setPrimaryContact(c.id), "대표 번호를 바꿨어요. 초대는 새 번호로 다시 보내 주세요")}>
                      대표로
                    </Button>
                    <Button size="s" variant="ghost" onClick={() => run(() => removeContactByStaff(c.id), "연락처를 지웠어요")}>
                      삭제
                    </Button>
                  </>
                )}
              </div>
            ))}
            {newContact ? (
              <div className="flex items-end gap-2 border-b border-grey-100 py-3">
                <Select className="w-28" value={newContact.relation} onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}>
                  {RELATIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
                <TextField className="flex-1" inputMode="tel" placeholder="010-0000-0000" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
                <Button size="m" variant="secondary" onClick={() => setNewContact(null)}>
                  취소
                </Button>
                <Button size="m" disabled={!newContact.phone.trim()} onClick={() => run(async () => { await addContactByStaff(id, newContact.relation, newContact.phone); setNewContact(null); }, "연락처를 추가했어요")}>
                  추가
                </Button>
              </div>
            ) : (
              <button onClick={() => setNewContact({ relation: "아빠", phone: "" })} className="py-3 text-[14px] font-semibold text-brand">
                + 연락처 추가
              </button>
            )}
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
            <p className="mt-3 text-[12px] text-grey-500">연락처는 가족 단위로 저장돼 형제 모두에게 같이 적용돼요. 가입 후에는 보호자도 앱에서 대표가 아닌 번호를 관리할 수 있어요.</p>
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
                      setEndDate(e.start_date > today() ? e.start_date : today());
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

      {tab === "레벨테스트" && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[14px] text-grey-500">
              정기 테스트는 2월·8월 셋째 토요일 (반 편성용) · 입학·선행 테스트는 수시 · 판정: 70점 미만 또는 개념 24점 미만 기본, 90점 이상·심화 15점 이상 최상위, 그 사이 심화
              {d.canAdvance && <b className="ml-2 text-brand">선행 상담 대상</b>}
            </p>
            <Button size="s" onClick={() => setTestForm({ kind: "entry", testedOn: today(), concept: "", type: "", advanced: "", memo: "" })}>
              결과 입력
            </Button>
          </div>
          <Table head={["날짜", "종류", "시험지", "개념", "유형", "심화", "총점", "판정", "입력", "메모", ""]} empty="레벨테스트 기록이 없어요.">
            {d.levelTests.map((t) => (
              <tr key={t.id}>
                <Td className="tabular text-grey-700">{fmtDate(t.tested_on)}</Td>
                <Td>{t.kindLabel}</Td>
                <Td>{GRADE_LABEL[t.test_grade]}</Td>
                <Td className="tabular">{t.concept_score}</Td>
                <Td className="tabular">{t.type_score}</Td>
                <Td className="tabular">{t.advanced_score}</Td>
                <Td className="tabular font-semibold">{t.total_score}</Td>
                <Td>{t.kind === "advance" ? <Badge tone={t.advance_ok ? "success" : "grey"}>{t.advance_ok ? "선행 통과" : "선행 미통과"}</Badge> : <Badge tone={LEVEL_TONE[t.result_level]}>{t.result_level}</Badge>}</Td>
                <Td className="text-grey-500">{t.staffName}</Td>
                <Td className="max-w-56 truncate text-grey-700">{t.memo || "-"}</Td>
                <Td>
                  <Button size="s" variant="ghost" onClick={() => setDelTest(t.id)}>
                    삭제
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        </>
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
        <TextField label="수강 중단일 (이날부터 수업 없음)" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setEnding(null)}>
            취소
          </Button>
          <Button variant="danger" className="flex-1" onClick={confirmEnd}>
            수강 중단
          </Button>
        </div>
      </Modal>
      <Modal open={!!testForm} onClose={() => setTestForm(null)} title="레벨테스트 결과 입력">
        {testForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Select label="종류" value={testForm.kind} onChange={(e) => setTestForm({ ...testForm, kind: e.target.value as LevelTestKind })}>
                <option value="entry">입학</option>
                <option value="regular">정기 (2월·8월)</option>
                <option value="advance">선행 (다음 학년 시험지)</option>
              </Select>
              <TextField label="시험 날짜" type="date" max={today()} value={testForm.testedOn} onChange={(e) => setTestForm({ ...testForm, testedOn: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["concept", "개념", LEVEL_MAX.concept],
                  ["type", "유형", LEVEL_MAX.type],
                  ["advanced", "심화", LEVEL_MAX.advanced],
                ] as const
              ).map(([k, label, max]) => (
                <TextField key={k} label={`${label} (0~${max})`} type="number" min={0} max={max} value={testForm[k]} onChange={(e) => setTestForm({ ...testForm, [k]: e.target.value })} />
              ))}
            </div>
            <TextField label="메모 (강사 코멘트, 학부모에게는 보이지 않음)" value={testForm.memo} onChange={(e) => setTestForm({ ...testForm, memo: e.target.value })} />
            <p className="rounded-m bg-grey-50 px-4 py-3 text-[14px] text-grey-700">
              {preview
                ? testForm.kind === "advance"
                  ? `총점 ${preview.total}점 → ${preview.total >= ADVANCE_PASS ? "선행 통과" : "선행 미통과"} (${ADVANCE_PASS}점 이상 통과, ${GRADE_LABEL[Math.min(12, s.grade + 1) as Grade]} 시험지)`
                  : `총점 ${preview.total}점 → 판정 ${preview.level}`
                : "점수를 넣으면 판정을 미리 보여 줘요. 저장할 때 서버가 같은 규칙으로 다시 계산해요."}
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setTestForm(null)}>
                취소
              </Button>
              <Button className="flex-1" onClick={saveTest}>
                저장
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Dialog
        open={delTest !== null}
        title="레벨테스트 기록을 지울까요?"
        body="잘못 입력한 기록만 지워 주세요. 지운 사실은 변경 이력에 남아요."
        primary="삭제"
        danger
        onPrimary={confirmDelTest}
        secondary="취소"
        onSecondary={() => setDelTest(null)}
      />
      <Modal open={!!inviteText} onClose={() => setInviteText(null)} title="학부모 초대 문자">
        <p className="mb-3 text-[13px] text-grey-500">대표 번호로 보내 주세요. 이전에 보낸 링크는 이제 쓸 수 없어요. 이 창을 닫으면 링크를 다시 볼 수 없어요.</p>
        <pre className="whitespace-pre-wrap rounded-xl bg-grey-100 px-4 py-3 font-sans text-[14px] leading-relaxed text-grey-900">{inviteText}</pre>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setInviteText(null)}>
            닫기
          </Button>
          <Button
            className="flex-1"
            onClick={() =>
              navigator.clipboard?.writeText(inviteText ?? "").then(
                () => (setInviteText(null), setToast("초대 문자를 복사했어요")),
                () => setToast("복사하지 못했어요. 글자를 직접 선택해 주세요"),
              )
            }
          >
            문자 복사
          </Button>
        </div>
      </Modal>
      <Dialog open={!!error} title="처리할 수 없어요" body={error} primary="확인" onPrimary={() => setError(null)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
