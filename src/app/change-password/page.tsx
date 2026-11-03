"use client";
// 로그인한 직원이 스스로 비밀번호를 바꾸는 화면 (사이드바 내 정보 아래)
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, TextField } from "@/components/ui";
import { ApiError, changePassword, currentStaff } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const me = currentStaff();
    if (!me) router.replace("/login");
    else setName(me.name);
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return setError("새 비밀번호가 서로 달라요.");
    setBusy(true);
    setError("");
    try {
      await changePassword(cur, next);
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
        <h1 className="text-[24px] font-bold">새 비밀번호를 정해 주세요</h1>
        <p className="mt-2 text-[14px] text-grey-700">{name}님, 지금 비밀번호를 확인한 뒤 새 비밀번호로 바꿔요.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <TextField label="지금 비밀번호" type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
          <TextField label="새 비밀번호 (8자 이상)" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          <TextField label="새 비밀번호 확인" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={error || undefined} />
          <Button size="xl" className="mt-2 w-full" disabled={busy || !cur || !next || !confirm}>
            바꾸기
          </Button>
        </form>
      </div>
    </main>
  );
}
