"use client";
// 정기 레벨테스트 일괄 입력 (2월·8월): 강좌 수강생 표에 점수만 넣으면 판정은 규칙이 정한다
// 중등 강좌는 분야별 정답률도 함께. 강사 코멘트는 학부모 앱에 보이고, AI 초안을 받아 고칠 수 있다
// 입학·선행 테스트는 학생 상세 > 레벨테스트에서 한 명씩
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Crumbs, Dialog, Loader, Table, Td, TextField, Toast, fmtDate } from "@/components/ui";
import { AREA_LABEL, ApiError, draftLevelComment, getLevelTestSheet, levelTestRules, saveLevelTestSheet, today } from "@/lib/api";
import { judgeLevel, LEVEL_MAX } from "@/lib/level";

type Sheet = Awaited<ReturnType<typeof getLevelTestSheet>>;
type AreaKey = keyof typeof AREA_LABEL;
const AREA_KEYS = Object.keys(AREA_LABEL) as AreaKey[];
const AREA_COL: Record<AreaKey, "area_number" | "area_change" | "area_shape" | "area_data"> = { number: "area_number", change: "area_change", shape: "area_shape", data: "area_data" };
type Cell = { concept: string; type: string; advanced: string; memo: string; areas: Record<AreaKey, string> };
const LEVEL_TONE: Record<string, "grey" | "brand" | "success"> = { 기본: "grey", 심화: "brand", 최상위: "success" };
const emptyCell = (): Cell => ({ concept: "", type: "", advanced: "", memo: "", areas: { number: "", change: "", shape: "", data: "" } });

export default function LevelTestSheetPage() {
  const id = Number(useParams().id);
  const [date, setDate] = useState(today());
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [cells, setCells] = useState<Record<number, Cell>>({});
  const [nextRegular, setNextRegular] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    setSheet(null);
    getLevelTestSheet(id, date)
      .then((s) => {
        setSheet(s);
        setCells(
          Object.fromEntries(
            s.rows.map((r) => {
              const t = r.test;
              if (!t) return [r.student.id, emptyCell()];
              const areas = Object.fromEntries(AREA_KEYS.map((k) => [k, t[AREA_COL[k]] === null ? "" : String(t[AREA_COL[k]])])) as Record<AreaKey, string>;
              return [r.student.id, { concept: String(t.concept_score), type: String(t.type_score), advanced: String(t.advanced_score), memo: t.memo, areas }];
            }),
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
  const middle = sheet.cls.target_grade <= 9; // 분야 정답률은 중등 강좌만
  const filled = (c: Cell) => [c.concept, c.type, c.advanced].every((v) => v.trim() !== "");
  const entries = sheet.rows.filter((r) => cells[r.student.id] && filled(cells[r.student.id]));
  const areaInput = (c: Cell) => (middle ? (Object.fromEntries(AREA_KEYS.map((k) => [k, c.areas[k].trim() === "" ? null : Number(c.areas[k])])) as Record<AreaKey, number | null>) : undefined);
  const set = (sid: number, patch: Partial<Cell>) => setCells((cs) => ({ ...cs, [sid]: { ...cs[sid], ...patch } }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await saveLevelTestSheet(
        id,
        date,
        entries.map((x) => {
          const c = cells[x.student.id];
          return { studentId: x.student.id, concept: Number(c.concept), type: Number(c.type), advanced: Number(c.advanced), memo: c.memo, areas: areaInput(c) };
        }),
      );
      setToast(`${r.saved}명 결과를 저장했어요. 학부모에게 알림이 가요`);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const draft = async (sid: number) => {
    const c = cells[sid];
    setDrafting(sid);
    try {
      const r = await draftLevelComment({ studentId: sid, kind: "regular", concept: Number(c.concept), type: Number(c.type), advanced: Number(c.advanced), areas: areaInput(c) });
      set(sid, { memo: r.text });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setDrafting(null);
    }
  };

  const num = (sid: number, k: "concept" | "type" | "advanced", max: number) => (
    <input
      type="number"
      min={0}
      max={max}
      value={cells[sid]?.[k] ?? ""}
      onChange={(e) => set(sid, { [k]: e.target.value })}
      className="tabular h-10 w-14 rounded-s border border-grey-200 bg-grey-100 px-2 text-right text-[14px] outline-none focus:border-brand focus:bg-white"
    />
  );
  const area = (sid: number, k: AreaKey) => (
    <input
      type="number"
      min={0}
      max={100}
      value={cells[sid]?.areas[k] ?? ""}
      onChange={(e) => set(sid, { areas: { ...cells[sid].areas, [k]: e.target.value } })}
      className="tabular h-10 w-14 rounded-s border border-grey-200 bg-grey-100 px-2 text-right text-[14px] outline-none focus:border-brand focus:bg-white"
    />
  );

  return (
    <>
      <Crumbs items={[{ label: sheet.cls.name, href: `/classes/${id}` }, { label: "레벨테스트 입력" }]} />
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold">정기 레벨테스트 입력</h1>
          <p className="mt-1 text-[14px] text-grey-500">
            {sheet.cls.name} · 강좌 수준 {sheet.cls.level}
            {nextRegular && ` · 다음 정기 테스트 ${fmtDate(nextRegular)}`}
          </p>
        </div>
        <TextField label="시험 날짜" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <p className="mb-3 text-[13px] text-grey-500">
        개념 0~{LEVEL_MAX.concept} · 유형 0~{LEVEL_MAX.type} · 심화 0~{LEVEL_MAX.advanced}점{middle && " · 분야는 정답률(%)"} · 강사 코멘트는 학부모 앱에 보여요
      </p>
      <Table
        head={["학생", "개념", "유형", "심화", ...(middle ? AREA_KEYS.map((k) => AREA_LABEL[k]) : []), "판정", "지난 결과", "강사 코멘트"]}
        empty="이 강좌에 다니는 학생이 없어요."
      >
        {sheet.rows.map((r) => {
          const c = cells[r.student.id];
          const ok = c && filled(c);
          const level = ok ? judgeLevel(Number(c.concept), Number(c.type), Number(c.advanced)) : null;
          return (
            <tr key={r.student.id}>
              <Td className="font-semibold">{r.student.name}</Td>
              <Td>{num(r.student.id, "concept", LEVEL_MAX.concept)}</Td>
              <Td>{num(r.student.id, "type", LEVEL_MAX.type)}</Td>
              <Td>{num(r.student.id, "advanced", LEVEL_MAX.advanced)}</Td>
              {middle && AREA_KEYS.map((k) => <Td key={k}>{area(r.student.id, k)}</Td>)}
              <Td>{level ? <Badge tone={LEVEL_TONE[level]}>{level}</Badge> : <span className="text-grey-400">-</span>}</Td>
              <Td className="tabular whitespace-nowrap text-grey-500">{r.previous ? `${fmtDate(r.previous.tested_on)} · ${r.previous.result_level}` : "-"}</Td>
              <Td className="w-80">
                <span className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={c?.memo ?? ""}
                    onChange={(e) => set(r.student.id, { memo: e.target.value })}
                    className="h-10 w-full rounded-s border border-grey-200 bg-grey-100 px-3 text-[14px] outline-none focus:border-brand focus:bg-white"
                  />
                  <Button size="s" variant="secondary" className="whitespace-nowrap" disabled={!ok || drafting === r.student.id} onClick={() => draft(r.student.id)}>
                    {drafting === r.student.id ? "…" : "AI 초안"}
                  </Button>
                </span>
              </Td>
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
