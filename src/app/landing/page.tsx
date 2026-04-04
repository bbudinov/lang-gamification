"use client";

import { useEffect, useRef, useState } from "react";

// ─── CONSTANTS ──────────────────────────────────────────────────
const WORLDS = [
  { emoji: "🏙️", name: "Land", locations: 19, desc: "City life, shops, restaurants" },
  { emoji: "🌊", name: "Ocean", locations: 8, desc: "Sailing, fishing, lighthouses" },
  { emoji: "🐙", name: "Underwater", locations: 9, desc: "Coral reefs, deep sea" },
  { emoji: "✈️", name: "Air", locations: 8, desc: "Weather, flight, airports" },
  { emoji: "🌍", name: "Culture", locations: 30, desc: "30 countries, traditions, food" },
  { emoji: "🧙", name: "Fantasy", locations: 8, desc: "Magic, dragons, quests" },
  { emoji: "🧪", name: "Science", locations: 8, desc: "Labs, robots, inventions" },
  { emoji: "🚀", name: "Cosmos", locations: 8, desc: "Planets, space stations" },
  { emoji: "🧠", name: "Emotions", locations: 8, desc: "Feelings, self-expression" },
  { emoji: "🏪", name: "Social", locations: 9, desc: "Cafes, hotels, hospitals" },
  { emoji: "⏳", name: "Time", locations: 8, desc: "Ancient to future" },
  { emoji: "🎭", name: "Meta", locations: 8, desc: "Language about language" },
  { emoji: "🏟️", name: "Sports", locations: 5, desc: "Stadium, racing, boxing" },
  { emoji: "🇧🇬", name: "Bulgarian History", locations: 5, desc: "3D diorama 681-1989" },
  { emoji: "👨‍⚕️", name: "Professions", locations: 6, desc: "Doctor, chef, pilot" },
  { emoji: "🧬", name: "Body & Health", locations: 6, desc: "Anatomy, fitness, lab" },
];

const STATS = [
  { value: "16", label: "3D Worlds", suffix: "" },
  { value: "153", label: "Locations", suffix: "" },
  { value: "2,290", label: "Words", suffix: "+" },
  { value: "154", label: "AI NPCs", suffix: "" },
  { value: "9", label: "Game Types", suffix: "" },
  { value: "6", label: "Languages", suffix: "" },
];

const GAMES = [
  { icon: "🎧", name: "Listen & Repeat", skill: "Listening", desc: "Hear a phrase, say it back, get scored" },
  { icon: "🗣️", name: "Say It!", skill: "Speaking", desc: "Syllable-by-syllable pronunciation feedback" },
  { icon: "🤖", name: "NPC Talk", skill: "Conversation", desc: "Real AI conversations with 3D avatars" },
  { icon: "❓", name: "Word Quiz", skill: "Listening", desc: "Hear a word, pick the correct translation" },
  { icon: "📝", name: "Fill the Scene", skill: "Reading", desc: "Read a sentence, pick the missing word" },
  { icon: "✅", name: "True or False", skill: "Reading", desc: "Judge word-translation pairs" },
  { icon: "🔤", name: "Word Scramble", skill: "Spelling", desc: "Arrange letters to spell the word" },
  { icon: "🃏", name: "Memory Match", skill: "Memory", desc: "Find matching word pairs" },
  { icon: "🔀", name: "Memory Mix", skill: "Memory", desc: "Cross-topic card challenge" },
];

const COMPARISONS = [
  { vs: "Duolingo", them: "Multiple choice quizzes, no real speaking", us: "3D worlds + AI conversations + pronunciation feedback" },
  { vs: "Lingokids", them: "Ages 3-6 only, pre-scripted", us: "Ages 7-14, real AI conversations that adapt" },
  { vs: "ChatGPT", them: "Text chat, no game mechanics", us: "Kids play, not chat. 9 game types + 3D worlds" },
  { vs: "Praktika", them: "Adult-focused, subscription-heavy", us: "Kid-first, game-first, 16 worlds + exercises" },
];

