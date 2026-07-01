import Link from "next/link";

interface Tool {
  href: string;
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
}

const tools: Tool[] = [
  {
    href: "/bagrut-generator",
    title: "Bagrut Unseen Generator",
    description:
      "Generate full Module E & G reading comprehension exams — unseen text, comprehension questions, glossary, vocabulary tasks, and an answer key.",
    badge: "Module E & G",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <line x1="10" y1="9" x2="8" y2="9"/>
      </svg>
    ),
    accentColor: "#6366f1",
    accentBg: "linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                   stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-2xl sm:text-3xl leading-tight tracking-tight">
                Practice Materials
              </h1>
              <p className="text-indigo-300 text-sm mt-0.5">
                Teaching tools for the Israeli 5-point Bagrut · Powered by Claude AI
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tool grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">
          Available tools
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="group block">
              <div
                className="h-full bg-white rounded-2xl border border-gray-200/80 p-6 flex flex-col transition-all duration-200 group-hover:-translate-y-0.5"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,.06), 0 8px 32px rgba(0,0,0,.04)" }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 shrink-0 transition-transform duration-200 group-hover:scale-105"
                  style={{ background: tool.accentBg, color: tool.accentColor }}
                >
                  {tool.icon}
                </div>

                {/* Text */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="font-bold text-gray-900 text-base leading-snug">
                      {tool.title}
                    </h2>
                    <span
                      className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: tool.accentBg,
                        color: tool.accentColor,
                      }}
                    >
                      {tool.badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                {/* CTA */}
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span
                    className="text-sm font-semibold transition-colors"
                    style={{ color: tool.accentColor }}
                  >
                    Open tool
                  </span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke={tool.accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  >
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
