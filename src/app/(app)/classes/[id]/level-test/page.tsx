"use client";
// 정기 레벨테스트 일괄 입력 (2월·8월): 강좌 수강생 표에 영역 점수만 넣으면 판정은 규칙이 정한다
// 학생 수십 명을 한 화면에서 입력하려고 만든 화면. 입학·선행 테스트는 학생 상세 > 레벨테스트에서 한 명씩
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Crumbs, Dialog, Loader, Table, Td, TextField, Toast, fmtDate } from "@/components/ui";
import { ApiError, getLevelTestSheet, levelTestRules, saveLevelTestSheet, today } from "@/lib/api";
import { judgeLevel, LEVEL_MAX } from "@/lib/level";

type Sheet = Awaited<ReturnType<typeof getLevelTestSheet>>;
type Cell = { concept: string; type: string; advanced: string; memo: string };
const LEVEL_TONE: Record<string, "grey" | "brand" | "success"> = { 기본: "grey", 심화: "brand", 최상위: "success" };

export default function LevelTestSheetPage() {
  const id = Number(useParams().id);
  const [date, setDate] = useState(today());
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [cells, setCells] = useState<Record<number, Cell>>({});
  const [nextRegular, setNextRegular] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    setSheet(null);
    getLevelTestSheet(id, date)
      .then((s) => {
        setSheet(s);
        setCells(
          Object.fromEntries(
            s.rows.map((r) => [
              r.student.id,
              r.test
                ? { concept: String(r.test.concept_score), type: String(r.test.type_score), advanced: String(r.test.advanced_score), memo: r.test.memo }
                : { concept: "", type: "", advanced: "", memo: "" },
            ]),
          ),
        );
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요."));
  }, [id, date]);
  useEffect(load, [load]);
  useEffect(() => {
    levelTestRules().then((r) => setNextRegular(r.nextRegular)).catch(() => {});
  }, []);

  if (!sheet) return <Loader />;
  const filled = (c: Cell) => [c.concept, c.type, c.advanced].every((v) => v.trim() !== "");
  const entries = sheet.rows.filter((r) => cells[r.student.id] && filled(cells[r.student.id]));

  const save = async () => {
    setSaving(true);
    try {
      const r = await saveLevelTestSheet(
        id,
        date,
        entries.map((x) => {
          const c = cells[x.student.id];
          return { studentId: x.student.id, concept: Number(c.concept), type: Number(c.type), advanced: Number(c.advanced), memo: c.memo };
        }),
      );
      setToast(`${r.saved}명 결과를 저장했어요`);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const input = (sid: number, k: keyof Cell, max?: number) => (
    <input
      type={k === "memo" ? "text" : "number"}
      min={0}
      max={max}
      value={cells[sid]?.[k] ?? ""}
      onChange={(e) => setCells({ ...cells, [sid]: { ...cells[sid], [k]: e.target.value } })}
      className={`h-10 rounded-s border border-grey-200 bg-grey-100 px-3 text-[14px] outline-none focus:border-brand focus:bg-white ${k === "memo" ? "w-full" : "tabular w-16 text-right"}`}
    />
  );

  return (
    <>
      <Crumbs items={[{ label: sheet.cls.name, href: `/classes/${id}` }, { label: "레벨테스트 입력" }]} />
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold">정기 레벨테스트 입력</h1>
          <p className="mt-1 text-[14px] text-grey-500">
            {sheet.cls.name} · 강좌 수준 {sheet.cls.level} · 정기 테스트는 2월·8월 셋째 토요일{nextRegular && ` (다음: ${fmtDate(nextRegular)})`}
          </p>
        </div>
        <TextField label="시험 날짜" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <p className="mb-3 text-[13px] text-grey-500">
        개념 0~{LEVEL_MAX.concept} · 유형 0~{LEVEL_MAX.type} · 심화 0~{LEVEL_MAX.advanced}점. 판정: 70점 미만 또는 개념 24점 미만 기본, 90점 이상·심화 15점 이상 최상위, 그 사이 심화.
        같은 날짜로 다시 저장하면 고쳐 써요.
      </p>
      <Table head={["학생", "개념", "유형", "심화", "총점", "판정", "지난 결과", "메모"]} empty="이 강좌에 다니는 학생이 없어요.">
        {sheet.rows.map((r) => {
          const c = cells[r.student.id];
          const ok = c && filled(c);
          const total = ok ? Number(c.concept) + Number(c.type) + Number(c.advanced) : null;
          const level = ok ? judgeLevel(Number(c.concept), Number(c.type), Number(c.advanced)) : null;
          return (
            <tr key={r.student.id}>
              <Td className="font-semibold">{r.student.name}</Td>
              <Td>{input(r.student.id, "concept", LEVEL_MAX.concept)}</Td>
              <Td>{input(r.student.id, "type", LEVEL_MAX.type)}</Td>
              <Td>{input(r.student.id, "advanced", LEVEL_MAX.advanced)}</Td>
              <Td className="tabular font-semibold">{total ?? "-"}</Td>
              <Td>{level ? <Badge tone={LEVEL_TONE[level]}>{level}</Badge> : <span className="text-grey-400">-</span>}</Td>
              <Td className="tabular text-grey-500">{r.previous ? `${fmtDate(r.previous.tested_on)} · ${r.previous.total_score}점 ${r.previous.result_level}` : "-"}</Td>
              <Td className="w-72">{input(r.student.id, "memo")}</Td>
            </tr>
          );
        })}
      </Table>
      <div className="mt-4 flex justify-end">
        <Button className="whitespace-nowrap px-6" onClick={save} disabled={saving || entries.length === 0}>
          {entries.length}명 저장
        </Button>
      </div>
      <Dialog open={!!error} title="처리할 수 없어요" body={error} primary="확인" onPrimary={() => setError(null)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
