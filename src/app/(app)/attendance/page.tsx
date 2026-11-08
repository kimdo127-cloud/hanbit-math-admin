"use client";
// 출결 입력: [출석]을 누르면 지금 시각이 등원 시각으로 남고, 강좌 시작보다 늦으면 자동으로 지각. 시각은 고칠 수 있음
// 강사는 담당 강좌만 보인다(권한). 수업 내용은 강좌 관리의 진도 계획에서 넣는다
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Badge, Button, Chip, Dialog, Loader, MonthNav, PageHeader, Select, Toast, fmtDate } from "@/components/ui";
import { ApiError, getAttendanceSheet, listClasses, listSessionDates, saveAttendance, statusByTime, today, type ClassInfo } from "@/lib/api";
import { shiftMonth } from "@/lib/calc";
import type { AttendanceStatus } from "@/lib/types";

type Entry = { status: AttendanceStatus; checkedAt: string | null };
const STATUS_LABEL: Record<AttendanceStatus, { label: string; tone: "success" | "warning" | "danger" }> = {
  present: { label: "출석", tone: "success" },
  late: { label: "지각", tone: "warning" },
  absent: { label: "결석", tone: "danger" },
};
const nowHM = () => new Date().toTimeString().slice(0, 5);

function AttendanceInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [classes, setClasses] = useState<ClassInfo[] | null>(null);
  // 강좌를 고르지 않았으면 오늘 수업이 있는 강좌를 먼저
  const todayWd = new Date(today() + "T00:00").getDay();
  // 주소의 강좌가 내가 볼 수 없는 강좌(멤버의 다른 강좌)이면 무시하고 기본 강좌로
  const asked = Number(sp.get("class"));
  const classId = (classes?.some((c) => c.id === asked) ? asked : 0) || classes?.find((c) => c.schedules.some((s) => s.weekday === todayWd))?.id || classes?.[0]?.id || 0;
  const deniedClass = !!classes && asked > 0 && !classes.some((c) => c.id === asked);
  const date = sp.get("date") || "";
  const [month, setMonth] = useState((sp.get("date") || today()).slice(0, 7));
  const [dates, setDates] = useState<string[]>([]);
  const [sheet, setSheet] = useState<Awaited<ReturnType<typeof getAttendanceSheet>> | null>(null);
  const [draft, setDraft] = useState<Record<number, Entry>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = useCallback((c: number, d: string) => router.replace(`/attendance?class=${c}${d ? `&date=${d}` : ""}`), [router]);

  useEffect(() => {
    listClasses().then(setClasses);
  }, []);

  useEffect(() => {
    if (!classId) return;
    listSessionDates(classId, month).then((ds) => {
      setDates(ds);
      if (!date || !ds.includes(date)) {
        const past = ds.filter((d) => d <= today());
        const pick = past[past.length - 1] ?? ds[0];
        if (pick) go(classId, pick);
      }
    });
  }, [classId, month, date, go]);

  const loadSheet = useCallback(() => {
    if (!classId || !date) return;
    getAttendanceSheet(classId, date)
      .then((s) => {
        setSheet(s);
        setDraft(Object.fromEntries(s.rows.filter((r) => r.status).map((r) => [r.student.id, { status: r.status!, checkedAt: r.checkedAt }])));
      })
      .catch(() => setSheet(null));
  }, [classId, date]);
  useEffect(loadSheet, [loadSheet]);

  const save = async () => {
    if (!sheet) return;
    setBusy(true);
    try {
      await saveAttendance(sheet.sessionId, Object.entries(draft).map(([k, v]) => ({ studentId: Number(k), ...v })));
      setToast("출결을 저장했어요");
      loadSheet();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  // 오늘 수업이면 지금 시각, 지난 수업이면 시작 시각을 기본값으로
  const arrive = (id: number) => {
    if (!sheet) return;
    const t = sheet.date === today() ? nowHM() : sheet.startTime;
    setDraft({ ...draft, [id]: { status: statusByTime(sheet.startTime, t), checkedAt: t } });
  };
  const setTime = (id: number, t: string) => sheet && t && setDraft({ ...draft, [id]: { status: statusByTime(sheet.startTime, t), checkedAt: t } });

  if (!classes) return <Loader />;
  const filled = sheet ? sheet.rows.filter((r) => draft[r.student.id]).length : 0;

  return (
    <>
      <PageHeader
        title="출결 확인"
        desc="지각 3번은 결석 1번으로 계산돼요."
        right={
          <a href="/kiosk" target="_blank" className="flex h-10 items-center rounded-m border border-grey-200 bg-white px-4 text-[15px] font-semibold hover:bg-grey-50">
            등원 키오스크 열기 ↗
          </a>
        }
      />
      {deniedClass && <p className="mb-4 rounded-m bg-warning-weak px-4 py-3 text-[14px] text-grey-700">담당 강좌가 아니라서 열 수 없어요. 내 강좌를 보여 드려요.</p>}

      <div className="flex flex-wrap items-end gap-3">
        <Select className="w-72" value={classId} onChange={(e) => go(Number(e.target.value), "")}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.teacherName}
              {c.schedules.some((s) => s.weekday === todayWd) ? " · 오늘 수업" : ""}
            </option>
          ))}
        </Select>
        <div className="flex h-12 items-center rounded-m bg-white px-2">
          <MonthNav month={month} onChange={(d) => setMonth(shiftMonth(month, d))} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {dates.map((d) => (
          <Chip key={d} active={d === date} onClick={() => go(classId, d)}>
            {Number(d.slice(5, 7))}/{Number(d.slice(8))}
            {d === today() && <span className="ml-1 text-[11px] opacity-70">오늘</span>}
            {d > today() && <span className="ml-1 text-[11px] opacity-60">예정</span>}
          </Chip>
        ))}
        {dates.length === 0 && <p className="text-[14px] text-grey-500">이 달에는 수업일이 없어요.</p>}
      </div>

      {sheet && (
        <section className="mt-6 overflow-hidden rounded-3xl bg-white">
          <div className="flex items-center justify-between border-b border-grey-200 px-6 py-4">
            <div>
              <p className="text-[17px] font-bold">{fmtDate(sheet.date)}</p>
              <p className="text-[13px] text-grey-500">
                {sheet.startTime} 시작 · 등원 {sheet.rows.filter((r) => r.checkedAt).length}/{sheet.rows.length}명
                {!sheet.future && sheet.rows.some((r) => !r.status) && <span className="text-warning"> · 미등원 {sheet.rows.filter((r) => !r.status).length}명</span>}
              </p>
              <p className="mt-1 text-[13px] text-grey-700">
                수업 내용 · {sheet.topic ?? <span className="text-grey-400">진도 계획 없음 (강좌 관리에서 입력)</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="m"
                disabled={sheet.future}
                onClick={() => setDraft({ ...draft, ...Object.fromEntries(sheet.rows.filter((r) => !draft[r.student.id]).map((r) => [r.student.id, { status: "absent" as const, checkedAt: null }])) })}
              >
                미등원 학생 결석 처리
              </Button>
              <Button size="m" disabled={busy || sheet.future || filled === 0} onClick={save}>
                저장
              </Button>
            </div>
          </div>
          {sheet.future && <p className="bg-grey-50 px-6 py-3 text-[13px] text-grey-500">아직 오지 않은 수업일이라 입력할 수 없어요.</p>}
          <ul className="divide-y divide-grey-100">
            {sheet.rows.map((r) => (
              <li key={r.student.id} className="flex items-center gap-4 px-6 py-3">
                <span className="flex w-36 items-center gap-1.5 text-[15px] font-semibold">
                  {r.student.name}
                  {r.offGrade && <Badge tone="brand">선행</Badge>}
                  {r.source === "kiosk" && <span className="text-[11px] font-normal text-grey-400">키오스크</span>}
                </span>
                <div className="flex gap-1.5">
                  <button
                    disabled={sheet.future}
                    onClick={() => arrive(r.student.id)}
                    className={`h-9 w-16 rounded-[10px] text-[13px] font-semibold transition-colors disabled:opacity-30 ${
                      draft[r.student.id] && draft[r.student.id].status !== "absent" ? "bg-grey-900 text-white" : "bg-grey-100 text-grey-700"
                    }`}
                  >
                    등원
                  </button>
                  <button
                    disabled={sheet.future}
                    onClick={() => setDraft({ ...draft, [r.student.id]: { status: "absent", checkedAt: null } })}
                    className={`h-9 w-16 rounded-[10px] text-[13px] font-semibold transition-colors disabled:opacity-30 ${
                      draft[r.student.id]?.status === "absent" ? "bg-danger text-white" : "bg-grey-100 text-grey-700"
                    }`}
                  >
                    결석
                  </button>
                </div>
                {draft[r.student.id] && draft[r.student.id].status !== "absent" && (
                  <input
                    aria-label={`${r.student.name} 등원 시각 (24시간, 예: 17:05)`}
                    inputMode="numeric"
                    maxLength={5}
                    defaultValue={draft[r.student.id].checkedAt ?? ""}
                    key={draft[r.student.id].checkedAt ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "").padStart(4, "0");
                      const t = `${v.slice(0, 2)}:${v.slice(2, 4)}`;
                      if (/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) setTime(r.student.id, t);
                      else e.target.value = draft[r.student.id].checkedAt ?? "";
                    }}
                    className="tabular h-9 w-20 rounded-[10px] border border-grey-200 text-center text-[14px] outline-none focus:border-brand"
                  />
                )}
                {draft[r.student.id] ? (
                  <Badge tone={STATUS_LABEL[draft[r.student.id].status].tone}>{STATUS_LABEL[draft[r.student.id].status].label}</Badge>
                ) : (
                  !sheet.future && <Badge>미등원</Badge>
                )}
                {r.leftAt && <span className="tabular text-[13px] text-grey-500">{r.leftAt} 하원</span>}
                {r.status && (draft[r.student.id]?.status !== r.status || draft[r.student.id]?.checkedAt !== r.checkedAt) && <Badge tone="brand">바뀜</Badge>}
              </li>
            ))}
          </ul>
          {sheet.makeupStudents.length > 0 && (
            <div className="border-t border-grey-200 bg-brand-weak/40 px-6 py-4">
              <p className="text-[13px] font-semibold text-brand">이날 보강으로 오는 학생</p>
              {sheet.makeupStudents.map((m) => (
                <p key={m.student.id} className="mt-1 text-[14px]">
                  {m.student.name} <span className="text-grey-500">· {m.fromClass} {fmtDate(m.absentDate)} 결석분</span>
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      <Dialog open={!!error} title="저장할 수 없어요" body={error} primary="확인" onPrimary={() => setError(null)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<Loader />}>
      <AttendanceInner />
    </Suspense>
  );
}
