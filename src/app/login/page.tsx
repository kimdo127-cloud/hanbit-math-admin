"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, TextField } from "@/components/ui";
import { ApiError, currentStaff, login, requestReset } from "@/lib/api";

// 테스트용 빠른 로그인 (배포 전 제거). 권한 등급(관리자·매니저·멤버) 차이를 바로 확인하려고 셋을 둔다
const TEST_ACCOUNTS = [
  { label: "관리자", role: "정원장 · 원장", email: "admin@hanbit.kr", password: "admin1234" },
  { label: "매니저", role: "한실장 · 실장", email: "office@hanbit.kr", password: "staff1234" },
  { label: "멤버", role: "박선생 · 강사", email: "park@hanbit.kr", password: "staff1234" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState<null | { email: string; sent: boolean; demoLink: string | null }>(null);

  useEffect(() => {
    if (currentStaff()) router.replace("/");
  }, [router]);

  const quickLogin = async (id: string, pw: string) => {
    setEmail(id);
    setPassword(pw);
    setBusy(true);
    setError("");
    try {
      await login(id, pw);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-[400px] rounded-3xl bg-white p-10">
        <p className="text-[15px] font-semibold text-brand">한빛수학 운영</p>
        <h1 className="mt-2 text-[24px] font-bold">직원 로그인</h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <TextField label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={error || undefined} />
          <Button size="xl" className="mt-2 w-full" disabled={busy || !email || !password}>
            {busy ? "확인 중…" : "로그인"}
          </Button>
        </form>
        <div className="mt-5 flex items-center justify-between text-[13px]">
          <span className="text-grey-400">계정은 관리자가 만들어요</span>
          <button type="button" onClick={() => setForgot({ email, sent: false, demoLink: null })} className="font-semibold text-grey-700 underline">
            비밀번호를 잊었어요
          </button>
        </div>
        {forgot && (
          <div className="mt-4 rounded-2xl bg-grey-50 p-5">
            {forgot.sent ? (
              <>
                <p className="text-[14px] text-grey-700">가입된 이메일이면 비밀번호 재설정 링크를 보냈어요. 메일함을 확인해 주세요. (24시간 유효)</p>
                {forgot.demoLink && (
                  <a href={forgot.demoLink} className="mt-2 inline-block text-[12px] text-grey-500 underline">
                    시연: 받은 메일의 링크 열기
                  </a>
                )}
              </>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await requestReset(forgot.email);
                  setForgot({ ...forgot, sent: true, demoLink: r.demoLink });
                }}
                className="space-y-3"
              >
                <TextField label="가입한 이메일" type="email" value={forgot.email} onChange={(e) => setForgot({ ...forgot, email: e.target.value })} />
                <Button size="m" className="w-full" disabled={!forgot.email}>
                  재설정 링크 받기
                </Button>
              </form>
            )}
          </div>
        )}

        <div className="mt-8 border-t border-grey-200 pt-6">
          <p className="mb-3 text-[12px] font-semibold text-grey-500">테스트 계정으로 로그인</p>
          <div className="grid grid-cols-3 gap-2">
            {TEST_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                disabled={busy}
                onClick={() => quickLogin(a.email, a.password)}
                className="rounded-xl border border-grey-200 px-2 py-3 text-center hover:bg-grey-50 disabled:opacity-40"
              >
                <span className="block text-[14px] font-semibold">{a.label}</span>
                <span className="mt-0.5 block text-[11px] text-grey-500">{a.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
