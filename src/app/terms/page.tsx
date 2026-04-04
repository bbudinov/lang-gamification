"use client";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#060c18] text-slate-300 px-6 py-16" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        <a href="/landing" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">← Back to LangWorld</a>

        <h1 className="text-3xl font-bold text-white mt-8 mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-slate-500 mb-12">Last updated: April 4, 2026</p>

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. About LangWorld</h2>
            <p>
              LangWorld is an interactive language learning game designed primarily for children ages 7–15 and suitable for learners of all ages. The service is provided as a free-to-use Progressive Web App (PWA) accessible at <strong>langworld.vercel.app</strong>.
            </p>
            <p className="mt-2">
              By using LangWorld, you agree to these Terms &amp; Conditions. If you are a parent or guardian allowing a child to use LangWorld, you accept these terms on their behalf.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Age-Appropriate Content Guarantee</h2>
            <p>LangWorld is committed to providing a safe, educational experience for users of all ages, including children under 18:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              <li><strong>All content is suitable for children ages 7 and above.</strong> Vocabulary, scenarios, NPC dialogues, and game mechanics are designed to be educational, encouraging, and age-appropriate.</li>
              <li><strong>AI-powered NPC conversations</strong> are governed by strict system prompts that:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>Prevent generation of violent, sexual, discriminatory, or otherwise inappropriate content</li>
                  <li>Never ask children for personal information (real name, address, school, age, etc.)</li>
                  <li>Always respond in an encouraging, educational tone</li>
                  <li>Redirect off-topic conversations back to language learning</li>
                  <li>Never suggest external websites, downloads, or real-world meetings</li>
                </ul>
              </li>
              <li><strong>Content moderation:</strong> All vocabulary, phrases, NPC personalities, and scenario descriptions are manually reviewed before deployment.</li>
              <li><strong>No user-generated content:</strong> Children cannot create, post, or share any content visible to other users.</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. No Real Money — Ever</h2>
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10 mb-4">
              <p className="text-emerald-300 font-medium">LangWorld will never charge children money or ask for payment information.</p>
            </div>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li><strong>No in-app purchases.</strong> The in-game shop (avatars, pets, mystery box, title badges) uses only virtual coins earned through gameplay. These virtual items have no real-world monetary value.</li>
              <li><strong>No premium tiers or paywalls.</strong> All game content, worlds, locations, and game types are accessible to all users without payment.</li>
              <li><strong>No subscription fees.</strong> LangWorld is free to use.</li>
              <li><strong>No advertising.</strong> LangWorld contains zero ads and receives no advertising revenue.</li>
              <li><strong>No loot boxes with real money.</strong> The Mystery Box feature uses only in-game coins and provides cosmetic items only.</li>
              <li><strong>Virtual currency cannot be purchased, transferred, sold, or exchanged for real money.</strong></li>
              <li><strong>If LangWorld introduces paid features in the future,</strong> they will:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>Never be required for core learning functionality</li>
                  <li>Require explicit parental/guardian consent for users under 18</li>
                  <li>Be clearly communicated in advance with updated Terms</li>
                  <li>Comply with all applicable consumer protection laws</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Child Safety Measures</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li><strong>No social features:</strong> There is no chat, messaging, friend lists, following, or any form of communication between users. LangWorld is a single-player experience.</li>
              <li><strong>No user profiles visible to others:</strong> Leaderboards show display names only (chosen by the child), with no personally identifiable information.</li>
              <li><strong>No external links within the game:</strong> The game interface does not link to external websites, app stores, or social media. Links exist only on the landing page and legal pages.</li>
              <li><strong>No push notifications:</strong> LangWorld does not send push notifications, emails, or any form of outreach to children.</li>
              <li><strong>No camera or microphone storage:</strong> Microphone is used only for real-time speech recognition (processed locally by the browser). No audio is recorded, stored, or transmitted.</li>
              <li><strong>Simple account creation:</strong> Children can play without any account. Optional accounts require only a display name and 4-digit PIN — no email, phone, or personal data.</li>
              <li><strong>Parent/Guardian accounts:</strong> Adults can create accounts with email to monitor their child&apos;s progress.</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Parental Consent and COPPA Compliance</h2>
            <p>LangWorld is designed to comply with the Children&apos;s Online Privacy Protection Act (COPPA) and similar international regulations:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-3">
              <li>We do not knowingly collect personal information from children under 13 without parental consent.</li>
              <li>Kid accounts collect only a display name (not a real name) and a 4-digit PIN.</li>
              <li>No email or contact information is collected from children.</li>
              <li>Parents can review their child&apos;s game progress by creating a parent account.</li>
              <li>Parents can request complete deletion of their child&apos;s data at any time by contacting us.</li>
              <li>If we discover that we have inadvertently collected personal information from a child without parental consent, we will delete it immediately.</li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Acceptable Use</h2>
            <p>When using LangWorld, you agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
              <li>Attempt to manipulate AI conversations to generate inappropriate content</li>
              <li>Use automated tools or bots to interact with the service</li>
              <li>Attempt to access other users&apos; data or accounts</li>
              <li>Reverse engineer, decompile, or attempt to extract source code</li>
              <li>Use the service for any purpose other than language learning</li>
              <li>Misrepresent your identity or create accounts for fraudulent purposes</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Intellectual Property</h2>
            <p>All content in LangWorld is owned by LangWorld or used under appropriate licenses:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 mt-2">
              <li><strong>Original content:</strong> All 3D world maps, game mechanics, NPC personalities, educational content, vocabulary databases, and code are original works owned by LangWorld.</li>
              <li><strong>AI-generated content:</strong> NPC dialogue is generated in real-time by AI (Anthropic Claude). Per Anthropic&apos;s terms, outputs generated through their API are not claimed by Anthropic.</li>
              <li><strong>Audio:</strong> Generated via Google Cloud Text-to-Speech under standard commercial terms.</li>
              <li><strong>3D Avatar:</strong> Currently uses a Ready Player Me generated avatar (free tier). Plans to transition to a fully custom character.</li>
              <li><strong>Open source:</strong> LangWorld uses open source libraries (React, Next.js, Three.js, etc.) under their respective MIT/Apache licenses.</li>
            </ul>
            <p className="mt-2">You may not copy, reproduce, distribute, or create derivative works from LangWorld&apos;s content, design, or code without written permission.</p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. AI Conversations — Limitations and Disclaimers</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>AI-powered NPC conversations are designed for language practice and education. They are not a substitute for professional language instruction.</li>
              <li>AI responses are generated in real-time and may occasionally contain minor grammatical imperfections or unexpected phrasing. This does not affect the educational value of the interaction.</li>
              <li>AI characters may provide general knowledge responses (encyclopedia mode) but these should not be relied upon as authoritative sources for academic, medical, legal, or safety-critical information.</li>
              <li>While we implement strict content safety measures, AI is inherently probabilistic. If you encounter any inappropriate AI response, please report it to us immediately.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Service Availability</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>LangWorld is provided &quot;as is&quot; without guarantees of uninterrupted availability.</li>
              <li>The app works offline for most features (cached via Service Worker). AI conversations and cloud sync require an internet connection.</li>
              <li>We may update, modify, or discontinue features at any time. Core learning functionality will always remain free.</li>
              <li>We reserve the right to suspend accounts that violate these terms.</li>
            </ul>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Limitation of Liability</h2>
            <p className="text-slate-400">
              LangWorld is an educational game provided free of charge. To the maximum extent permitted by law, LangWorld and its creators shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of the service. This includes but is not limited to: learning outcomes, device compatibility issues, data loss due to browser cache clearing, or AI response quality.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Changes to These Terms</h2>
            <p className="text-slate-400">
              We may update these Terms &amp; Conditions from time to time. When we make significant changes — especially changes affecting children&apos;s rights, data practices, or monetization — we will:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2">
              <li>Update the &quot;Last updated&quot; date at the top</li>
              <li>Display a notice within the application</li>
              <li>Allow 30 days before changes take effect for existing users</li>
            </ul>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Governing Law</h2>
            <p className="text-slate-400">
              These Terms shall be governed by and construed in accordance with the laws of the European Union, including GDPR and the Digital Services Act. For users in the United States, COPPA and applicable state laws (including CCPA for California residents) also apply.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Contact</h2>
            <p>For questions about these Terms, to report inappropriate content, or to request data deletion:</p>
            <p className="mt-2 text-white font-medium">Email: legal@langworld.app</p>
            <p className="mt-1 text-slate-400">We aim to respond to all inquiries within 30 days. For child safety concerns, we respond within 48 hours.</p>
          </section>

          {/* Summary */}
          <section className="mt-12 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
            <h2 className="text-lg font-semibold text-white mb-3">TL;DR — Our Promises</h2>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>&#10003; All content is safe and appropriate for children ages 7+.</li>
              <li>&#10003; We will never charge children money or ask for payment info.</li>
              <li>&#10003; No ads. No in-app purchases. No paywalls. No subscriptions.</li>
              <li>&#10003; No social features — kids can&apos;t message or interact with strangers.</li>
              <li>&#10003; No personal data required — play without an account, or use just a name + PIN.</li>
              <li>&#10003; Microphone is used locally only — no recordings stored or transmitted.</li>
              <li>&#10003; AI conversations are strictly filtered for child safety.</li>
              <li>&#10003; Parents can review progress and request data deletion anytime.</li>
              <li>&#10003; If we ever add paid features, parental consent will be required for under-18s.</li>
              <li>&#10003; Core learning features will always be free.</li>
            </ul>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-xs text-slate-600 flex justify-center gap-6">
          <a href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
          <span>|</span>
          <a href="/landing" className="hover:text-slate-400 transition-colors">Back to LangWorld</a>
        </div>
      </div>
    </div>
  );
}
