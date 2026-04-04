"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  SearchIcon,
  GlobeIcon,
  BarChart3Icon,
  LinkIcon,
  GaugeIcon,
  SparklesIcon,
  ArrowRightIcon,
  KeyboardIcon,
  PlusIcon,
  BookOpenIcon,
} from "lucide-react";

const KURALS = [
  { number: 1,   couplet: ["அகர முதல எழுத்தெல்லாம் ஆதி", "பகவன் முதற்றே உலகு."], meaning: "எழுத்துக்கெல்லாம் அகரம் முதலானது போல், உலகிற்கு இறைவன் முதலானவன்." },
  { number: 2,   couplet: ["கற்றதனால் ஆய பயனென்கொல் வாலறிவன்", "நற்றாள் தொழாஅர் எனின்."], meaning: "தூய அறிவாளனான இறைவனின் திருவடியை வணங்காவிட்டால் கற்றதனால் என்ன பயன்?" },
  { number: 4,   couplet: ["வேண்டுதல் வேண்டாமை இலானடி சேர்ந்தார்க்கு", "யாண்டும் இடும்பை இல."], meaning: "விருப்பு வெறுப்பற்ற இறைவனின் திருவடியை சேர்ந்தவர்களுக்கு எங்கும் துன்பமில்லை." },
  { number: 7,   couplet: ["தனக்குவமை இல்லாதான் தாளசைந்தார்க் கல்லால்", "மனக்கவலை மாற்றல் அரிது."], meaning: "ஒப்பற்ற இறைவனின் திருவடியை வணங்காமல் மனக்கவலையைப் போக்குவது அரிது." },
  { number: 22,  couplet: ["ஒழுக்கம் விழுப்பந் தரலான் ஒழுக்கம்", "உயிரினும் ஓம்பப் படும்."], meaning: "ஒழுக்கம் சிறப்பை அளிப்பதால், அதை உயிரையும் விட காத்துக்கொள்ள வேண்டும்." },
  { number: 32,  couplet: ["இன்னாசெய் தாரை ஒறுத்தல் அவர்நாண", "நன்னயஞ் செய்து விடல்."], meaning: "தீமை செய்தவரை தண்டிப்பதைவிட அவர் நாணும்படி நன்மை செய்துவிடுவதே சிறந்தது." },
  { number: 41,  couplet: ["அன்பும் அறனும் உடைத்தாயின் இல்வாழ்க்கை", "பண்பும் பயனும் அது."], meaning: "அன்பும் அறமும் உள்ள இல்வாழ்க்கை சிறந்த பண்பும் பயனும் உடையது." },
  { number: 55,  couplet: ["தெய்வத்தான் ஆகா தெனினும் முயற்சிதன்", "மெய்வருத்தக் கூலி தரும்."], meaning: "தெய்வ நம்பிக்கையாலும் ஆகாதென்று தோன்றினாலும், முயற்சி உழைப்பிற்கான பலனை தரும்." },
  { number: 71,  couplet: ["அன்பிற்கும் உண்டோ அடைக்குந்தாழ் ஆர்வலர்", "புன்கணீர் பூசல் தரும்."], meaning: "அன்புக்கு தடை செய்யும் தாழ்ப்பாள் உண்டோ? அன்பர்களின் கண்ணீரே அதை திறந்துவிடும்." },
  { number: 100, couplet: ["நன்றி மறப்பது நன்றன்று நன்றல்லது", "அன்றே மறப்பது நன்று."], meaning: "நன்மையை மறப்பது நல்லதல்ல; தீமையை உடனே மறப்பது நல்லது." },
  { number: 391, couplet: ["கற்க கசடறக் கற்பவை கற்றபின்", "நிற்க அதற்குத் தக."], meaning: "குற்றமற்றவற்றை கற்று, கற்றதற்கு தகுந்தவாறு வாழ வேண்டும்." },
  { number: 423, couplet: ["எப்பொருள் எத்தன்மைத் தாயினும் அப்பொருள்", "மெய்ப்பொருள் காண்பது அறிவு."], meaning: "எந்தப் பொருளும் எவ்வாறு தோன்றினாலும் அதன் உண்மையான இயல்பை காண்பதே அறிவு." },
];

function getDailyKural() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  return KURALS[dayOfYear % KURALS.length];
}

