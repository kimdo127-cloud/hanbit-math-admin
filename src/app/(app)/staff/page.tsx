"use client";
// 직원 계정 (관리자만). 어드민 멤버 관리 표준: 목록 줄을 누르면 오른쪽 상세 패널
// 패널: 보기 모드 → [수정] 편집 모드(하단 취소·저장) / 계정 관리(비밀번호 재설정, 사용 중지)는 아래 따로
import { ChevronRight, Mail, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Dialog, Drawer, Loader, PageHeader, SearchInput, Select, Table, Td, TextField, Toast } from "@/components/ui";
import { ApiError, createStaff, currentStaff, listStaff, ROLE_LABEL, sendStaffLink, setStaffActive, updateStaff, type StaffInput, type StaffPublic } from "@/lib/api";

const emptyForm: StaffInput = { email: "", name: "", role: "member", position: "강사", subject: "" };
const ROLE_DESC: Record<StaffInput["role"], string> = {
  admin: "모든 메뉴. 강좌 등록·수정과 직원 계정 관리까지 할 수 있어요.",
  manager: "출결·보강·학생·수납·환불까지. 강좌 설정과 직원 계정은 못 바꿔요.",
  member: "담당 강좌의 출결 확인·수정과 강좌 보기만 할 수 있어요.",
};

function RoleBadge({ role }: { role: StaffInput["role"] }) {
  return role === "admin" ? <Badge tone="brand">관리자</Badge> : role === "manager" ? <Badge tone="success">매니저</Badge> : <Badge>멤버</Badge>;
}
function StatusBadge({ s }: { s: StaffPublic }) {
  return !s.is_active ? <Badge>사용 중지</Badge> : s.invited ? <Badge tone="warning">초대 수락 전</Badge> : <Badge tone="success">사용 중</Badge>;
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex border-b border-grey-100 py-3.5 text-[15px] last:border-0">
      <span className="w-24 shrink-0 text-grey-500">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}

type Row = StaffPublic & { lastLink?: Awaited<ReturnType<typeof listStaff>>[number]["lastLink"] };

