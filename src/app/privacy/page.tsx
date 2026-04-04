"use client";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#060c18] text-slate-300 px-6 py-16" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        <a href="/landing" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">← Back to LangWorld</a>

        <h1 className="text-3xl font-bold text-white mt-8 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-12">Last updated: April 4, 2026</p>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Who We Are</h2>
            <p>
              LangWorld (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an interactive language learning platform designed primarily for children ages 7–15 and learners of all ages. LangWorld is operated by its creator and is accessible at <strong>langworld.vercel.app</strong>.
            </p>
            <p className="mt-2">
              We take your privacy — and especially the privacy of children — extremely seriously. This policy explains what data we collect, why, how we process it, and your rights.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Data We Collect</h2>

            <h3 className="text-white font-medium mt-4 mb-2">2.1 Account Data</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong>Kid accounts:</strong> Display name + 4-digit PIN only. No email, no password, no personal identifiers. A deterministic internal email is generated for authentication but is never visible or used for communication.</li>
              <li><strong>Parent/Teacher accounts:</strong> Email address, password (hashed, never stored in plain text), and optional display name.</li>
              <li><strong>Playing without account:</strong> No data is collected. Progress is stored locally on your device only.</li>
            </ul>

            <h3 className="text-white font-medium mt-4 mb-2">2.2 Game Progress Data</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>XP points, coins, daily streaks, achievements</li>
              <li>Unlocked worlds and topics</li>
              <li>Word mastery scores (correct/wrong counts per word)</li>
              <li>Game results (game type, score, timestamp)</li>
              <li>Language preferences (native and target language)</li>
            </ul>

            <h3 className="text-white font-medium mt-4 mb-2">2.3 AI Conversation Data</h3>
            <p>When using the NPC Talk feature, conversation messages are sent to our AI provider (Anthropic Claude API) for processing. These messages:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
              <li>Are used solely to generate contextual AI responses</li>
              <li>Are retained by Anthropic for up to 30 days, then automatically deleted</li>
              <li>Are not used to train AI models (per Anthropic&apos;s API terms)</li>
              <li>Do not contain personal identifiers — only gameplay dialogue</li>
            </ul>

            <h3 className="text-white font-medium mt-4 mb-2">2.4 Voice and Speech Data</h3>
            <p>When using Say It! or Listen &amp; Repeat features:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
              <li>Speech recognition is processed entirely by your browser (Web Speech API — a W3C standard built into Chrome, Safari, Firefox)</li>
              <li><strong>No audio recordings are stored, transmitted, or sent to our servers</strong></li>
              <li>Speech-to-text conversion happens locally on your device</li>
              <li>We only receive the text result for scoring purposes</li>
            </ul>

            <h3 className="text-white font-medium mt-4 mb-2">2.5 Data We Do NOT Collect</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>No real names (kid accounts use display names only)</li>
              <li>No phone numbers</li>
              <li>No location/GPS data</li>
              <li>No photos or camera access</li>
              <li>No contacts or address book</li>
              <li>No browsing history</li>
              <li>No advertising identifiers</li>
              <li>No third-party analytics or tracking (no Google Analytics, no Facebook Pixel, no Hotjar)</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Third-Party Services</h2>
            <p>We use the following third-party services to operate LangWorld. Each is used for a specific, limited purpose:</p>

            <div className="mt-4 space-y-4">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <h4 className="text-white font-medium">Anthropic (Claude API)</h4>
                <p className="text-slate-400 mt-1"><strong>Purpose:</strong> Powers AI NPC conversations — the characters children talk to in the game.</p>
                <p className="text-slate-400"><strong>Data sent:</strong> In-game conversation messages only (no personal data).</p>
                <p className="text-slate-400"><strong>Retention:</strong> 30 days, then auto-deleted. Not used for model training.</p>
                <p className="text-slate-400"><strong>Privacy:</strong> <a href="https://www.anthropic.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener">anthropic.com/privacy</a></p>
              </div>

              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <h4 className="text-white font-medium">Google Cloud Text-to-Speech</h4>
                <p className="text-slate-400 mt-1"><strong>Purpose:</strong> Generates spoken audio for words and AI responses.</p>
                <p className="text-slate-400"><strong>Data sent:</strong> Text snippets of words/phrases for audio synthesis. No personal data.</p>
                <p className="text-slate-400"><strong>Note:</strong> Most audio is pre-generated at build time and served as static files. Real-time TTS is used only as a fallback for AI conversation responses.</p>
                <p className="text-slate-400"><strong>Privacy:</strong> <a href="https://cloud.google.com/terms/cloud-privacy-notice" className="text-blue-400 hover:underline" target="_blank" rel="noopener">Google Cloud Privacy Notice</a></p>
              </div>

              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <h4 className="text-white font-medium">Supabase</h4>
                <p className="text-slate-400 mt-1"><strong>Purpose:</strong> User authentication and cloud storage of game progress.</p>
                <p className="text-slate-400"><strong>Data stored:</strong> Account credentials (hashed), game progress, word mastery, achievements.</p>
                <p className="text-slate-400"><strong>Location:</strong> Cloud-hosted (US region).</p>
                <p className="text-slate-400"><strong>Compliance:</strong> GDPR and SOC2 compliant.</p>
                <p className="text-slate-400"><strong>Privacy:</strong> <a href="https://supabase.com/privacy" className="text-blue-400 hover:underline" target="_blank" rel="noopener">supabase.com/privacy</a></p>
              </div>

              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/5">
                <h4 className="text-white font-medium">Vercel</h4>
                <p className="text-slate-400 mt-1"><strong>Purpose:</strong> Hosts and serves the LangWorld application.</p>
                <p className="text-slate-400"><strong>Data processed:</strong> Standard HTTP request logs (IP addresses, user agents). No user-specific tracking.</p>
                <p className="text-slate-400"><strong>Privacy:</strong> <a href="https://vercel.com/legal/privacy-policy" className="text-blue-400 hover:underline" target="_blank" rel="noopener">vercel.com/legal/privacy-policy</a></p>
              </div>
            </div>

            <h3 className="text-white font-medium mt-6 mb-2">Services We Do NOT Use</h3>
            <p className="text-slate-400">LangWorld does not use any advertising networks, analytics platforms, social media trackers, or data brokers. Specifically: no Google Analytics, no Facebook Pixel, no Hotjar, no Mixpanel, no Segment, no Sentry, no advertising SDKs of any kind.</p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Local Storage and Offline Data</h2>
            <p>LangWorld uses your browser&apos;s localStorage to store:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
              <li>Game progress (XP, coins, unlocked content)</li>
              <li>Voice preference settings</li>
              <li>Achievement claim status</li>
              <li>Language selection preferences</li>
            </ul>
            <p className="mt-2">This data stays on your device and is only synced to Supabase if you create an account. You can clear this data at any time through your browser settings.</p>
            <p className="mt-2">LangWorld uses a Service Worker for offline functionality (caching game assets like images, audio, and 3D models). The Service Worker does not collect or transmit any data.</p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Children&apos;s Privacy (COPPA / GDPR-K)</h2>
            <p>LangWorld is designed for children ages 7–15. We take children&apos;s privacy extremely seriously:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
              <li><strong>Minimal data collection:</strong> Kid accounts require only a display name and 4-digit PIN. No email, no real name, no age, no photo.</li>
              <li><strong>No social features:</strong> Children cannot message, follow, or interact with other users.</li>
              <li><strong>No advertising:</strong> LangWorld contains zero ads and no advertising tracking.</li>
              <li><strong>No in-app purchases:</strong> All in-game items (shop, pets, mystery box) use virtual currency earned through gameplay only.</li>
              <li><strong>No external links:</strong> The game does not link children to external websites or services.</li>
              <li><strong>AI safety:</strong> NPC conversations are strictly bounded by system prompts that prevent inappropriate content. AI characters never ask for personal information and always respond in an encouraging, educational manner.</li>
              <li><strong>Parental access:</strong> Parents can create a parent account to monitor progress. Parents can request data deletion at any time.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. 3D Assets and Intellectual Property</h2>
            <p>LangWorld uses 3D models, character avatars, and visual assets in the game experience:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
              <li>3D character models (Professor Globe avatar) are used under appropriate licensing terms.</li>
              <li>All 17 custom 3D world maps are original creations built with Three.js and React Three Fiber.</li>
              <li>Audio files are generated using Google Cloud Text-to-Speech API with appropriate commercial licensing.</li>
              <li>The Inter font is served locally via Next.js (no external font requests).</li>
              <li>Emoji graphics are Unicode standard characters rendered by your device&apos;s operating system.</li>
            </ul>
            <p className="mt-2">All game mechanics, code architecture, world designs, NPC personalities, and educational content are original works.</p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Open Source Dependencies</h2>
            <p>LangWorld is built using open source software libraries, all of which are used in compliance with their respective licenses:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
              <li><strong>Next.js, React, React DOM</strong> — MIT License</li>
              <li><strong>Three.js, React Three Fiber, Drei</strong> — MIT License</li>
              <li><strong>Zustand</strong> (state management) — MIT License</li>
              <li><strong>Tailwind CSS</strong> — MIT License</li>
              <li><strong>Supabase JS Client</strong> — MIT License</li>
              <li><strong>Anthropic SDK</strong> — MIT License</li>
              <li><strong>wawa-lipsync</strong> — Used for client-side lip sync animation</li>
            </ul>
            <p className="mt-2">No open source licenses require us to share user data or grant third parties access to your information. All libraries are used for their intended technical purpose only.</p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Data Security</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>All data transmission is encrypted via HTTPS/TLS.</li>
              <li>Passwords are hashed using industry-standard algorithms (bcrypt via Supabase Auth).</li>
              <li>API keys are stored as environment variables, never in client-side code.</li>
              <li>The Supabase anon key used client-side provides limited access — Row Level Security (RLS) policies ensure users can only access their own data.</li>
              <li>AI API requests are rate-limited to prevent abuse (30 requests/minute per user).</li>
              <li>No sensitive data is cached in the Service Worker.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Your Rights</h2>
            <p>Under GDPR (EU), CCPA (California), and other applicable regulations, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
              <li><strong>Access</strong> — Request a copy of all data we hold about you or your child.</li>
              <li><strong>Correction</strong> — Request correction of inaccurate data.</li>
              <li><strong>Deletion</strong> — Request complete deletion of your account and all associated data.</li>
              <li><strong>Portability</strong> — Request your data in a machine-readable format.</li>
              <li><strong>Withdrawal of consent</strong> — You can stop using AI features or delete your account at any time.</li>
              <li><strong>Objection</strong> — Object to any processing you believe is not necessary.</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at the email below. We will respond within 30 days.</p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Data Retention</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong>Account data:</strong> Retained as long as the account exists. Deleted within 30 days of account deletion request.</li>
              <li><strong>Game progress:</strong> Same as account data. Deleted with account.</li>
              <li><strong>AI conversations:</strong> Retained by Anthropic for up to 30 days, then auto-deleted. We do not store conversation logs.</li>
              <li><strong>TTS requests:</strong> Processed in real-time by Google Cloud. Not retained beyond the API call.</li>
              <li><strong>Server logs:</strong> Vercel retains request logs per their standard retention policy.</li>
              <li><strong>Local storage:</strong> Persists until you clear browser data or uninstall the PWA.</li>
            </ul>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Cookies</h2>
            <p>LangWorld uses minimal cookies:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
              <li><strong>Authentication cookie</strong> — Set by Supabase to maintain your login session. Essential for account functionality. Expires on logout or after session timeout.</li>
              <li><strong>No advertising cookies.</strong></li>
              <li><strong>No tracking cookies.</strong></li>
              <li><strong>No third-party cookies.</strong></li>
            </ul>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. When we do, we will update the &quot;Last updated&quot; date at the top. For significant changes, we will notify users through the application.</p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Contact</h2>
            <p>If you have questions about this Privacy Policy, want to exercise your data rights, or have concerns about your child&apos;s privacy:</p>
            <p className="mt-2 text-white font-medium">Email: privacy@langworld.app</p>
            <p className="mt-1 text-slate-400">We aim to respond to all privacy inquiries within 30 days.</p>
          </section>

          {/* Summary */}
          <section className="mt-12 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
            <h2 className="text-lg font-semibold text-white mb-3">TL;DR — Our Privacy Promise</h2>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>&#10003; We collect the absolute minimum data needed to make the game work.</li>
              <li>&#10003; Kids don&apos;t need to give us their real name, email, or any personal info.</li>
              <li>&#10003; We don&apos;t track you, don&apos;t show ads, and don&apos;t sell data. Ever.</li>
              <li>&#10003; Voice/speech processing happens on your device, not our servers.</li>
              <li>&#10003; AI conversations are private and auto-deleted after 30 days.</li>
              <li>&#10003; You can delete all your data at any time.</li>
              <li>&#10003; We use open source software with clean licenses.</li>
              <li>&#10003; No third-party analytics, no advertising, no data brokers.</li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-xs text-slate-600 text-center">
          <p>LangWorld — Learn languages by living in them.</p>
        </div>
      </div>
    </div>
  );
}
