"use client";
// 운영 수강 등록 모달. 학생 상세(강좌 고르기) · 강좌 상세(학생 고르기) 두 곳에서 쓴다
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Chip, Dialog, Loader, Modal, SearchInput, fmtDate } from "@/components/ui";
import { ApiError, ENROLL_CHANNELS, GRADE_LABEL, enrollByStaff, listClasses, listStudents, scheduleText, type ClassInfo, type EnrollChannel, type StudentRow } from "@/lib/api";
import type { Student } from "@/lib/types";

export function EnrollModal({
  open,
  onClose,
  onDone,
  student,
  classInfo,
  enrolledClassIds = [],
}: {
  open: boolean;
  onClose: () => void;
  onDone: (msg: string) => void;
  student?: Student; // 학생 상세에서 열면 학생 고정 → 강좌 고르기
  classInfo?: ClassInfo; // 강좌 상세에서 열면 강좌 고정 → 학생 고르기
  enrolledClassIds?: number[];
}) {
  const [classes, setClasses] = useState<ClassInfo[] | null>(null);
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [cls, setCls] = useState<ClassInfo | null>(classInfo ?? null);
  const [stu, setStu] = useState<Student | null>(student ?? null);
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState<EnrollChannel>("상담 후 배정");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCls(classInfo ?? null);
    setStu(student ?? null);
    setQ("");
    setMemo("");
    setChannel("상담 후 배정");
    if (!classInfo) listClasses().then(setClasses);
    if (!student) listStudents().then(setStudents);
  }, [open, classInfo, student]);

  const k = q.trim();
  const classList = useMemo(() => (classes ?? []).filter((c) => !k || c.name.includes(k) || c.teacherName.includes(k)), [classes, k]);
  const studentList = useMemo(() => (students ?? []).filter((r) => !k || r.student.name.includes(k)).slice(0, 30), [students, k]);
  const rosterIds = classInfo ? (students ?? []).filter((r) => r.classes.includes(classInfo.name)).map((r) => r.student.id) : [];
  const start = cls?.nextDate ?? null;
  const offGrade = !!cls && !!stu && cls.target_grade !== stu.grade;

  const submit = async () => {
    if (!cls || !stu) return;
    setBusy(true);
    try {
      const r = await enrollByStaff(stu.id, cls.id, channel, memo);
      onDone(`${stu.name} 학생을 ${cls.name} 강좌에 등록했어요 (${fmtDate(r.start)} 시작)`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={student ? `${student.name} 수강 등록` : `${classInfo?.name} 학생 추가`} width={600}>
        {/* 1. 강좌 또는 학생 고르기 */}
        {!classInfo && (
          <section>
            <p className="mb-2 text-[13px] font-bold text-grey-500">강좌 고르기</p>
            <SearchInput value={q} onChange={setQ} placeholder="강좌 이름·강사 검색" />
            {!classes ? (
              <Loader />
            ) : (
              <ul className="mt-3 max-h-64 divide-y divide-grey-100 overflow-y-auto rounded-xl border border-grey-200">
                {classList.map((c) => {
                  const full = c.count >= c.capacity;
                  const already = enrolledClassIds.includes(c.id);
                  const on = cls?.id === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        disabled={full || already}
                        onClick={() => setCls(c)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-40 ${on ? "bg-brand-weak" : "hover:bg-grey-50"}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold">
                            {c.name} <span className="ml-1 text-[12px] font-normal text-grey-500">{GRADE_LABEL[c.target_grade]}</span>
                          </p>
                          <p className="text-[12px] text-grey-500">
                            {scheduleText(c.schedules)} · {c.teacherName}
                          </p>
                        </div>
                        <span className="text-[12px] font-semibold">
                          {already ? <Badge>수강 중</Badge> : full ? <Badge tone="danger">마감</Badge> : <span className="text-grey-700">{c.capacity - c.count}자리 남음</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
        {!student && (
          <section>
            <p className="mb-2 text-[13px] font-bold text-grey-500">학생 고르기</p>
            <SearchInput value={q} onChange={setQ} placeholder="학생 이름 검색" />
            {!students ? (
              <Loader />
            ) : (
              <ul className="mt-3 max-h-64 divide-y divide-grey-100 overflow-y-auto rounded-xl border border-grey-200">
                {studentList.map((r) => {
                  const already = rosterIds.includes(r.student.id);
                  const on = stu?.id === r.student.id;
                  return (
                    <li key={r.student.id}>
                      <button
                        disabled={already}
                        onClick={() => setStu(r.student)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-40 ${on ? "bg-brand-weak" : "hover:bg-grey-50"}`}
                      >
                        <span className="flex-1 text-[15px] font-semibold">
                          {r.student.name} <span className="ml-1 text-[12px] font-normal text-grey-500">{GRADE_LABEL[r.student.grade]}</span>
                        </span>
                        <span className="text-[12px] text-grey-500">{already ? "이미 수강 중" : r.classes.join(", ") || "다니는 강좌 없음"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* 2. 접수 경로 · 메모 */}
        <section className="mt-5">
          <p className="mb-2 text-[13px] font-bold text-grey-500">접수 경로</p>
          <div className="flex flex-wrap gap-2">
            {ENROLL_CHANNELS.map((c) => (
              <Chip key={c} active={channel === c} onClick={() => setChannel(c)}>
                {c}
              </Chip>
            ))}
          </div>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 (선택) · 예: 레벨 테스트 결과 심화 추천"
            className="mt-3 h-11 w-full rounded-m border border-grey-200 bg-grey-50 px-4 text-[14px] outline-none focus:border-brand focus:bg-white"
          />
        </section>

        {/* 3. 확인 */}
        {cls && stu && (
          <div className="mt-5 space-y-1.5 rounded-xl bg-grey-50 px-4 py-3 text-[14px]">
            <p>
              <b>{stu.name}</b> → <b>{cls.name}</b>
            </p>
            <p className="text-grey-700">첫 수업 {start ? fmtDate(start) : "예정 없음"} · 강좌의 다음 수업일부터 자동으로 시작해요</p>
            {offGrade && <p className="text-warning">대상 학년({GRADE_LABEL[cls.target_grade]})과 학생 학년({GRADE_LABEL[stu.grade]})이 달라요. 선행·복습으로 등록돼요.</p>}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button className="flex-1" disabled={!cls || !stu || busy} onClick={submit}>
            {busy ? "등록 중…" : "수강 등록"}
          </Button>
        </div>
      </Modal>
      <Dialog open={!!error} title="등록할 수 없어요" body={error} primary="확인" onPrimary={() => setError(null)} />
    </>
  );
}