export default function StaffPage() {
  const me = currentStaff();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Row | "new" | null>(null); // 패널에 보이는 직원
  const [form, setForm] = useState<StaffInput | null>(null); // 편집 모드일 때만
  const [sent, setSent] = useState<{ staffId: number; text: string } | null>(null); // 방금 보낸 메일 안내
  const [confirm, setConfirm] = useState<{ title: string; body: string; label: string; danger?: boolean; run: () => Promise<void> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    listStaff()
      .then((r) => {
        setRows(r);
        setOpen((o) => (o && o !== "new" ? r.find((x) => x.id === o.id) ?? null : o));
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "잠시 후 다시 시도해 주세요.");
    }
  };

  const close = () => {
    setOpen(null);
    setForm(null);
  };

  const save = () =>
    run(async () => {
      if (!form) return;
      if (open === "new") {
        const r = await createStaff(form);
        setForm(null);
        setOpen({ ...form, id: r.id, email: form.email.trim().toLowerCase(), subject: form.subject || null, is_active: true, invited: true });
        setSent({ staffId: r.id, text: `${form.email.trim()}로 초대 메일을 보냈어요. 링크에서 본인이 비밀번호를 정하면 로그인할 수 있어요.` });
      } else if (open) {
        await updateStaff(open.id, form);
        setForm(null);
        setToast("직원 정보를 수정했어요");
      }
    });

  if (me?.role !== "admin") return <p className="py-20 text-center text-[15px] text-grey-500">관리자만 볼 수 있어요.</p>;
  if (!rows) return <Loader />;
  const k = q.trim();
  const shown = rows.filter((s) => !k || s.name.includes(k) || s.email.includes(k) || s.position.includes(k));
  const cur = open && open !== "new" ? open : null;

  return (
    <>
      <PageHeader
        title="직원 계정"
        desc="직원은 회원가입이 없어요. 관리자가 등록하면 초대 메일이 가고, 직원이 링크에서 직접 비밀번호를 정해요. 관리자는 비밀번호를 볼 수 없어요."
        right={
          <Button
            size="m"
            className="gap-1"
            onClick={() => {
              setOpen("new");
              setForm({ ...emptyForm });
            }}
          >
            <Plus size={16} /> 직원 등록
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput value={q} onChange={setQ} placeholder="이름·이메일·직책 검색" />
      </div>
      <Table head={["이름", "이메일", "직책", "권한 등급", "상태", ""]} empty="찾는 직원이 없어요.">
        {shown.map((s) => (
          <tr
            key={s.id}
            onClick={() => {
              setOpen(s);
              setForm(null);
            }}
            className={`cursor-pointer hover:bg-grey-50 ${s.is_active ? "" : "text-grey-400"}`}
          >
            <Td className="font-semibold">
              {s.name} {s.id === me.id && <span className="text-[12px] text-brand">나</span>}
            </Td>
            <Td className="text-grey-700">{s.email}</Td>
            <Td>
              {s.position}
              {s.subject && <span className="text-grey-500"> · {s.subject}</span>}
            </Td>
            <Td>
              <RoleBadge role={s.role} />
            </Td>
            <Td>
              <StatusBadge s={s} />
            </Td>
            <Td className="w-10 text-right">
              <ChevronRight size={18} className="text-grey-400" />
            </Td>
          </tr>
        ))}
      </Table>

      <Drawer
        open={!!open}
        onClose={close}
        title={open === "new" ? "직원 등록" : form ? "직원 정보 수정" : cur?.name}
        footer={
          form ? (
            <>
              <Button variant="secondary" className="flex-1" onClick={() => (open === "new" ? close() : setForm(null))}>
                취소
              </Button>
              <Button className="flex-1" disabled={!form.name.trim() || !form.email.trim()} onClick={save}>
                {open === "new" ? "등록" : "저장"}
              </Button>
            </>
          ) : undefined
        }
      >
        {form ? (
          <div className="space-y-4">
            <TextField label="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="이메일 (로그인 아이디)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select label="직책" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value as StaffInput["position"] })}>
              {["원장", "강사", "실장"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
            {form.position === "강사" && <TextField label="담당 과목" value={form.subject ?? ""} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="중등 수학" />}
            <Select label="권한 등급" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffInput["role"] })}>
              <option value="member">멤버</option>
              <option value="manager">매니저</option>
              <option value="admin">관리자</option>
            </Select>
            <p className="rounded-m bg-grey-50 px-4 py-3 text-[13px] leading-relaxed text-grey-700">
              <b>{ROLE_LABEL[form.role]}</b> · {ROLE_DESC[form.role]}
            </p>
            {open === "new" && <p className="text-[12px] text-grey-500">등록하면 이 이메일로 초대 메일이 가요. 직원이 링크에서 직접 비밀번호를 정해요 (24시간 유효).</p>}
          </div>
        ) : (
          cur && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-bold text-grey-500">기본 정보</p>
                <Button variant="secondary" size="s" onClick={() => setForm({ email: cur.email, name: cur.name, role: cur.role, position: cur.position, subject: cur.subject ?? "" })}>
                  수정
                </Button>
              </div>
              <Row k="이름" v={cur.name} />
              <Row k="이메일" v={cur.email} />
              <Row k="직책" v={`${cur.position}${cur.subject ? ` · ${cur.subject}` : ""}`} />
              <Row k="권한 등급" v={<RoleBadge role={cur.role} />} />
              <p className="mt-2 text-[13px] text-grey-500">{ROLE_DESC[cur.role]}</p>
              <Row k="상태" v={<StatusBadge s={cur} />} />

              {sent?.staffId === cur.id && (
                <p className="mt-6 flex gap-2 rounded-xl bg-brand-weak px-4 py-3 text-[14px] text-grey-900">
                  <Mail size={18} className="mt-0.5 shrink-0 text-brand" /> {sent.text}
                </p>
              )}
              {(() => {
                const l = cur.lastLink;
                if (!l) return null;
                const when = (t: string) => `${Number(t.slice(5, 7))}/${Number(t.slice(8, 10))} ${t.slice(11, 16)}`;
                return (
                  <div className="mt-4 rounded-xl border border-grey-200 px-4 py-3 text-[13px]">
                    <p className="font-semibold">
                      최근 보낸 링크 · {l.purpose === "invite" ? "초대" : "비밀번호 재설정"}{" "}
                      <span className={l.state === "pending" ? "text-brand" : "text-grey-500"}>{l.state === "pending" ? "· 사용 전" : l.state === "used" ? "· 사용함/무효" : "· 만료"}</span>
                    </p>
                    <p className="mt-0.5 text-grey-500">
                      {when(l.created)} 보냄 · {when(l.expires)}까지 유효
                    </p>
                    {l.state === "pending" && (
                      <a href={l.link} target="_blank" className="mt-2 inline-block text-[12px] text-grey-500 underline">
                        시연: 직원이 받은 메일의 링크 열기 ↗
                      </a>
                    )}
                  </div>
                );
              })()}

              <p className="mt-8 mb-3 text-[13px] font-bold text-grey-500">계정 관리</p>
              <div className="space-y-2">
                <button
                  onClick={() =>
                    setConfirm({
                      title: cur.invited ? `${cur.name}님께 초대 메일을 다시 보낼까요?` : `${cur.name}님께 비밀번호 재설정 메일을 보낼까요?`,
                      body: `${cur.email}로 링크를 보내요. 링크는 24시간 동안 한 번만 쓸 수 있고, 이전에 보낸 링크는 더 쓸 수 없어요.`,
                      label: "보내기",
                      run: async () => {
                        const r = await sendStaffLink(cur.id);
                        setSent({ staffId: cur.id, text: `${r.email}로 ${r.purpose === "invite" ? "초대" : "비밀번호 재설정"} 메일을 보냈어요.` });
                      },
                    })
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-grey-200 px-4 py-3.5 text-left hover:bg-grey-50"
                >
                  <span>
                    <span className="block text-[15px] font-semibold">{cur.invited ? "초대 메일 다시 보내기" : "비밀번호 재설정 메일 보내기"}</span>
                    <span className="block text-[12px] text-grey-500">
                      {cur.invited ? "초대 링크가 만료됐거나 메일을 못 받았을 때" : "비밀번호를 잊었을 때. 관리자는 비밀번호를 볼 수 없어요"}
                    </span>
                  </span>
                  <ChevronRight size={18} className="text-grey-400" />
                </button>
                {cur.id !== me.id && (
                  <button
                    onClick={() =>
                      cur.is_active
                        ? setConfirm({
                            title: `${cur.name}님 계정을 사용 중지할까요?`,
                            body: "로그인할 수 없게 돼요. 출결·수납 등 기록은 그대로 남아요.",
                            label: "사용 중지",
                            danger: true,
                            run: async () => {
                              await setStaffActive(cur.id, false);
                              setToast("계정을 사용 중지했어요");
                            },
                          })
                        : run(async () => {
                            await setStaffActive(cur.id, true);
                            setToast("계정을 다시 사용해요");
                          })
                    }
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left ${cur.is_active ? "border-danger-weak hover:bg-danger-weak/50" : "border-grey-200 hover:bg-grey-50"}`}
                  >
                    <span>
                      <span className={`block text-[15px] font-semibold ${cur.is_active ? "text-danger" : ""}`}>{cur.is_active ? "계정 사용 중지" : "계정 다시 사용"}</span>
                      <span className="block text-[12px] text-grey-500">{cur.is_active ? "퇴사·휴직 때. 맡은 강좌가 있으면 먼저 강사를 바꿔야 해요" : "다시 로그인할 수 있게 해요"}</span>
                    </span>
                    <ChevronRight size={18} className="text-grey-400" />
                  </button>
                )}
                {cur.id === me.id && <p className="text-[12px] text-grey-500">내 계정은 사용 중지할 수 없어요.</p>}
              </div>
            </>
          )
        )}
      </Drawer>


      <Dialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        body={confirm?.body}
        primary={confirm?.label ?? "확인"}
        secondary="취소"
        danger={confirm?.danger}
        onSecondary={() => setConfirm(null)}
        onPrimary={() => {
          const c = confirm;
          setConfirm(null);
          if (c) run(c.run);
        }}
      />
      <Dialog open={!!error} title="처리할 수 없어요" body={error} primary="확인" onPrimary={() => setError(null)} />
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
