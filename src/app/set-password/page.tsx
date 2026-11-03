"use client";
// 초대·재설정 메일의 링크로 들어오는 화면. 직원이 직접 비밀번호를 정한다 (로그인 필요 없음)
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button, Loader, TextField } from "@/components/ui";
import { ApiError, checkToken, setPasswordWithToken } from "@/lib/api";

type Info = Awaited<ReturnType<typeof checkToken>>;

function Inner() {
  const token = useSearchParams().get("token") ?? "";
  const [info, setInfo] = useState<Info | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkToken(token).then(setInfo);
  }, [token]);

  if (!info) return <Loader />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setError("두 비밀번호가 서로 달라요.");
    setBusy(true);
    setError("");
    try {
      await setPasswordWithToken(token, pw);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const invite = info.state !== "invalid" && info.purpose === "invite";

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-10">
        <p className="text-[15px] font-semibold text-brand">한빛수학 운영</p>
        {info.state !== "ok" ? (
          <>
            <h1 className="mt-2 text-[24px] font-bold">{info.state === "expired" ? "링크가 만료됐어요" : info.state === "used" ? "이미 쓴 링크예요" : "올바르지 않은 링크예요"}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-grey-700">링크는 24시간 동안 한 번만 쓸 수 있어요. 관리자에게 새 링크를 보내 달라고 요청해 주세요.</p>
            <Link href="/login" className="mt-8 block text-center text-[15px] font-semibold text-brand">
              로그인 화면으로
            </Link>
          </>
        ) : done ? (
          <>
            <h1 className="mt-2 text-[24px] font-bold">비밀번호를 정했어요</h1>
            <p className="mt-3 text-[15px] text-grey-700">{info.email}과 새 비밀번호로 로그인해 주세요.</p>
            <Link href="/login" className="mt-8 flex h-14 items-center justify-center rounded-xl bg-brand text-[17px] font-bold text-white">
              로그인하기
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-[24px] font-bold">{invite ? `${info.name}님, 환영해요` : "비밀번호 재설정"}</h1>
            <p className="mt-2 text-[14px] text-grey-500">
              {info.email} · {invite ? "사용할 비밀번호를 정해 주세요" : "새 비밀번호를 정해 주세요"}
            </p>
            <form onSubmit={submit} className="mt-8 space-y-4">
              <TextField label="비밀번호 (8자 이상)" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <TextField label="비밀번호 확인" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} error={error || undefined} />
              <Button size="xl" className="mt-2 w-full" disabled={busy || pw.length < 8 || !pw2}>
                {busy ? "저장 중…" : "비밀번호 정하기"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<Loader />}>
      <Inner />
    </Suspense>
  );
}
