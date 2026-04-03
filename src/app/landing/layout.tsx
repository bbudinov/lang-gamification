import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LangWorld — Learn Languages by Living in Them",
  description: "16 immersive 3D worlds, 154 AI NPCs, 2290+ words across 6 languages. The future of language learning for kids 7-14.",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
