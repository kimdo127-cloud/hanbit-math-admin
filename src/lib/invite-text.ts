// 학부모 앱 초대 문자 (학원 폰으로 복사해 보낸다). 링크의 코드는 발급할 때 한 번만 받을 수 있다
import type { InviteIssued } from "./api.mock";

export const INVITE_URL = "https://hanbit-math-web.vercel.app/signup";
const when = (at: string) => `${Number(at.slice(5, 7))}/${Number(at.slice(8, 10))} ${at.slice(11, 16)}`;

export function inviteMessage(childName: string, inv: InviteIssued) {
  return `[한빛수학] ${childName} 학생 학부모 앱 초대예요.\n아래 링크로 들어가 이 번호(${inv.phone})와 자녀 이름으로 가입하면 수업 · 출결 · 납부를 볼 수 있어요.\n링크는 ${when(inv.expiresAt)}까지(3일) 한 번만 쓸 수 있어요.\n${INVITE_URL}?code=${inv.code}`;
}
