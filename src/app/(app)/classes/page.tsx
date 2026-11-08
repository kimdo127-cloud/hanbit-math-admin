"use client";
// 강좌 목록 (공통 규칙: 제목 + [강좌 등록] → 검색·필터 → 표). 등록·수정은 전용 화면에서
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge, Chip, Loader, PageHeader, SearchInput, Table, Td, won } from "@/components/ui";
import { currentStaff, GRADE_LABEL, listClasses, scheduleText, type ClassInfo } from "@/lib/api";
import type { Grade } from "@/lib/types";

export default function ClassesPage() {
  const router = useRouter();
  const isAdmin = currentStaff()?.role === "admin";
  const [rows, setRows] = useState<ClassInfo[] | null>(null);
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);

  useEffect(() => {
    listClasses().then(setRows);
  }, []);

  const grades = useMemo(() => [...new Set(rows?.map((r) => r.target_grade) ?? [])].sort((a, b) => a - b), [rows]);
  if (!rows) return <Loader />;
  const k = q.trim();
  const shown = rows.filter((c) => (!k || c.name.includes(k) || c.teacherName.includes(k)) && (grade === null || c.target_grade === grade));

  return (
    <>
      <PageHeader
        title="강좌"
        right={
          isAdmin && (
            <Link href="/classes/new" className="flex h-10 items-center gap-1 rounded-m bg-brand px-4 text-[15px] font-semibold text-white">
              <Plus size={16} /> 강좌 등록
            </Link>
          )
        }
      />
      <div className="mb-4 flex items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="강좌 이름·강사 검색" />
        <Chip active={grade === null} onClick={() => setGrade(null)}>
          전체
        </Chip>
        {grades.map((g) => (
          <Chip key={g} active={grade === g} onClick={() => setGrade(g)}>
            {GRADE_LABEL[g]}
          </Chip>
        ))}
      </div>
      <Table head={["강좌", "학년", "수준", "수업 요일·시간", "강사", "인원", "월 수강료"]} empty="찾는 강좌가 없어요.">
        {shown.map((c) => (
          <tr key={c.id} onClick={() => { router.push(`/classes/${c.id}`); }} className="cursor-pointer hover:bg-grey-50">
            <Td>
              <Link href={`/classes/${c.id}`} className="font-semibold hover:text-brand">
                {c.name}
              </Link>
            </Td>
            <Td>{GRADE_LABEL[c.target_grade]}</Td>
            <Td className="text-grey-700">{c.level || "-"}</Td>
            <Td className="text-grey-700">{scheduleText(c.schedules)}</Td>
            <Td>{c.teacherName}</Td>
            <Td className="tabular">
              {c.count}/{c.capacity}명 {c.count >= c.capacity ? <Badge tone="danger">마감</Badge> : c.capacity - c.count <= 1 ? <Badge tone="warning">1자리</Badge> : null}
            </Td>
            <Td className="tabular">{won(c.monthly_fee)}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
