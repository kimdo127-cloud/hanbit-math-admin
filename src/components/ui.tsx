"use client";
// 토스 DESIGN.md 컴포넌트 규격 (button, text-field, chip, badge, list-row, dialog, toast, bottom-sheet)
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { menuTrail } from "@/lib/menu";



type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
type BtnSize = "xl" | "l" | "m" | "s";

const btnSize: Record<BtnSize, string> = {
  xl: "h-14 rounded-xl text-[17px] font-bold",
  l: "h-12 rounded-[14px] text-[17px] font-bold",
  m: "h-10 rounded-m text-[15px] font-semibold px-4",
  s: "h-8 rounded-[10px] text-[13px] font-semibold px-3",
};
const btnVariant: Record<BtnVariant, string> = {
  primary: "bg-brand text-white",
  secondary: "bg-grey-100 text-grey-900",
  danger: "bg-danger text-white",
  ghost: "bg-transparent text-brand",
};

export function Button({
  variant = "primary",
  size = "l",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return (
    <button
      {...props}
      className={`${btnSize[size]} ${btnVariant[variant]} inline-flex items-center justify-center transition-[filter,opacity] duration-[120ms] active:brightness-75 disabled:opacity-30 ${className}`}
    />
  );
}

export function TextField({
  label,
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-2 block text-[13px] font-semibold text-grey-700">{label}</span>}
      <input
        {...props}
        className={`h-12 w-full rounded-m border bg-grey-100 px-4 text-[15px] outline-none transition-colors placeholder:text-grey-400 focus:border-[1.5px] focus:border-brand focus:bg-white ${
          error ? "border-[1.5px] border-danger" : "border-grey-200"
        }`}
      />
      {error && <span className="mt-1.5 block text-[13px] text-danger">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-2 block text-[13px] font-semibold text-grey-700">{label}</span>}
      <span className="relative block">
        <select
          {...props}
          className="h-12 w-full appearance-none rounded-m border border-grey-200 bg-grey-100 px-4 text-[15px] outline-none focus:border-[1.5px] focus:border-brand focus:bg-white pr-10"
        >
          {children}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-grey-500" aria-hidden />
      </span>
    </label>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-[34px] shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${
        active ? "bg-grey-900 text-white" : "border border-grey-200 bg-white text-grey-700"
      }`}
    >
      {children}
    </button>
  );
}

type Tone = "brand" | "danger" | "success" | "warning" | "grey";
const toneCls: Record<Tone, string> = {
  brand: "bg-brand-weak text-brand",
  danger: "bg-danger-weak text-danger",
  success: "bg-success-weak text-success",
  warning: "bg-warning-weak text-warning",
  grey: "bg-grey-100 text-grey-700",
};

export function Badge({ tone = "grey", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex h-[22px] items-center rounded-[6px] px-2 text-[12px] font-semibold ${toneCls[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[17px] font-bold">{children}</h2>
      {right}
    </div>
  );
}

export function TopBar({ title, left, right }: { title?: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 bg-white/95 px-5 backdrop-blur">
      {left}
      <h1 className="flex-1 text-[20px] font-bold">{title}</h1>
      {right}
    </header>
  );
}

export function MonthNav({ month, onChange }: { month: string; onChange: (diff: number) => void }) {
  const [y, m] = month.split("-");
  return (
    <div className="flex items-center gap-1">
      <button aria-label="이전 달" onClick={() => onChange(-1)} className="grid size-8 place-items-center rounded-full text-grey-700 active:bg-grey-100">
        <ChevronLeft size={20} />
      </button>
      <span className="tabular min-w-[86px] text-center text-[15px] font-semibold">
        {y}년 {Number(m)}월
      </span>
      <button aria-label="다음 달" onClick={() => onChange(1)} className="grid size-8 place-items-center rounded-full text-grey-700 active:bg-grey-100">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="animate-fade absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-sheet relative w-full max-w-[420px] rounded-t-2xl bg-white px-6 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <h3 className="mb-4 text-[20px] font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Dialog({
  open,
  title,
  body,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  danger,
}: {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  primary: string;
  secondary?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
      <div className="animate-fade absolute inset-0 bg-black/40" onClick={onSecondary} />
      <div className="animate-fade relative w-full max-w-[340px] rounded-2xl bg-white p-6 shadow-lg">
        <h3 className="text-[18px] font-bold">{title}</h3>
        {body && <div className="mt-2 text-[15px] leading-relaxed text-grey-700">{body}</div>}
        <div className="mt-6 flex gap-2">
          {secondary && (
            <Button variant="secondary" className="flex-1" onClick={onSecondary}>
              {secondary}
            </Button>
          )}
          <Button variant={danger ? "danger" : "primary"} className="flex-1" onClick={onPrimary}>
            {primary}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="animate-fade fixed inset-x-0 bottom-28 z-50 mx-auto w-fit max-w-[380px] rounded-[14px] bg-grey-900 px-5 py-3.5 text-[15px] font-medium text-white shadow-lg">
      {message}
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex justify-center gap-1.5 py-16">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2 animate-pulse rounded-full bg-grey-400" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </div>
  );
}

export function won(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export function fmtDate(d: string) {
  const dt = new Date(d + "T00:00");
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${"일월화수목금토"[dt.getDay()]})`;
}

export const WEEKDAY = "일월화수목금토";

/* ---------- 어드민(PC) 전용 ---------- */

export function PageHeader({ title, desc, right, crumbs }: { title: string; desc?: string; right?: React.ReactNode; crumbs?: { label: string; href?: string }[] }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <Crumbs items={crumbs} />
        <h1 className="text-[26px] font-bold">{title}</h1>
        {desc && <p className="mt-1 text-[14px] text-grey-500">{desc}</p>}
      </div>
      {right && <div className="shrink-0 whitespace-nowrap">{right}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 480 }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
      <div className="animate-fade absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="animate-fade relative max-h-[90dvh] w-full overflow-y-auto rounded-2xl bg-white p-7 shadow-lg" style={{ maxWidth: width }}>
        <h3 className="mb-5 text-[20px] font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="overflow-hidden rounded-3xl bg-white">
      <table className="w-full text-left text-[14px]">
        <thead>
          <tr className="border-b border-grey-200 text-[13px] text-grey-500">
            {head.map((h, i) => (
              <th key={i} className="px-5 py-3.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-100">{children}</tbody>
      </table>
      {!hasRows && <p className="py-12 text-center text-[14px] text-grey-500">{empty ?? "내용이 없어요."}</p>}
    </div>
  );
}

export function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 ${className}`}>{children}</td>;
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "danger" | "warning" | "brand" }) {
  const c = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : tone === "brand" ? "text-brand" : "";
  return (
    <div className="rounded-3xl bg-white p-5">
      <p className="text-[13px] text-grey-500">{label}</p>
      <p className={`tabular mt-1 text-[28px] font-bold ${c}`}>{value}</p>
    </div>
  );
}

/* ---------- 공통 화면 규칙 (어드민) ----------
 * 목록: PageHeader(제목 + 주요 버튼) → SearchInput + 필터 → Table
 * 상세: Crumbs(경로 + 뒤로) → 제목 → 탭, 기본은 보기 모드
 * 등록·수정: 편집 모드 → EditBar([취소][저장]) 하단 고정
 * 삭제·중단: 항상 Dialog 확인. 버튼 문구는 CRUD 동사(등록·수정·중단·취소)
 */

// 브레드크럼: 모든 화면 제목 위 같은 자리. 메뉴 묶음 › 메뉴 › (상세) › (수정·탭)
// items를 안 주면 주소로 메뉴 위치만 보여 준다. 마지막 항목은 현재 화면(굵게, 링크 없음)
export function Crumbs({ items = [] }: { items?: { label: string; href?: string }[] }) {
  const pathname = usePathname();
  const base = menuTrail(pathname);
  const all = [...base, ...items];
  return (
    <nav className="mb-3 flex items-center gap-1.5 text-[13px] text-grey-500" aria-label="현재 위치">
      {all.map((it, i) => {
        const last = i === all.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-grey-400">›</span>}
            {last ? (
              <span className="font-semibold text-grey-900" aria-current="page">
                {it.label}
              </span>
            ) : it.href ? (
              <Link href={it.href} className="hover:text-grey-900 hover:underline">
                {it.label}
              </Link>
            ) : (
              <span>{it.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-10 w-64 items-center gap-2 rounded-m border border-grey-200 bg-white px-3 focus-within:border-brand">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-grey-400" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-grey-400" />
      {value && (
        <button aria-label="검색어 지우기" onClick={() => onChange("")} className="text-[13px] text-grey-400">
          ✕
        </button>
      )}
    </label>
  );
}

// 편집 모드 하단 고정 바: 지금 편집 중이라는 걸 분명히 보여 준다
export function EditBar({ title, onCancel, onSave, saving, saveLabel = "저장" }: { title: string; onCancel: () => void; onSave: () => void; saving?: boolean; saveLabel?: string }) {
  return (
    <div className="fixed right-0 bottom-0 left-[232px] z-20 border-t border-grey-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-10 py-4">
        <p className="flex items-center gap-2 text-[14px] font-semibold">
          <span className="size-2 rounded-full bg-brand" /> {title}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="m" onClick={onCancel}>
            취소
          </Button>
          <Button size="m" disabled={saving} onClick={onSave}>
            {saving ? "저장 중…" : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// 오른쪽 상세 패널: 목록에서 줄을 누르면 열린다 (목록을 보면서 한 건을 보고·수정)
export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="animate-fade absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="animate-fade relative flex h-full w-[440px] flex-col bg-white shadow-xl" role="dialog" aria-modal>
        <div className="flex items-center justify-between border-b border-grey-100 px-7 py-5">
          <h3 className="text-[20px] font-bold">{title}</h3>
          <button aria-label="닫기" onClick={onClose} className="grid size-9 place-items-center rounded-full text-grey-500 hover:bg-grey-100">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>
        {footer && <div className="flex gap-2 border-t border-grey-100 px-7 py-4">{footer}</div>}
      </aside>
    </div>
  );
}