// ─── ANIMATED COUNTER ───────────────────────────────────────────
function AnimatedStat({ value, label, suffix }: { value: string; label: string; suffix: string }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const num = parseInt(value.replace(/,/g, ""));
          const duration = 1500;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * num);
            setDisplay(current.toLocaleString());
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
        {display}{suffix}
      </div>
      <div className="text-sm text-slate-400 mt-1 font-medium uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ─── FADE IN ON SCROLL ──────────────────────────────────────────
function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060c18] text-white overflow-x-hidden" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#060c18]/70 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <span className="text-2xl">🌍</span>
            <span className="text-lg font-bold">LangWorld</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#worlds" className="hover:text-white transition-colors">Worlds</a>
            <a href="#games" className="hover:text-white transition-colors">Games</a>
            <a href="#how" className="hover:text-white transition-colors">How It Works</a>
            <a href="#compare" className="hover:text-white transition-colors">Why Us</a>
          </div>
          <a
            href="https://langworld.vercel.app/map"
            target="_blank"
            className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 transition-all hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
          >
            Try Free
          </a>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/20 blur-[120px]" />
          <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/15 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-pink-500/10 blur-[120px]" />
          <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />
        </div>
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live now — 16 worlds, 6 languages
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] tracking-tight">
            A game that teaches{" "}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              real language
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Explore 16 AI-powered 3D worlds, talk to characters, and start speaking a new language — in English, Bulgarian, Spanish, Italian, German or French.
          </p>

          <p className="mt-3 text-sm text-slate-500 font-medium tracking-wide">
            Built for kids 7-15. Works for everyone. No homework. No pressure. Just progress.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a
              href="https://langworld.vercel.app/map"
              target="_blank"
              className="group px-8 py-3.5 rounded-full text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 transition-all hover:shadow-xl hover:shadow-purple-500/25 active:scale-95"
            >
              Start Playing Free
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">&#8594;</span>
            </a>
            <a
              href="#how"
              className="px-8 py-3.5 rounded-full text-base font-medium border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white transition-all"
            >
              See How It Works
            </a>
          </div>

          {/* Languages */}
          <div className="flex items-center justify-center gap-3 mt-12 text-2xl">
            {["🇬🇧", "🇧🇬", "🇪🇸", "🇮🇹", "🇩🇪", "🇫🇷"].map((flag, i) => (
              <span key={i} className="hover:scale-125 transition-transform cursor-default" title={["English", "Bulgarian", "Spanish", "Italian", "German", "French"][i]}>
                {flag}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 text-xs animate-bounce">
          <span>Scroll</span>
          <span>&#8595;</span>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="py-20 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
          {STATS.map((s, i) => (
            <AnimatedStat key={i} value={s.value} label={s.label} suffix={s.suffix} />
          ))}
        </div>
      </section>

      {/* ═══ WHY KIDS / WHY PARENTS ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <FadeIn delay={0}>
              <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/10">
                <div className="text-3xl mb-3">🎮</div>
                <h3 className="text-xl font-bold text-white mb-4">Why kids love it</h3>
                <ul className="space-y-3 text-slate-300 text-sm">
                  <li className="flex gap-3 items-start">
                    <span className="text-purple-400 text-lg leading-none">&#9679;</span>
                    <span>Feels like a game, not a lesson — 3D worlds to explore</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-purple-400 text-lg leading-none">&#9679;</span>
                    <span>Talk to AI characters who remember you and react</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-purple-400 text-lg leading-none">&#9679;</span>
                    <span>Earn XP, collect words, unlock new worlds</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-purple-400 text-lg leading-none">&#9679;</span>
                    <span>No wrong answers — AI encourages, never punishes</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-purple-400 text-lg leading-none">&#9679;</span>
                    <span>Speak from day one — pronunciation feedback on every word</span>
                  </li>
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-500/5 to-emerald-500/5 border border-blue-500/10">
                <div className="text-3xl mb-3">👨‍👩‍👧</div>
                <h3 className="text-xl font-bold text-white mb-4">Why everyone trusts it</h3>
                <ul className="space-y-3 text-slate-300 text-sm">
                  <li className="flex gap-3 items-start">
                    <span className="text-emerald-400 text-lg leading-none">&#9679;</span>
                    <span>Builds real speaking confidence, not just vocabulary</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-emerald-400 text-lg leading-none">&#9679;</span>
                    <span>Safe — no ads, no social features, no in-app purchases</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-emerald-400 text-lg leading-none">&#9679;</span>
                    <span>All 4 language skills: listening, speaking, reading, writing</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-emerald-400 text-lg leading-none">&#9679;</span>
                    <span>Works offline — no constant internet needed</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-emerald-400 text-lg leading-none">&#9679;</span>
                    <span>6 languages — learn any of them from any of them</span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <span className="text-emerald-400 text-lg leading-none">&#9679;</span>
                    <span>Free to start — no credit card, no commitment</span>
                  </li>
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ PROBLEM / SOLUTION ═══ */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
              Language apps teach words.{" "}
              <span className="text-slate-500">Not language.</span>
            </h2>
            <p className="text-center text-slate-400 max-w-2xl mx-auto mb-12">
              Kids memorize &quot;apple = ябълка&quot; but can&apos;t say &quot;Can I have an apple?&quot;
              The #1 complaint: &quot;I understand but I&apos;m afraid to speak.&quot;
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6">
            <FadeIn delay={100}>
              <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                <div className="text-red-400 text-sm font-semibold mb-3 uppercase tracking-wider">The problem</div>
                <ul className="space-y-3 text-slate-300 text-sm">
                  <li className="flex gap-2"><span className="text-red-400">&#10005;</span> Multiple choice quizzes — no real practice</li>
                  <li className="flex gap-2"><span className="text-red-400">&#10005;</span> No speaking, no listening, no conversations</li>
                  <li className="flex gap-2"><span className="text-red-400">&#10005;</span> Ages 7-14 completely ignored</li>
                  <li className="flex gap-2"><span className="text-red-400">&#10005;</span> Feels like homework, not fun</li>
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={200}>
              <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="text-emerald-400 text-sm font-semibold mb-3 uppercase tracking-wider">LangWorld</div>
                <ul className="space-y-3 text-slate-300 text-sm">
                  <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> 9 exercise types — every language skill</li>
                  <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Real AI conversations with 3D avatars</li>
                  <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> Built for ages 7-14 (scales to all ages)</li>
                  <li className="flex gap-2"><span className="text-emerald-400">&#10003;</span> A game kids actually want to play</li>
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ WORLDS ═══ */}
      <section id="worlds" className="py-24 px-6 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/8 blur-[100px]" />
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <FadeIn>
            <div className="text-center mb-12">
              <div className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-2">Explore</div>
              <h2 className="text-3xl sm:text-4xl font-bold">16 unique 3D worlds</h2>
              <p className="text-slate-400 mt-3 max-w-lg mx-auto">Each world has its own custom 3D map, vocabulary domain, and AI characters.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {WORLDS.map((w, i) => (
              <FadeIn key={i} delay={i * 50}>
                <div className="group p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all cursor-default">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{w.emoji}</div>
                  <div className="font-semibold text-sm text-white">{w.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{w.locations} locations</div>
                  <div className="text-xs text-slate-400 mt-1.5 leading-relaxed">{w.desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GAMES ═══ */}
      <section id="games" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <div className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-2">Practice</div>
              <h2 className="text-3xl sm:text-4xl font-bold">9 game types. Every skill.</h2>
              <p className="text-slate-400 mt-3">Listening, speaking, reading, writing — all through play.</p>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAMES.map((g, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 hover:bg-purple-500/[0.03] transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{g.icon}</span>
                    <div>
                      <div className="font-semibold text-sm text-white">{g.name}</div>
                      <div className="text-[11px] text-purple-400 font-medium uppercase tracking-wider">{g.skill}</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{g.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NPC TALK HIGHLIGHT ═══ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[30%] left-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <FadeIn>
            <div className="text-center mb-10">
              <div className="text-sm font-semibold text-pink-400 uppercase tracking-wider mb-2">Key Differentiator</div>
              <h2 className="text-3xl sm:text-4xl font-bold">AI conversations with 3D avatars</h2>
              <p className="text-slate-400 mt-3 max-w-xl mx-auto">154 unique NPCs. Each with personality, memory, and expertise. This is not a chatbot — it&apos;s a character you talk to.</p>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              {["Child taps mic", "Speaks freely", "AI responds in character", "Avatar lip syncs", "Child responds"].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/15 text-sm text-purple-300">
                    {step}
                  </div>
                  {i < 4 && <span className="text-slate-600">&#8594;</span>}
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={250}>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Contextual — at the zoo, restaurant, hospital",
                "Corrects naturally — \"Oh, you mean THE CAT? Great!\"",
                "Remembers past conversations",
                "Encyclopedia mode — ask about anything",
                "Fuzzy matching fixes speech errors",
                "Full immersion in target language",
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02]">
                  <span className="text-emerald-400 mt-0.5">&#10003;</span>
                  <span className="text-sm text-slate-300">{f}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <div className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">Simple</div>
              <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
            </div>
          </FadeIn>
          <div className="space-y-0">
            {[
              { num: "01", title: "Choose a world", desc: "16 themed 3D worlds — each with its own map, vocabulary, and characters" },
              { num: "02", title: "Tap a location", desc: "153 interactive locations across all worlds. Each teaches different words." },
              { num: "03", title: "Pick a game", desc: "9 game types covering listening, speaking, reading, and spelling" },
              { num: "04", title: "Play & earn", desc: "Earn XP, coins, streaks. Unlock new worlds by passing World Exams." },
              { num: "05", title: "Talk to NPCs", desc: "Real AI conversations with 154 characters. They remember you." },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="flex gap-6 py-6 border-b border-white/5 group">
                  <div className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent w-12 shrink-0">{step.num}</div>
                  <div>
                    <div className="text-lg font-semibold text-white">{step.title}</div>
                    <div className="text-sm text-slate-400 mt-1">{step.desc}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VS COMPARISON ═══ */}
      <section id="compare" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <div className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2">Why Us</div>
              <h2 className="text-3xl sm:text-4xl font-bold">Not another quiz app</h2>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-4">
            {COMPARISONS.map((c, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-sm font-bold text-white mb-3">vs {c.vs}</div>
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-red-400 text-xs mt-0.5">&#10005;</span>
                    <span className="text-xs text-slate-500">{c.them}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 text-xs mt-0.5">&#10003;</span>
                    <span className="text-xs text-slate-300">{c.us}</span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VISION QUOTE ═══ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[30%] left-[30%] w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-[120px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <FadeIn>
            <p className="text-2xl sm:text-3xl md:text-4xl font-light text-slate-300 leading-relaxed italic">
              &quot;You don&apos;t learn a language —<br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent font-medium not-italic">
                you live in a world through it.
              </span>&quot;
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-slate-500">
              <span>Ask a zookeeper about opossums.</span>
              <span className="text-slate-700">|</span>
              <span>Order pizza in Spanish.</span>
              <span className="text-slate-700">|</span>
              <span>Describe symptoms in German.</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-purple-500/5" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Your next language starts here</h2>
            <p className="text-slate-400 mb-2">Free. No account needed. Works on any device.</p>
            <p className="text-slate-500 text-sm mb-8">No homework. No pressure. Just progress.</p>
            <a
              href="https://langworld.vercel.app/map"
              target="_blank"
              className="inline-block px-10 py-4 rounded-full text-lg font-semibold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 transition-all hover:shadow-xl hover:shadow-purple-500/25 active:scale-95"
            >
              Start Playing Now &#8594;
            </a>
            <div className="flex items-center justify-center gap-4 mt-8 text-xs text-slate-500">
              <span>No signup required</span>
              <span className="text-slate-700">|</span>
              <span>Works on phone, tablet, desktop</span>
              <span className="text-slate-700">|</span>
              <span>PWA — install like an app</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌍</span>
            <span>LangWorld</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <span>|</span>
            <a href="/terms" className="hover:text-slate-400 transition-colors">Terms</a>
            <span>Built with AI. For the future of language learning.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
