// 목업 DB 저장소 (브라우저 localStorage). 백엔드를 붙이면 이 파일은 사라진다.
// 주의: 코어 웹과 주소(포트)가 달라 목업 단계에서는 데이터가 공유되지 않는다.
import { createSeed } from "./seed";
import type { DB } from "./types";

const KEY = "hanbit-admin-mock-db-v8";
const SESSION_KEY = "hanbit-admin-session";

let cache: DB | null = null;

export function loadDB(): DB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw) as DB;
      return cache;
    }
  } catch {}
  cache = createSeed();
  saveDB(cache);
  return cache;
}

export function saveDB(db: DB) {
  cache = db;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}

export function resetDB() {
  cache = createSeed();
  saveDB(cache);
}

export function nextId(rows: { id: number }[]) {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

export function getSessionStaffId(): number | null {
  try {
    const v = localStorage.getItem(SESSION_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function setSessionStaffId(id: number | null) {
  try {
    if (id === null) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, String(id));
  } catch {}
}
