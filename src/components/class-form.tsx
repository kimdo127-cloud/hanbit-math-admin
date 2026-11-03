"use client";
// 강좌 등록·수정 전용 화면 (편집 모드). 하단 EditBar로 [취소][저장]. 관리자만
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Crumbs, Dialog, EditBar, Loader, Select, TextField, Toast } from "@/components/ui";
import { ApiError, currentStaff, getClassDetail, GRADE_LABEL, listTeachers, saveClass, WEEKDAY, type ClassInput, type StaffPublic } from "@/lib/api";
import type { Grade } from "@/lib/types";

// 수업 시각은 30분 단위 24시간제 (오전·오후 혼동 방지)
const TIMES = Array.from({ length: 30 }, (_, i) => {
  const m = 8 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${m % 60 ? "30" : "00"}`;
});

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[220px_1fr] gap-8 rounded-3xl bg-white p-7">
      <div>
        <h2 className="text-[17px] font-bold">{title}</h2>
        {desc && <p className="mt-1 text-[13px] leading-relaxed text-grey-500">{desc}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const area = "w-full rounded-m border border-grey-200 bg-grey-100 px-4 py-3 text-[15px] leading-relaxed outline-none focus:border-brand focus:bg-white";

export function ClassForm({ id }: { id: number | null }) {
  const router = useRouter();
  const [teachers, setTeachers] = useState<StaffPublic[]>([]);
  const [form, setForm] = useState<ClassInput | null>(null);
  const [time, setTime] = useState({ start: "17:00", end: "19:00" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const isAdmin = currentStaff()?.role === "admin";

  useEffect(() => {
    listTeachers().then(async (ts) => {
      setTeachers(ts);
      if (id === null) {
        setForm({ name: "", target_grade: 7, teacher_id: ts[0]?.id ?? 0, capacity: 8, monthly_fee: 280000, level: "", description: "", textbook: "", schedules: [], plan: [] });
        return;
      }
      const d = await getClassDetail(id);
      const c = d.cls;
      setForm({
        name: c.name,
        target_grade: c.target_grade,
        teacher_id: c.teacher_id,
        capacity: c.capacity,
        monthly_fee: c.monthly_fee,
        level: c.level,
        description: c.description,
        textbook: c.textbook,
        schedules: c.schedules,
        plan: d.plan.map((p) => p.topic ?? ""),
      });
      setTime({ start: c.schedules[0]?.start_time ?? "17:00", end: c.schedules[0]?.end_time ?? "19:00" });
    });
  }, [id]);

  if (!isAdmin) return <p className="py-24 text-center text-[15px] text-grey-500">강좌 등록·수정은 관리자만 할 수 있어요.</p>;
  if (!form) return <Loader />;
  const back = id === null ? "/classes" : `/classes/${id}`;

  const toggleDay = (wd: number) => {
    const has = form.schedules.some((s) => s.weekday === wd);
    setForm({ ...form, schedules: has ? form.schedules.filter((s) => s.weekday !== wd) : [...form.schedules, { weekday: wd, start_time: time.start, end_time: time.end }] });
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveClass(id, { ...form, schedules: form.schedules.map((s) => ({ weekday: s.weekday, start_time: time.start, end_time: time.end })) });
      setToast(id === null ? "강좌를 등록했어요" : "강좌를 수정했어요");
      setTimeout(() => router.push(id === null ? "/classes" : `/classes/${id}`), 600);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Crumbs items={[...(id !== null ? [{ label: form.name, href: `/classes/${id}` }] : []), { label: id === null ? "강좌 등록" : "수정" }]} />
      <h1 className="mb-6 text-[26px] font-bold">{id === null ? "강좌 등록" : `${form.name} 수정`}</h1>

      <div className="space-y-4">
        <Section title="기본 정보" desc="강좌 이름은 '학년 + 과정·목적'으로 지어요. 예: 중2 내신 대비">
          <TextField label="강좌 이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="중2 내신 대비" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="대상 학년" value={form.target_grade} onChange={(e) => setForm({ ...form, target_grade: Number(e.target.value) as Grade })}>
              {(Object.keys(GRADE_LABEL) as unknown as Grade[]).map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABEL[g]}
                </option>
              ))}
            </Select>
            <Select label="담당 강사" value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: Number(e.target.value) })}>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="정원 (명)" inputMode="numeric" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value.replace(/[^0-9]/g, "")) })} />
            <TextField
              label="월 수강료 (원)"
              inputMode="numeric"
              value={form.monthly_fee.toLocaleString()}
              onChange={(e) => setForm({ ...form, monthly_fee: Number(e.target.value.replace(/[^0-9]/g, "")) })}
            />
          </div>
        </Section>

        <Section title="시간표" desc="같은 강사가 시간이 겹치는 두 강좌를 맡을 수 없어요. 바꾸면 앞으로의 수업일이 다시 만들어져요.">
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-grey-700">요일</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                const on = form.schedules.some((s) => s.weekday === wd);
                return (
                  <button
                    key={wd}
                    onClick={() => toggleDay(wd)}
                    aria-pressed={on}
                    className={`size-10 rounded-full text-[14px] font-semibold ${on ? "bg-grey-900 text-white" : "border border-grey-200 text-grey-700"}`}
                  >
                    {WEEKDAY[wd]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="시작" value={time.start} onChange={(e) => setTime({ ...time, start: e.target.value })}>
              {TIMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <Select label="끝" value={time.end} onChange={(e) => setTime({ ...time, end: e.target.value })}>
              {TIMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
        </Section>

        <Section title="강좌 소개" desc="고객 앱 '수강 신청 › 강좌 상세'에 그대로 보여요.">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="수준" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="기본 · 심화 · 내신 대비" />
            <TextField label="교재" value={form.textbook} onChange={(e) => setForm({ ...form, textbook: e.target.value })} placeholder="개념원리 중학 수학 2-2" />
          </div>
          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold text-grey-700">강좌 소개</span>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="어떤 학생에게 맞는 강좌인지, 수업을 어떻게 하는지 2~3문장" className={area} />
          </label>
        </Section>

        <Section title="진도 계획" desc="한 줄에 1회차씩 적으면 앞으로의 수업일에 순서대로 들어가요. 고객 앱 홈·캘린더·강좌 상세와 출결 확인 화면에 보여요.">
          <textarea rows={10} value={form.plan.join("\n")} onChange={(e) => setForm({ ...form, plan: e.target.value.split("\n") })} placeholder={"일차함수와 그래프\n일차함수의 기울기\n..."} className={area} />
          <p className="text-[12px] text-grey-500">{form.plan.filter((p) => p.trim()).length}회차 입력됨</p>
        </Section>
      </div>

      <EditBar title={id === null ? "강좌 등록 중" : "강좌 수정 중"} onCancel={() => router.push(back)} onSave={save} saving={saving} saveLabel={id === null ? "등록" : "저장"} />
      <Dialog open={!!error} title="저장할 수 없어요" body={error} primary="확인" onPrimary={() => setError(null)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
