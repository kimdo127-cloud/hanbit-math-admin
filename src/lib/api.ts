// 화면이 부르는 함수 모음. 함수 이름·모양은 목업 때와 같고, 안에서 백엔드(NestJS)를 부른다
// POST {API}/api/admin/<함수 이름>  { args: [...] }  · 로그인 토큰은 Authorization 헤더로
import type * as M from "./api.mock";
export type * from "./api.mock";
export { GRADE_LABEL, WEEKDAY, ROLE_LABEL, canSee, scheduleText, statusByTime, fmtRefundDue, REFUND_DAYS, ENROLL_CHANNELS, today } from "./api.mock";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "hanbit-admin-token";
const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

async function call<T>(fn: string, args: unknown[]): Promise<T> {
  let res: Response;
  try {
    const token = getToken();
    res = await fetch(`${API}/api/admin/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ args }),
    });
  } catch {
    throw new ApiError("서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.", 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) setToken(null); // 토큰 만료 → 다시 로그인
    throw new ApiError(body.message ?? "잠시 후 다시 시도해 주세요.", res.status);
  }
  if (body.token) setToken(body.token);
  return body.data as T;
}

// 목업 함수와 같은 이름·타입으로 백엔드를 부르는 함수를 만든다
const rpc = <K extends keyof typeof M>(name: K) => ((...args: unknown[]) => call(name as string, args)) as unknown as (typeof M)[K];

// 로그인한 직원 정보는 화면이 바로 쓰도록 브라우저에 담아 둔다 (권한 검사는 백엔드가 매번 다시 함)
const ME_KEY = "hanbit-admin-me";
export function currentStaff(): M.StaffPublic | null {
  try {
    if (!getToken()) return null;
    const v = localStorage.getItem(ME_KEY);
    return v ? (JSON.parse(v) as M.StaffPublic) : null;
  } catch {
    return null;
  }
}
export async function refreshMe() {
  const me = await call<M.StaffPublic | null>("currentStaff", []);
  try {
    if (me) localStorage.setItem(ME_KEY, JSON.stringify(me));
    else localStorage.removeItem(ME_KEY);
  } catch {}
  return me;
}
export async function login(email: string, password: string) {
  await call("login", [email, password]);
  await refreshMe();
}
export function logout() {
  setToken(null);
  try {
    localStorage.removeItem(ME_KEY);
  } catch {}
}
export async function resetDemo() {
  await call("resetDemo", []);
  logout();
}

export const changePassword = rpc("changePassword");
export const checkToken = rpc("checkToken");
export const setPasswordWithToken = rpc("setPasswordWithToken");
export const requestReset = rpc("requestReset");
export const listStaff = rpc("listStaff");
export const createStaff = rpc("createStaff");
export const updateStaff = rpc("updateStaff");
export const setStaffActive = rpc("setStaffActive");
export const sendStaffLink = rpc("sendStaffLink");
export const listClasses = rpc("listClasses");
export const listTeachers = rpc("listTeachers");
export const saveClass = rpc("saveClass");
export const getClassDetail = rpc("getClassDetail");
export const listStudents = rpc("listStudents");
export const getStudentDetail = rpc("getStudentDetail");
export const updateStudent = rpc("updateStudent");
export const createStudent = rpc("createStudent");
export const listChatLogs = rpc("listChatLogs");
export const endEnrollment = rpc("endEnrollment");
export const listSessionDates = rpc("listSessionDates");
export const getAttendanceSheet = rpc("getAttendanceSheet");
export const saveAttendance = rpc("saveAttendance");
export const listMakeups = rpc("listMakeups");
export const listMakeupSlots = rpc("listMakeupSlots");
export const createMakeup = rpc("createMakeup");
export const deleteMakeup = rpc("deleteMakeup");
export const listPayments = rpc("listPayments");
export const markPaid = rpc("markPaid");
export const cancelPaid = rpc("cancelPaid");
export const listRefunds = rpc("listRefunds");
export const markRefunded = rpc("markRefunded");
export const getDashboard = rpc("getDashboard");
export const kioskLookup = rpc("kioskLookup");
export const kioskCheckIn = rpc("kioskCheckIn");
export const enrollByStaff = rpc("enrollByStaff");
export const addLevelTest = rpc("addLevelTest");
export const deleteLevelTest = rpc("deleteLevelTest");
export const getLevelTestSheet = rpc("getLevelTestSheet");
export const saveLevelTestSheet = rpc("saveLevelTestSheet");
export const levelTestRules = rpc("levelTestRules");
export const sendParentInvite = rpc("sendParentInvite");
export const setPrimaryContact = rpc("setPrimaryContact");
export const addContactByStaff = rpc("addContactByStaff");
export const removeContactByStaff = rpc("removeContactByStaff");
