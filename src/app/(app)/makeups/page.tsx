"use client";
// 보강: 고객이 앱에서 결석 1건마다 1회 신청한다. 운영은 현황을 보고, 앱을 못 쓰는 보호자가 전화로 요청하면 대신 신청·취소
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Chip, Dialog, Loader, Modal, MonthNav, PageHeader, SearchInput, Stat, Table, Td, Toast, fmtDate } from "@/components/ui";
import { ApiError, GRADE_LABEL, createMakeup, deleteMakeup, listMakeupSlots, listMakeups, today, type MakeupRow, type MakeupSlot, type MakeupState } from "@/lib/api";
import { shiftMonth } from "@/lib/calc";

const STATE: Record<MakeupState, { label: string; tone: "brand" | "success" | "warning" | "grey" | "danger" }> = {
  available: { label: "신청 전", tone: "warning" },
  booked: { label: "보강 예정", tone: "brand" },
  done: { label: "보강 완료", tone: "success" },
  full: { label: "남은 수업 없음", tone: "grey" },
  expired: { label: "기간 지남", tone: "grey" },
};

export default function MakeupsPage() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [list, setList] = useState<MakeupRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | MakeupState>("all");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<MakeupRow | null>(null);
  const [slots, setSlots] = useState<MakeupSlot[] | null>(null);
  const [cancel, setCancel] = useState<MakeupRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    setList(null);
    listMakeups(month).then(setList);
  }, [month]);
  useEffect(load, [load]);

  const open = async (r: MakeupRow) => {
    setTarget(r);
    setSlots(null);
    setSlots(await listMakeupSlots(r.attendanceId));
  };

  const book = async (slot: MakeupSlot) => {
    if (!target) return;
    try {
      await createMakeup(target.attendanceId, slot.sessionId);
      setTarget(null);
      setToast(`${target.student.name} 보강을 ${fmtDate(slot.date)} ${slot.className}로 신청했어요`);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    }
  };

  const doCancel = async () => {
    const r = cancel;
    setCancel(null);
    if (!r?.booked) return;
    try {
      await deleteMakeup(r.booked.makeupId);
      setToast(`${r.student.name} 보강 신청을 취소했어요`);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    }
  };

  const count = (s: MakeupState) => list?.filter((r) => r.state === s).length ?? 0;
  const k = q.trim();
  const shown = list?.filter((r) => (filter === "all" || r.state === filter) && (!k || r.student.name.includes(k) || r.className.includes(k))) ?? [];

  return (
    <>
      <PageHeader
        title="보강"
        desc="결석 1건마다 보강 1회. 고객이 앱에서 결석한 달 안, 같은 학년 다른 강좌 수업 중 자리 있는 날을 직접 신청해요. 전화로 요청하면 여기서 대신 신청할 수 있어요."
        right={
          <div className="rounded-m bg-white px-2 py-1">
            <MonthNav month={month} onChange={(d) => setMonth(shiftMonth(month, d))} />
          </div>
        }
      />

      {!list ? (
        <Loader />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            <Stat label="결석" value={`${list.length}건`} />
            <Stat label="신청 전" value={`${count("available")}건`} tone={count("available") ? "warning" : undefined} />
            <Stat label="보강 예정" value={`${count("booked")}건`} tone={count("booked") ? "brand" : undefined} />
            <Stat label="남은 수업 없음" value={`${count("full")}건`} />
          </div>

          <div className="mt-6 mb-3 flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="학생 이름·강좌 검색" />
            {(["all", "available", "booked", "done", "full", "expired"] as const).map((k) => (
              <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>
                {k === "all" ? "전체" : STATE[k].label}
              </Chip>
            ))}
          </div>

          <Table head={["학생", "결석한 수업", "보강", "상태", ""]} empty="해당하는 결석이 없어요.">
            {shown.map((r) => (
              <tr key={r.attendanceId}>
                <Td>
                  <b>{r.student.name}</b> <span className="text-grey-500">{GRADE_LABEL[r.student.grade]}</span>
                </Td>
                <Td>
                  {fmtDate(r.date)} <span className="text-grey-500">· {r.className}</span>
                </Td>
                <Td>
                  {r.booked ? (
                    <span className="tabular">
                      {fmtDate(r.booked.date)} {r.booked.className} {r.booked.time.split("~")[0]}
                      <span className="block text-[12px] text-grey-400">{`${Number(r.booked.requestedAt.slice(5, 7))}/${Number(r.booked.requestedAt.slice(8, 10))} ${r.booked.requestedAt.slice(11, 16)}`} 신청</span>
                    </span>
                  ) : (
                    <span className="text-grey-500">
                      {r.state === "available" ? `${fmtDate(r.deadline)}까지 신청 가능` : r.state === "expired" ? "신청 기간 지남" : "들어갈 수 있는 수업이 없어요"}
                    </span>
                  )}
                </Td>
                <Td>
                  <Badge tone={STATE[r.state].tone}>{STATE[r.state].label}</Badge>
                </Td>
                <Td className="text-right">
                  {r.state === "available" && (
                    <Button variant="secondary" size="s" onClick={() => open(r)}>
                      대신 신청
                    </Button>
                  )}
                  {r.state === "booked" && (
                    <Button variant="ghost" size="s" onClick={() => setCancel(r)}>
                      취소
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 text-[12px] text-grey-500">남은 수업 없음: 신청 기간 안에 같은 학년 다른 강좌 수업이 더 없거나 모두 찼어요.</p>
        </>
      )}

      <Modal open={!!target} onClose={() => setTarget(null)} title={`${target?.student.name} 보강 대신 신청`} width={560}>
        {target && (
          <p className="-mt-2 mb-4 text-[14px] text-grey-700">
            {fmtDate(target.date)} {target.className} 결석분 · 같은 학년 다른 강좌 수업 중 자리 있는 날이에요.
          </p>
        )}
        {!slots ? (
          <Loader />
        ) : slots.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-grey-500">이 달에 들어갈 수 있는 다른 강좌 수업이 없어요.</p>
        ) : (
          <ul className="divide-y divide-grey-100 rounded-xl border border-grey-200">
            {slots.map((s) => (
              <li key={s.sessionId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-[15px] font-semibold">
                    {fmtDate(s.date)} · {s.className}
                  </p>
                  <p className="tabular text-[13px] text-grey-500">
                    {s.time} · 원래 {s.regular}명 + 보강 {s.makeups}명 / 정원 {s.capacity}명
                  </p>
                </div>
                <Button size="s" onClick={() => book(s)}>
                  신청
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Dialog
        open={!!cancel}
        title="보강 신청을 취소할까요?"
        body={cancel?.booked ? `${cancel.student.name} · ${fmtDate(cancel.booked.date)} ${cancel.booked.className}` : ""}
        primary="취소하기"
        secondary="닫기"
        danger
        onSecondary={() => setCancel(null)}
        onPrimary={doCancel}
      />
      <Dialog open={!!error} title="처리할 수 없어요" body={error} primary="확인" onPrimary={() => setError(null)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
