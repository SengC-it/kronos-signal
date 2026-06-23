import type { Metadata } from "next";
import Link from "next/link";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Kronos V4 Signal Console",
  description: "AI crypto spot and futures trading signal quality-control console",
};

const navItems = [
  ["Dashboard", "/"],
  ["Signals", "/signals"],
  ["Performance", "/performance"],
  ["Risk", "/risk"],
  ["Parameters", "/parameters"],
  ["Logs", "/logs"],
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">Kronos V4</div>
            <nav className="nav">
              {navItems.map(([label, href]) => (
                <Link key={href} href={href}>
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
