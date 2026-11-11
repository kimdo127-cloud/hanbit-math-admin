import type { Metadata } from "next";
import "./globals.css";
import { WarmUp } from "@/components/warm-up";

export const metadata: Metadata = {
  title: "한빛수학 운영",
  description: "한빛수학 운영 화면 — 강좌, 출결, 보강, 수납, 직원 관리",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <WarmUp />
        {children}
      </body>
    </html>
  );
}