const QUICK_ACTIONS = [
  { label: "SEO Analyze", sub: "Audit any URL",     Icon: GlobeIcon,     href: "/seo",              iconBg: "bg-blue-500/10",    iconColor: "text-blue-400"    },
  { label: "Analytics",   sub: "Google Analytics",  Icon: BarChart3Icon, href: "/ga",               iconBg: "bg-purple-500/10",  iconColor: "text-purple-400"  },
  { label: "Keywords",    sub: "Track rankings",    Icon: SearchIcon,    href: "/keyword-tracker",  iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400" },
  { label: "Backlinks",   sub: "Monitor links",     Icon: LinkIcon,      href: "/backlinks",        iconBg: "bg-orange-500/10",  iconColor: "text-orange-400"  },
  { label: "Speed Test",  sub: "Page performance",  Icon: GaugeIcon,     href: "/speed-monitor",    iconBg: "bg-rose-500/10",    iconColor: "text-rose-400"    },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const kural = getDailyKural();

  // Focus search on "/"
  useEffect(() => {
    function onKey(e) {
      if (
        e.key === "/" &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser(data.user);

      let query = supabase
        .from("seo_analyses")
        .select("id, url, score, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      query = query.eq("user_id", data.user.id).is("team_id", null);

      query.then(({ data: analyses }) => {
        if (analyses) setRecentAnalyses(analyses);
      });
    });
  }, []);

  function getScoreColor(score) {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/seo?url=${encodeURIComponent(search.trim())}`);
  }

  const userName = user?.email
    ?.split("@")[0]
    ?.replace(/[._-]+/g, " ")
    ?.replace(/\b\w/g, (c) => c.toUpperCase()) || "there";

  return (
    <div className="py-4">
      {/*
        DOM order drives CSS grid auto-placement (4-col, left→right, top→bottom):
        1. Hero       col-span-2 row-span-2  → cols 1-2, rows 1-2
        2. SEO        col-span-1             → col 3,    row 1
        3. Kural      col-span-1 row-span-3  → col 4,    rows 1-3
        4. Analytics  col-span-1             → col 3,    row 2
        5. Keywords   col-span-1             → col 1,    row 3
        6. Backlinks  col-span-1             → col 2,    row 3
        7. Speed      col-span-1             → col 3,    row 3
        8. Recent     col-span-4             → cols 1-4, row 4
      */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ── 1. Hero + Search ── */}
        <div className="col-span-2 lg:row-span-2 rounded-2xl border border-border bg-card p-6 flex flex-col gap-6">
          {/* Greeting */}
          <div className="flex items-center gap-3">
            <SparklesIcon size={26} className="text-orange-400 shrink-0" />
            <h1 className="text-3xl font-light tracking-tight text-foreground truncate">
              Hello, {userName}
            </h1>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex-1 flex flex-col justify-center">
            <div className="rounded-xl border border-border/60 bg-background px-4 pt-4 pb-3 shadow-sm">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Enter a URL to analyze…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => {}}
                  className="h-7 w-7 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <PlusIcon size={13} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground border border-border/50 rounded px-1.5 py-0.5 font-mono">
                    <KeyboardIcon size={10} /> /
                  </span>
                  {search.trim() && (
                    <button
                      type="submit"
                      className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Analyze
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* ── 2. SEO Analyze ── */}
        <BentoAction action={QUICK_ACTIONS[0]} />

        {/* ── 3. Kural of the Day (row-span-3 on lg) ── */}
        <div className="col-span-2 lg:col-span-1 lg:row-span-3 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-5 font-sans flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpenIcon size={13} className="text-amber-500" />
              <span className="text-xs font-semibold text-amber-500 tracking-wide" lang="ta">திருக்குறள்</span>
            </div>
            <span className="text-[11px] text-muted-foreground border border-border/50 rounded-full px-2 py-0.5" lang="ta">
              குறள் {kural.number}
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3">
            <div className="space-y-1" lang="ta">
              {kural.couplet.map((line, i) => (
                <p key={i} className="text-base font-semibold text-foreground leading-loose">{line}</p>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed" lang="ta">{kural.meaning}</p>
          </div>
        </div>

        {/* ── 4. Analytics ── */}
        <BentoAction action={QUICK_ACTIONS[1]} />

        {/* ── 5. Keywords ── */}
        <BentoAction action={QUICK_ACTIONS[2]} />

        {/* ── 6. Backlinks ── */}
        <BentoAction action={QUICK_ACTIONS[3]} />

        {/* ── 7. Speed Test ── */}
        <BentoAction action={QUICK_ACTIONS[4]} />

        {/* ── 8. Recent Analyses ── */}
        {recentAnalyses.length > 0 && (
          <div className="col-span-2 lg:col-span-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Recent Analyses</h3>
              <Link href="/seo" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all <ArrowRightIcon size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {recentAnalyses.map((item) => (
                <Link
                  key={item.id}
                  href="/seo"
                  className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm truncate flex-1 mr-4">{item.url}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-semibold font-mono ${getScoreColor(item.score)}`}>{item.score}</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BentoAction({ action }) {
  return (
    <Link
      href={action.href}
      className="col-span-1 rounded-2xl border border-border bg-card p-5 flex flex-col justify-between hover:bg-muted/30 hover:border-border transition-all group min-h-[120px]"
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.iconBg}`}>
        <action.Icon size={18} className={action.iconColor} />
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight">{action.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{action.sub}</p>
      </div>
    </Link>
  );
}
