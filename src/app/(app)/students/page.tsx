"use client";
// 학생: 목록 + 학생 등록 (상담 후 학원이 등록. 보호자 번호가 학부모 앱 가입의 열쇠)
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Chip, Loader, Modal, PageHeader, SearchInput, Select, Table, Td, TextField, Toast, won } from "@/components/ui";
import { ApiError, createStudent, GRADE_LABEL, listStudents, type StudentRow } from "@/lib/api";
import type { Grade } from "@/lib/types";
import { inviteMessage } from "@/lib/invite-text";

const RELATIONS = ["엄마", "아빠", "할머니", "할아버지", "보호자"];
const emptyForm = () => ({ name: "", grade: 7 as Grade, school: "", birth_date: "", guardians: [{ relation: "엄마", phone: "" }] });

export default function StudentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "makeup" | "unpaid" | "new" | "ended">("all");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [invite, setInvite] = useState<string | null>(null); // 등록 후 학부모에게 보낼 가입 안내 문자

  const load = useCallback(() => {
    listStudents().then(setRows);
  }, []);
  useEffect(load, [load]);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await createStudent(form);
      setOpen(false);
      load();
      // 이미 앱에 가입한 가족(형제)이면 앱에 자동으로 보이므로 초대 없이 알림만
      if (!r.invite) setToast(`${form.name} 학생을 등록했어요 (${r.sibling} 학생과 같은 가족이라 앱에 바로 보여요)`);
      else setInvite(inviteMessage(form.name, r.invite)); // 가입 전 가족: 대표 번호로 초대 발급 (이전 초대는 무효)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  const setG = (i: number, patch: Partial<{ relation: string; phone: string }>) =>
    setForm((f) => ({ ...f, guardians: f.guardians.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));
  if (!rows) return <Loader />;

  const shown = rows.filter(
    (r) =>
      (r.student.name.includes(q.trim()) || r.classes.some((c) => c.includes(q.trim()))) &&
      (only === "all" ? r.active : only === "new" ? !r.enrolledBefore : only === "ended" ? !r.active && r.enrolledBefore : (only === "makeup" && r.attendance.needsMakeup) || (only === "unpaid" && r.unpaid > 0)),
  );

  return (
    <>
      <PageHeader
        title="학생"
        desc="이번 달 출석률은 지각 3번을 결석 1번으로 계산해요. 출석·지각·결석은 이번 달 횟수예요."
        right={
          <Button
            size="m"
            className="gap-1"
            onClick={() => {
              setForm(emptyForm());
              setError("");
              setOpen(true);
            }}
          >
            <Plus size={16} /> 학생 등록
          </Button>
        }
      />
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
        <Chip active={only === "new"} onClick={() => setOnly("new")}>
          수강 전 {rows.filter((r) => !r.enrolledBefore).length}
        </Chip>
        <Chip active={only === "ended"} onClick={() => setOnly("ended")}>
          수강 중단 {rows.filter((r) => !r.active && r.enrolledBefore).length}
        </Chip>
      </div>
      <Table head={["이름", "학년", "레벨", "다니는 강좌", "이번 달 출석률", "출석·지각·결석", "보강", "미납"]} empty="찾는 학생이 없어요.">
        {shown.map((r) => (
          <tr key={r.student.id} onClick={() => { router.push(`/students/${r.student.id}`); }} className="cursor-pointer hover:bg-grey-50">
            <Td>
              <Link href={`/students/${r.student.id}`} className="font-semibold text-grey-900 hover:text-brand">
                {r.student.name}
              </Link>
            </Td>
            <Td>{GRADE_LABEL[r.student.grade]}</Td>
            <Td className="text-grey-700">{r.level ?? "-"}</Td>
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

      <Modal open={open} onClose={() => setOpen(false)} title="학생 등록" width={520}>
        <p className="mb-4 text-[13px] text-grey-500">상담 후 등록해요. 보호자가 아래 번호로 학부모 앱에 가입하면 자녀가 자동으로 연결돼요. 이미 등록된 보호자 번호면 형제로 묶여요.</p>
        <div className="space-y-3">
          <div className="flex gap-2">
            <TextField label="이름" className="flex-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="학년" className="w-28" value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) as Grade })}>
              {(Object.keys(GRADE_LABEL) as unknown as Grade[]).map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABEL[g]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <TextField label="학교" className="flex-1" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
            <TextField label="생년월일" type="date" className="w-44" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
          </div>
          <p className="pt-2 text-[13px] font-semibold text-grey-700">
            보호자 연락처 <span className="font-normal text-grey-500">· 첫 번호가 대표 번호(초대 문자를 받는 번호). 형제가 이미 등록돼 있으면 같은 가족으로 묶여요</span>
          </p>
          {form.guardians.map((g, i) => (
            <div key={i} className="flex items-end gap-2">
              <Select className="w-28" value={g.relation} onChange={(e) => setG(i, { relation: e.target.value })}>
                {RELATIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
              <TextField className="flex-1" inputMode="tel" placeholder="010-0000-0000" value={g.phone} onChange={(e) => setG(i, { phone: e.target.value })} />
              {form.guardians.length > 1 && (
                <button aria-label="연락처 삭제" onClick={() => setForm({ ...form, guardians: form.guardians.filter((_, j) => j !== i) })} className="grid size-12 place-items-center text-grey-400">
                  <X size={18} />
                </button>
              )}
            </div>
          ))}
          {form.guardians.length < 3 && (
            <button onClick={() => setForm({ ...form, guardians: [...form.guardians, { relation: "아빠", phone: "" }] })} className="flex items-center gap-1 text-[14px] font-semibold text-brand">
              <Plus size={16} /> 연락처 추가
            </button>
          )}
          {error && <p className="text-[13px] text-danger">{error}</p>}
        </div>
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button className="flex-1" disabled={busy || !form.name.trim() || !form.school.trim() || !form.birth_date || !form.guardians[0].phone.trim()} onClick={save}>
            {busy ? "등록 중…" : "등록"}
          </Button>
        </div>
      </Modal>
      <Modal open={!!invite} onClose={() => setInvite(null)} title="학부모 초대 문자" width={480}>
        <p className="mb-3 text-[13px] text-grey-500">
          대표 번호로 문자를 보내 주세요. 링크는 3일 동안 한 번만 쓸 수 있고, 다시 보내면 이전 링크는 쓸 수 없어요. 이 창을 닫으면 링크를 다시 볼 수 없으니, 필요하면 학생 상세에서 다시 보내 주세요.
        </p>
        <pre className="whitespace-pre-wrap rounded-xl bg-grey-100 px-4 py-3 font-sans text-[14px] leading-relaxed text-grey-900">{invite}</pre>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setInvite(null)}>
            닫기
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              navigator.clipboard?.writeText(invite ?? "").then(
                () => (setInvite(null), setToast("초대 문자를 복사했어요")),
                () => setToast("복사하지 못했어요. 글자를 직접 선택해 주세요"),
              );
            }}
          >
            문자 복사
          </Button>
        </div>
      </Modal>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
