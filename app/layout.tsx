import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import type { ReactNode } from "react";
import { AppProfileProvider } from "@/components/shared/AppProfileProvider";
import { getCurrentAppProfile } from "@/utils/supabase/profile";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  let profile = null;
  try {
    profile = await getCurrentAppProfile();
  } catch {
    // Keep public/auth routes usable when the application profile read is transiently unavailable.
  }

  return (
    <html
      lang="es"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProfileProvider profile={profile}>{children}</AppProfileProvider>
      </body>
    </html>
  );
}
