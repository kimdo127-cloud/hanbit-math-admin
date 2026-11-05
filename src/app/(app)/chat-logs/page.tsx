"use client";
// 고객센터 > 챗봇 문의 내역: 학부모가 앱의 '챗봇 문의'에서 물은 질문과 답 (관리자·매니저)
// 쓰임: '규정에 없음'·'오류'를 모아 보고 규정 문서나 챗봇 설정을 고친다 (답 개선). 휴대폰 번호는 가려서 저장됨
import { useEffect, useState } from "react";
import { Badge, Chip, Loader, Modal, PageHeader, SearchInput, Stat, Table, Td } from "@/components/ui";
import { ApiError, listChatLogs, type ChatLog } from "@/lib/api";

const STATUS: Record<ChatLog["status"], { label: string; tone: "success" | "warning" | "danger" }> = {
  answered: { label: "답함", tone: "success" },
  unknown: { label: "규정에 없음", tone: "warning" },
  error: { label: "오류", tone: "danger" },
};

const when = (t: string) => `${Number(t.slice(5, 7))}/${Number(t.slice(8, 10))} ${t.slice(11, 16)}`;

export default function ChatLogsPage() {
  const [rows, setRows] = useState<ChatLog[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | ChatLog["status"]>("all");
  const [open, setOpen] = useState<ChatLog | null>(null);

  useEffect(() => {
    listChatLogs()
      .then(setRows)
      .catch((e) => setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요."));
  }, []);

  if (error) return <p className="py-24 text-center text-[15px] text-grey-500">{error}</p>;
  if (!rows) return <Loader />;

  const count = (s: ChatLog["status"]) => rows.filter((r) => r.status === s).length;
  const shown = rows.filter(
    (r) => (only === "all" || r.status === only) && (!q.trim() || r.question.includes(q.trim()) || (r.parent_name ?? "").includes(q.trim())),
  );

  return (
    <>
      <PageHeader title="챗봇 문의 내역" desc="학부모가 앱의 챗봇 문의에서 물은 내용이에요. '규정에 없음'이 많은 질문은 규정 문서에 넣을지 검토해요." />
      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="전체 문의" value={rows.length} />
        <Stat label="규정에 없음" value={count("unknown")} tone="warning" />
        <Stat label="오류" value={count("error")} tone="danger" />
      </div>
      <div className="mb-4 flex items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="질문·보호자 검색" />
        <Chip active={only === "all"} onClick={() => setOnly("all")}>
          전체 {rows.length}
        </Chip>
        {(Object.keys(STATUS) as ChatLog["status"][]).map((s) => (
          <Chip key={s} active={only === s} onClick={() => setOnly(s)}>
            {STATUS[s].label} {count(s)}
          </Chip>
        ))}
      </div>
      <Table head={["시각", "보호자", "질문", "근거 규정", "결과"]} empty="아직 챗봇 문의가 없어요.">
        {shown.map((r) => (
          <tr key={r.id} onClick={() => setOpen(r)} className="cursor-pointer hover:bg-grey-50">
            <Td className="tabular whitespace-nowrap text-grey-500">{when(r.asked_at)}</Td>
            <Td className="whitespace-nowrap">{r.parent_name ?? <span className="text-grey-400">탈퇴</span>}</Td>
            <Td className="font-semibold text-grey-900">{r.question}</Td>
            <Td className="text-grey-500">{r.regulations || "-"}</Td>
            <Td>
              <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
            </Td>
          </tr>
        ))}
      </Table>

      <Modal open={!!open} onClose={() => setOpen(null)} title="챗봇 문의" width={560}>
        {open && (
          <div className="space-y-4 text-[15px]">
            <p className="text-[13px] text-grey-500">
              {when(open.asked_at)} · {open.parent_name ?? "탈퇴"} {open.parent_email ? `(${open.parent_email})` : ""}
            </p>
            <div className="rounded-xl bg-grey-100 px-4 py-3">
              <p className="text-[12px] font-semibold text-grey-500">질문</p>
              <p className="mt-1 font-semibold">{open.question}</p>
            </div>
            <div className="rounded-xl border border-grey-200 px-4 py-3">
              <p className="text-[12px] font-semibold text-grey-500">챗봇 답</p>
              <p className="mt-1 whitespace-pre-line leading-relaxed text-grey-700">{(open.answer ?? "답을 가져오지 못했어요 (오류).").replaceAll("**", "")}</p>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-grey-500">근거 규정: {open.regulations || "-"}</span>
              <Badge tone={STATUS[open.status].tone}>{STATUS[open.status].label}</Badge>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
