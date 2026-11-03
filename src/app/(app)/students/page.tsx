"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Chip, Loader, PageHeader, SearchInput, Table, Td, won } from "@/components/ui";
import { GRADE_LABEL, listStudents, type StudentRow } from "@/lib/api";

export default function StudentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "makeup" | "unpaid" | "ended">("all");

  useEffect(() => {
    listStudents().then(setRows);
  }, []);
  if (!rows) return <Loader />;

  const shown = rows.filter(
    (r) =>
      (r.student.name.includes(q.trim()) || r.classes.some((c) => c.includes(q.trim()))) &&
      (only === "all" ? r.active : only === "ended" ? !r.active : (only === "makeup" && r.attendance.needsMakeup) || (only === "unpaid" && r.unpaid > 0)),
  );

  return (
    <>
      <PageHeader title="학생" desc="이번 달 출석률은 지각 3번을 결석 1번으로 계산해요. 출석·지각·결석은 이번 달 횟수예요." />
      <div className="mb-4 flex items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="이름·강좌 검색" />
        <Chip active={only === "all"} onClick={() => setOnly("all")}>
          다니는 학생 {rows.filter((r) => r.active).length}
        </Chip>
        <Chip active={only === "makeup"} onClick={() => setOnly("makeup")}>
          보강 신청 전 {rows.filter((r) => r.attendance.needsMakeup).length}
        </Chip>
        <Chip active={only === "unpaid"} onClick={() => setOnly("unpaid")}>
          미납 {rows.filter((r) => r.unpaid > 0).length}
        </Chip>
        <Chip active={only === "ended"} onClick={() => setOnly("ended")}>
          수강 중단 {rows.filter((r) => !r.active).length}
        </Chip>
      </div>
      <Table head={["이름", "학년", "다니는 강좌", "이번 달 출석률", "출석·지각·결석", "보강", "미납"]} empty="찾는 학생이 없어요.">
        {shown.map((r) => (
          <tr key={r.student.id} onClick={() => { router.push(`/students/${r.student.id}`); }} className="cursor-pointer hover:bg-grey-50">
            <Td>
              <Link href={`/students/${r.student.id}`} className="font-semibold text-grey-900 hover:text-brand">
                {r.student.name}
              </Link>
            </Td>
            <Td>{GRADE_LABEL[r.student.grade]}</Td>
            <Td className="text-grey-700">
              {r.classes.join(", ") || <span className="text-grey-400">다니는 강좌 없음</span>}
              {r.offGrade && (
                <span className="ml-1.5">
                  <Badge tone="brand">선행</Badge>
                </span>
              )}
            </Td>
            <Td className="tabular font-semibold">{r.attendance.rate === null ? "-" : `${r.attendance.rate}%`}</Td>
            <Td className="tabular text-grey-500">
              {r.attendance.present}·{r.attendance.late}·{r.attendance.absent}
            </Td>
            <Td>{r.attendance.needsMakeup ? <Badge tone="warning">신청 전 {r.attendance.absent - r.attendance.makeups}</Badge> : r.attendance.makeups ? <Badge tone="success">신청함</Badge> : "-"}</Td>
            <Td className="tabular">{r.unpaid ? <span className="font-semibold text-danger">{won(r.unpaid)}</span> : "-"}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
