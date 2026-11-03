# hanbit-math-admin

한빛수학 **어드민** (직원용, PC 웹) · Next.js · 디자인: 토스 DESIGN.md

- 대시보드 · 수업 운영(출결 확인, 보강, 강좌) · 학생 관리 · 수납·환불 · 직원 계정
- 등원 키오스크: `/kiosk` (입구 태블릿, 보호자 번호 뒷자리 4자리)
- 권한 등급: 관리자(원장) · 매니저(실장) · 멤버(강사, 담당 강좌만)
- 백엔드: hanbit-math-backend (`src/lib/api.ts`가 호출)

## 실행

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=백엔드 주소
npm install
npm run dev
```

Vercel 환경 변수: `NEXT_PUBLIC_API_URL` = Render 백엔드 주소. 무료 백엔드는 잠들어 있으면 첫 요청이 30초~1분 걸릴 수 있다.

시연 계정: `admin@hanbit.kr` / `admin1234`(관리자), `office@hanbit.kr` / `staff1234`(매니저), `park@hanbit.kr` / `staff1234`(멤버)
