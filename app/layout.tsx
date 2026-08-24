import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OpenDayCare",
  description: "La comunidad de tu guarderia",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="protected-history-guard" strategy="beforeInteractive">{`
          (() => {
            const key = "opendaycare:logged-out";
            const publicPaths = new Set(["/login", "/activate", "/auth/callback"]);
            const redirect = (event) => {
              if (publicPaths.has(location.pathname) || sessionStorage.getItem(key) !== "1") return;
              event?.stopImmediatePropagation();
              location.replace("/login");
            };
            redirect();
            addEventListener("pageshow", redirect, true);
          })();
        `}</Script>
        {children}
      </body>
    </html>
  );
}
