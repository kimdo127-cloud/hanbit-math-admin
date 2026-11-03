"use client";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Chip, Dialog, Loader, MonthNav, PageHeader, SearchInput, Stat, Table, Td, TextField, Modal, Toast, fmtDate, won } from "@/components/ui";
import { ApiError, cancelPaid, fmtRefundDue, GRADE_LABEL, listPayments, listRefunds, markPaid, markRefunded, today, type RefundRow } from "@/lib/api";
import { shiftMonth } from "@/lib/calc";

type Row = Awaited<ReturnType<typeof listPayments>>[number];

// 환불: 수강 중단 후 5일 안에 돌려준다. 금액은 학원법 기준으로 계산해 보여 주고, 실제 돌려준 금액·날짜를 기록
function RefundPanel() {
  const [rows, setRows] = useState<RefundRow[] | null>(null);
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<RefundRow | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const load = useCallback(() => {
    listRefunds().then(setRows);
  }, []);
  useEffect(load, [load]);

  const submit = async () => {
    if (!target) return;
    try {
      await markRefunded(target.enrollmentId, Number(amount.replaceAll(",", "")), date);
      setTarget(null);
      setToast(`${target.student.name} 환불 처리를 기록했어요`);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    }
  };

  if (!rows) return <Loader />;
  const pending = rows.filter((r) => !r.refundedAt);
  const k = q.trim();
  const shownRows = rows.filter((r) => !k || r.student.name.includes(k) || r.className.includes(k));
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="처리 대기" value={`${pending.length}건`} tone={pending.length ? "warning" : undefined} />
        <Stat label="기한 지남" value={`${pending.filter((r) => r.dLeft < 0).length}건`} tone={pending.some((r) => r.dLeft < 0) ? "danger" : undefined} />
        <Stat label="환불 예정 금액" value={won(pending.reduce((t, r) => t + r.calc.amount, 0))} />
      </div>
      <div className="mt-6">
        <div className="mb-3">
          <SearchInput value={q} onChange={setQ} placeholder="학생 이름·강좌 검색" />
        </div>
        <Table head={["학생", "강좌", "수강 중단일", "계산 근거", "환불 금액", "기한", ""]} empty="해당하는 기록이 없어요.">
          {shownRows.map((r) => (
            <tr key={r.enrollmentId} className={r.refundedAt ? "text-grey-500" : ""}>
              <Td>
                <b className={r.refundedAt ? "font-semibold" : ""}>{r.student.name}</b> <span className="text-grey-500">{GRADE_LABEL[r.student.grade]}</span>
              </Td>
              <Td>{r.className}</Td>
              <Td className="tabular">{fmtDate(r.endDate)}</Td>
              <Td className="text-[13px]">
                낸 금액 {won(r.calc.paid)} · {r.calc.done}/{r.calc.total}회 진행
                <br />
                <span className="text-grey-500">{r.calc.rule}</span>
              </Td>
              <Td className="tabular font-semibold">{won(r.refundAmount ?? r.calc.amount)}</Td>
              <Td>
                {r.refundedAt ? (
                  <Badge tone="success">{fmtDate(r.refundedAt)} 환불함</Badge>
                ) : r.dLeft < 0 ? (
                  <span className="flex flex-col items-start gap-1">
                    <Badge tone="danger">{-r.dLeft}일 지남</Badge>
                    <span className="text-[12px] text-grey-500">{fmtDate(r.due)}까지였어요</span>
                  </span>
                ) : (
                  <Badge tone="warning">{fmtRefundDue(r)}</Badge>
                )}
              </Td>
              <Td className="text-right">
                {!r.refundedAt && (
                  <Button
                    size="s"
                    onClick={() => {
                      setTarget(r);
                      setAmount(String(r.calc.amount));
                      setDate(today());
                    }}
                  >
                    환불 기록
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
        <p className="mt-3 text-[12px] text-grey-500">학원법 기준: 수업 시작 전 전액 · 1/3 지나기 전 2/3 · 1/2 지나기 전 1/2 · 그 뒤 환불 없음. 수강 중단 후 5일 안에 돌려줘요.</p>
      </div>

      <Modal open={!!target} onClose={() => setTarget(null)} title="환불 기록">
        {target && (
          <>
            <p className="mb-4 text-[15px] text-grey-700">
              {target.student.name} · {target.className} · 계산 금액 <b className="text-grey-900">{won(target.calc.amount)}</b>
            </p>
            <div className="space-y-3">
              <TextField label="돌려준 금액 (원)" inputMode="numeric" value={amount === "" ? "" : Number(amount).toLocaleString()} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} />
              <TextField label="환불일" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <p className="mt-2 text-[12px] text-grey-500">계산 금액과 다르게 돌려줬다면 실제 금액을 적어 주세요. 낸 금액보다 많을 수는 없어요.</p>
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setTarget(null)}>
                닫기
              </Button>
              <Button className="flex-1" disabled={amount === ""} onClick={submit}>
                기록하기
              </Button>
            </div>
          </>
        )}
      </Modal>
      <Dialog open={!!error} title="기록할 수 없어요" body={error} primary="확인" onPrimary={() => setError(null)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

export default function PaymentsPage() {
  const [tab, setTab] = useState<"pay" | "refund">("pay");
  useEffect(() => {
    if (new URLSearchParams(location.search).get("tab") === "refund") setTab("refund");
  }, []);
  return (
    <>
      <PageHeader crumbs={[{ label: tab === "refund" ? "환불" : "수납" }]} title="수납 · 환불" desc="학생·강좌·달마다 납부를 남기고, 수강 중단된 수강은 5일 안에 환불을 기록해요." />
      <div className="mb-6 flex gap-1 border-b border-grey-200">
        {(
          [
            ["pay", "수납"],
            ["refund", "환불"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => {
              setTab(k);
              history.replaceState(null, "", k === "refund" ? "/payments?tab=refund" : "/payments");
            }}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[15px] font-semibold ${tab === k ? "border-grey-900 text-grey-900" : "border-transparent text-grey-500"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "pay" ? <PayPanel /> : <RefundPanel />}
    </>
  );
}

function PayPanel() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<"unpaid" | "all">("unpaid");
  const [pay, setPay] = useState<Row | null>(null);
  const [paidAt, setPaidAt] = useState(today());
  const [error, setError] = useState<string | null>(null);
  const [cancel, setCancel] = useState<Row | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    setRows(null);
    listPayments(month).then(setRows);
  }, [month]);
  useEffect(load, [load]);

  const confirmPay = async () => {
    if (!pay) return;
    try {
      await markPaid(pay.studentId, pay.classId, month, paidAt);
      setPay(null);
      setToast(`${pay.studentName} ${won(pay.amount)} 납부 처리했어요`);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    }
  };

  const unpaid = rows?.filter((r) => r.status === "unpaid") ?? [];
  const k = q.trim();
  const shown = (filter === "unpaid" ? rows?.filter((r) => r.status !== "paid") : rows)?.filter((r) => !k || r.studentName.includes(k) || r.className.includes(k));

  return (
    <>
      <div className="mb-4 flex justify-end">
        <div className="rounded-m bg-white px-2 py-1">
          <MonthNav month={month} onChange={(d) => setMonth(shiftMonth(month, d))} />
        </div>
      </div>
      {!rows ? (
        <Loader />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="청구" value={`${rows.length}건`} />
            <Stat label="미납" value={`${unpaid.length}건`} tone={unpaid.length ? "danger" : undefined} />
            <Stat label="미납 금액" value={won(unpaid.reduce((s, r) => s + r.amount, 0))} tone={unpaid.length ? "danger" : undefined} />
          </div>
          <div className="mt-6 mb-3 flex items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="학생 이름·강좌 검색" />
            <Chip active={filter === "unpaid"} onClick={() => setFilter("unpaid")}>
              미납만
            </Chip>
            <Chip active={filter === "all"} onClick={() => setFilter("all")}>
              전체
            </Chip>
          </div>
          <Table head={["학생", "강좌", "청구 금액", "상태", "납부일", ""]} empty="미납이 없어요.">
            {shown!.map((r) => (
              <tr key={`${r.studentId}-${r.classId}`}>
                <Td>
                  <b>{r.studentName}</b> <span className="text-grey-500">{GRADE_LABEL[r.grade]}</span>
                </Td>
                <Td>{r.className}</Td>
                <Td className="tabular">
                  {won(r.paidAmount ?? r.amount)}
                  {r.discount && <span className="ml-1.5 text-[12px] text-brand">형제 할인</span>}
                </Td>
                <Td>
                  {r.status === "paid" ? <Badge tone="success">납부</Badge> : r.status === "upcoming" ? <Badge>청구 전</Badge> : <Badge tone="danger">미납</Badge>}
                </Td>
                <Td className="text-grey-500">{r.paidAt ?? "-"}</Td>
                <Td className="text-right">
                  {r.status === "paid" ? (
                    <Button variant="ghost" size="s" onClick={() => setCancel(r)}>
                      취소
                    </Button>
                  ) : (
                    <Button size="s" onClick={() => { setPay(r); setPaidAt(today()); }}>
                      납부 처리
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 text-[12px] text-grey-500">형제는 나이순 둘째부터 10% 할인된 금액이에요.</p>
        </>
      )}

      <Modal open={!!pay} onClose={() => setPay(null)} title="납부 처리">
        {pay && (
          <>
            <p className="mb-4 text-[15px] text-grey-700">
              {pay.studentName} · {pay.className} · <b className="text-grey-900">{won(pay.amount)}</b>
              {pay.discount && " (형제 할인)"}
            </p>
            <TextField label="납부일" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            <p className="mt-2 text-[12px] text-grey-500">낸 금액은 지금 기준으로 저장돼요. 나중에 형제가 수강을 중단해도 바뀌지 않아요.</p>
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPay(null)}>
                닫기
              </Button>
              <Button className="flex-1" onClick={confirmPay}>
                납부 처리
              </Button>
            </div>
          </>
        )}
      </Modal>
      <Dialog
        open={!!cancel}
        title="납부 처리를 취소할까요?"
        body={cancel ? `${cancel.studentName} · ${cancel.className} ${won(cancel.paidAmount ?? cancel.amount)}이 다시 미납이 돼요.` : ""}
        primary="취소하기"
        secondary="닫기"
        danger
        onSecondary={() => setCancel(null)}
        onPrimary={async () => {
          const c = cancel;
          setCancel(null);
          if (c) {
            await cancelPaid(c.studentId, c.classId, month);
            setToast("납부 처리를 취소했어요");
            load();
          }
        }}
      />
      <Dialog open={!!error} title="처리할 수 없어요" body={error} primary="확인" onPrimary={() => setError(null)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
