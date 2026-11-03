"use client";
// 등원 키오스크: 학원 입구 태블릿. 학생이 보호자 번호 뒷자리 4자리 → 이름 → 등원
// 등원 시각 자동 기록, 강좌 시작보다 늦으면 지각. 보호자에게 등원 알림 (사례: 세이프 출석기·체키 등하원 알림)
import { CheckCircle2, Delete } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, currentStaff, GRADE_LABEL, kioskCheckIn, kioskLookup, type KioskCandidate } from "@/lib/api";

type Done = Awaited<ReturnType<typeof kioskCheckIn>>;

export default function KioskPage() {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [now, setNow] = useState("");
  const [pin, setPin] = useState("");
  const [list, setList] = useState<KioskCandidate[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!currentStaff()) router.replace("/login");
    else setOk(true);
    const tick = () => setNow(new Date().toTimeString().slice(0, 5));
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, [router]);

  const reset = () => {
    setPin("");
    setList(null);
    setMsg(null);
    setDone(null);
  };

  // 완료 화면은 4초 뒤 처음으로
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(reset, 4000);
    return () => clearTimeout(t);
  }, [done]);

  const press = async (d: string) => {
    if (busy || list || done) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setMsg(null);
    if (next.length === 4) {
      setBusy(true);
      try {
        const r = await kioskLookup(next);
        if (r.length === 0) {
          setMsg("오늘 수업이 있는 학생을 찾지 못했어요. 번호를 다시 확인해 주세요.");
          setPin("");
        } else setList(r);
      } catch (e) {
        setMsg(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
        setPin("");
      } finally {
        setBusy(false);
      }
    }
  };

  const check = async (c: KioskCandidate) => {
    setBusy(true);
    try {
      setDone(await kioskCheckIn(c.studentId, c.sessionId));
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (!ok) return null;

  return (
    <main className="grid min-h-dvh grid-cols-2 bg-grey-100">
      <section className="flex flex-col justify-between bg-grey-900 p-14 text-white">
        <div>
          <p className="text-[20px] font-bold">
            한빛수학 <span className="text-brand">등원 체크</span>
          </p>
          <p className="tabular mt-10 text-[88px] leading-none font-bold">{now}</p>
          <p className="mt-6 text-[22px] leading-relaxed text-white/80">
            보호자 휴대폰 번호
            <br />
            <b className="text-white">뒷자리 4자리</b>를 눌러 주세요
          </p>
        </div>
        <p className="text-[14px] text-white/50">등원하면 보호자에게 바로 알림이 가요. 수업 시작 뒤에 누르면 지각으로 기록돼요.</p>
      </section>

      <section className="flex flex-col items-center justify-center p-14">
        {done ? (
          <div className="text-center">
            <CheckCircle2 size={96} className={`mx-auto ${done.status === "late" ? "text-warning" : "text-success"}`} />
            <p className="mt-6 text-[40px] font-bold">{done.name}</p>
            <p className="tabular mt-2 text-[24px]">
              {done.time} 등원 · {done.status === "late" ? <span className="font-bold text-warning">{done.late}분 지각</span> : <span className="font-bold text-success">출석</span>}
            </p>
            <p className="mt-1 text-[18px] text-grey-500">{done.className}</p>
            <p className="mt-8 rounded-xl bg-white px-6 py-4 text-[16px] text-grey-700">보호자에게 등원 알림을 보냈어요</p>
            <button onClick={reset} className="mt-6 text-[16px] text-grey-500 underline">
              처음으로
            </button>
          </div>
        ) : list ? (
          <div className="w-full max-w-[460px]">
            <p className="mb-5 text-center text-[24px] font-bold">이름을 눌러 주세요</p>
            <div className="space-y-3">
              {list.map((c) => (
                <button
                  key={`${c.studentId}-${c.sessionId}`}
                  disabled={!!c.checkedAt || busy}
                  onClick={() => check(c)}
                  className="flex w-full items-center justify-between rounded-2xl bg-white px-7 py-6 text-left shadow-sm active:bg-grey-50 disabled:opacity-50"
                >
                  <span>
                    <span className="block text-[28px] font-bold">{c.name}</span>
                    <span className="tabular block text-[16px] text-grey-500">
                      {GRADE_LABEL[c.grade]} · {c.className} {c.start}
                      {c.makeup && " · 보강"}
                    </span>
                  </span>
                  <span className="text-[18px] font-semibold text-brand">{c.checkedAt ? `${c.checkedAt} 등원함` : "등원"}</span>
                </button>
              ))}
            </div>
            {msg && <p className="mt-4 text-center text-[16px] text-danger">{msg}</p>}
            <button onClick={reset} className="mt-8 w-full py-3 text-[18px] text-grey-500">
              번호 다시 누르기
            </button>
          </div>
        ) : (
          <div className="w-full max-w-[400px]">
            <div className="mb-8 flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`tabular grid size-16 place-items-center rounded-2xl text-[32px] font-bold ${pin[i] ? "bg-grey-900 text-white" : "bg-white text-grey-400"}`}>
                  {pin[i] ?? ""}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button key={d} onClick={() => press(d)} className="h-20 rounded-2xl bg-white text-[32px] font-semibold shadow-sm active:bg-grey-200">
                  {d}
                </button>
              ))}
              <button onClick={reset} className="h-20 rounded-2xl text-[18px] text-grey-500 active:bg-grey-200">
                지우기
              </button>
              <button onClick={() => press("0")} className="h-20 rounded-2xl bg-white text-[32px] font-semibold shadow-sm active:bg-grey-200">
                0
              </button>
              <button aria-label="한 칸 지우기" onClick={() => setPin(pin.slice(0, -1))} className="grid h-20 place-items-center rounded-2xl text-grey-500 active:bg-grey-200">
                <Delete size={30} />
              </button>
            </div>
            <p className="mt-6 min-h-6 text-center text-[16px] text-danger">{msg}</p>
          </div>
        )}
      </section>
    </main>
  );
}
