"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProgressStore } from "@/stores/progressStore";
import { useAuthStore } from "@/stores/authStore";
import { SHOP_ITEMS, rollMysteryBox, type ShopCategory, type ShopItem, type MysteryReward } from "@/data/shop";

const TABS: { key: ShopCategory; emoji: string; label: string }[] = [
  { key: "avatars", emoji: "🧑", label: "Avatars" },
  { key: "titles", emoji: "🎖", label: "Titles" },
  { key: "pets", emoji: "🐣", label: "Pets" },
  { key: "mystery", emoji: "🎁", label: "Mystery" },
];

const AVATAR_FACTS: Record<string, Record<string, string>> = {
  Dragon:    { en: "Dragons appear in myths across every continent!", bg: "Драконите се срещат в митовете на всеки континент!", es: "¡Los dragones aparecen en mitos de todos los continentes!" },
  Shark:     { en: "Sharks have been around for over 400 million years!", bg: "Акулите съществуват от над 400 милиона години!", es: "¡Los tiburones existen desde hace más de 400 millones de años!" },
  Eagle:     { en: "Eagles can spot a rabbit from over 3 km away!", bg: "Орлите могат да забележат заек от над 3 км!", es: "¡Las águilas pueden ver un conejo a más de 3 km!" },
  Dinosaur:  { en: "The word 'dinosaur' means 'terrible lizard' in Greek!", bg: "Думата 'динозавър' означава 'ужасен гущер' на гръцки!", es: "¡La palabra 'dinosaurio' significa 'lagarto terrible' en griego!" },
  Wolf:      { en: "Wolves can hear sounds up to 10 km away!", bg: "Вълците могат да чуят звуци на до 10 км!", es: "¡Los lobos pueden oír sonidos a hasta 10 km!" },
  Peacock:   { en: "Only male peacocks have the colorful tail feathers!", bg: "Само мъжките паунове имат цветните пера!", es: "¡Solo los pavos reales machos tienen las plumas coloridas!" },
  Parrot:    { en: "Parrots can learn over 100 words in human languages!", bg: "Папагалите могат да научат над 100 думи на човешки езици!", es: "¡Los loros pueden aprender más de 100 palabras en idiomas humanos!" },
  Flamingo:  { en: "Flamingos are pink because of the shrimp they eat!", bg: "Фламингите са розови заради скаридите, които ядат!", es: "¡Los flamencos son rosas por los camarones que comen!" },
  Octopus:   { en: "Octopuses have three hearts and blue blood!", bg: "Октоподите имат три сърца и синя кръв!", es: "¡Los pulpos tienen tres corazones y sangre azul!" },
  Unicorn:   { en: "The unicorn is Scotland's national animal!", bg: "Еднорогът е националното животно на Шотландия!", es: "¡El unicornio es el animal nacional de Escocia!" },
};

/* --- Flavor data for avatars --- */
const AVATAR_FLAVOR: Record<string, { subtitle: string; rarity: "Common" | "Rare" | "Epic" | "Legendary" }> = {
  "avatar-dragon":   { subtitle: "Ancient fire-breather of legend", rarity: "Legendary" },
  "avatar-shark":    { subtitle: "Silent hunter of the deep", rarity: "Epic" },
  "avatar-eagle":    { subtitle: "Majestic ruler of the skies", rarity: "Epic" },
  "avatar-dino":     { subtitle: "Prehistoric powerhouse", rarity: "Legendary" },
  "avatar-wolf":     { subtitle: "Fearless pack leader", rarity: "Epic" },
  "avatar-peacock":  { subtitle: "Dazzling show-off of the jungle", rarity: "Legendary" },
  "avatar-parrot":   { subtitle: "Chatty tropical companion", rarity: "Common" },
  "avatar-flamingo": { subtitle: "Elegant pink dancer", rarity: "Common" },
  "avatar-octopus":  { subtitle: "Eight-armed genius of the sea", rarity: "Epic" },
  "avatar-unicorn":  { subtitle: "Mythical sparkle guardian", rarity: "Legendary" },
};

/* --- Flavor data for titles --- */
const TITLE_FLAVOR: Record<string, { subtitle: string; badge?: string }> = {
  "title-wizard":    { subtitle: "For puzzle masters who bend words to their will" },
  "title-hero":      { subtitle: "For dedicated learners who never give up", badge: "Popular" },
  "title-star":      { subtitle: "For collectors who catch every shining star" },
  "title-explorer":  { subtitle: "For brave adventurers of new worlds" },
  "title-champion":  { subtitle: "For those who rise above all others", badge: "Best Value" },
  "title-ninja":     { subtitle: "For stealthy word warriors" },
};

const RARITY_COLORS: Record<string, string> = {
  Common:    "text-slate-400 bg-slate-400/10 border-slate-400/20",
  Rare:      "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Epic:      "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Legendary: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

export default function ShopPage() {
  const router = useRouter();
  const { coins, ownedItems, equippedTitle, pet, buyItem, addCoins, addPoints, equipTitle, hatchPet } =
    useProgressStore();
  const { profile, updateProfile } = useAuthStore();
  const [tab, setTab] = useState<ShopCategory>("avatars");
  const [mysteryResult, setMysteryResult] = useState<MysteryReward | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);
  const [factItem, setFactItem] = useState<ShopItem | null>(null);
  const { targetLanguage } = useProgressStore();

  const items = SHOP_ITEMS.filter((i) => i.category === tab);

  const currentAvatarEmoji = profile?.avatar_emoji || "🧑";

  const handleBuy = (item: ShopItem) => {
    if (item.category === "mystery") {
      if (coins < item.price) return;
      const spent = useProgressStore.getState().spendCoins(item.price);
      if (!spent) return;

      const reward = rollMysteryBox(ownedItems);
      if (reward.type === "coins" && reward.amount) addCoins(reward.amount);
      if (reward.type === "xp" && reward.amount) addPoints(reward.amount);
      if (reward.type === "avatar" && reward.itemId) {
        useProgressStore.setState((s) => ({ ownedItems: [...s.ownedItems, reward.itemId!] }));
      }
      setMysteryResult(reward);
      return;
    }

    if (item.id === "pet-egg") {
      if (pet) return;
      const success = buyItem(item.id, item.price);
      if (success) {
        hatchPet();
        setJustBought(item.id);
        setTimeout(() => setJustBought(null), 1500);
      }
      return;
    }

    const success = buyItem(item.id, item.price);
    if (success) {
      setJustBought(item.id);
      setTimeout(() => setJustBought(null), 1500);
    }
  };

  const handleEquipAvatar = (item: ShopItem) => {
    if (!ownedItems.includes(item.id)) return;
    updateProfile({ avatar_emoji: item.emoji });
  };

  const handleEquipTitle = (item: ShopItem) => {
    if (!ownedItems.includes(item.id)) return;
    const newTitle = equippedTitle === item.id ? "" : item.id;
    equipTitle(newTitle);
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <div className="safe-area">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push("/map")}
            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 active:bg-white/20 transition-colors"
          >
            <span className="text-white text-sm">&larr; Map</span>
          </button>
          <div className="text-center">
            <h1 className="text-white font-bold text-lg">Shop</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/25 rounded-full px-3 py-1.5">
            <span className="text-yellow-300 text-base">🪙</span>
            <span className="text-amber-300 text-sm font-bold">{coins}</span>
          </div>
        </div>
        <p className="text-slate-500 text-xs text-center pb-2 -mt-1">
          Earn coins by completing games and achievements
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setMysteryResult(null); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-slate-400 active:bg-white/10"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Avatar Fun Fact popup */}
      {factItem && AVATAR_FACTS[factItem.name] && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6"
          onClick={() => setFactItem(null)}
        >
          <div
            className="bg-[#0f1d32] border border-white/10 rounded-2xl p-5 text-center space-y-3 max-w-xs w-full animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl">{factItem.emoji}</div>
            <h3 className="text-white text-lg font-bold">{factItem.name}</h3>
            <p className="text-blue-300 text-sm leading-relaxed">
              {AVATAR_FACTS[factItem.name][targetLanguage] || AVATAR_FACTS[factItem.name].en}
            </p>
            <button
              onClick={() => setFactItem(null)}
              className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-medium active:bg-blue-700 transition-colors"
            >
              Cool! 😎
            </button>
          </div>
        </div>
      )}

      {/* Mystery Box result overlay */}
      {mysteryResult && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-[#0f1d32] border border-white/10 rounded-2xl p-6 text-center space-y-4 max-w-xs w-full animate-in zoom-in duration-300">
            <div className="text-6xl">{mysteryResult.emoji}</div>
            <h3 className="text-white text-xl font-bold">You got:</h3>
            <p className="text-amber-400 text-lg font-semibold">{mysteryResult.label}</p>
            <button
              onClick={() => setMysteryResult(null)}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium active:bg-blue-700 transition-colors"
            >
              Nice!
            </button>
          </div>
        </div>
      )}

      {/* Items grid */}
      <div className="px-4 pb-8">
        {tab === "pets" ? (
          <PetEggCard
            item={SHOP_ITEMS.find((i) => i.id === "pet-egg")!}
            coins={coins}
            pet={pet}
            onBuy={handleBuy}
          />
        ) : tab === "mystery" ? (
          <MysteryBoxCard
            item={SHOP_ITEMS.find((i) => i.id === "mystery-box")!}
            coins={coins}
            onBuy={handleBuy}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => {
              const owned = ownedItems.includes(item.id);
              const isEquippedTitle = item.category === "titles" && equippedTitle === item.id;
              const isEquippedAvatar = item.category === "avatars" && currentAvatarEmoji === item.emoji;
              const isEquipped = isEquippedTitle || isEquippedAvatar;
              const canAfford = coins >= item.price;
              const flavor = item.category === "avatars" ? AVATAR_FLAVOR[item.id] : null;
              const titleFlavor = item.category === "titles" ? TITLE_FLAVOR[item.id] : null;
              const subtitle = flavor?.subtitle || titleFlavor?.subtitle || "";
              const rarity = flavor?.rarity;
              const badgeLabel = titleFlavor?.badge;

              return (
                <div
                  key={item.id}
                  className={`relative bg-white/5 rounded-2xl p-3 text-center space-y-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                    justBought === item.id ? "ring-2 ring-green-400 scale-105" : ""
                  } ${isEquipped ? "ring-1 ring-green-500/40" : ""}`}
                >
                  {/* Rarity label */}
                  {rarity && (
                    <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${RARITY_COLORS[rarity]}`}>
                      {rarity}
                    </span>
                  )}
                  {/* Badge label (Popular / Best Value) */}
                  {badgeLabel && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                      {badgeLabel}
                    </span>
                  )}

                  <div className="text-4xl select-none pt-1">{item.emoji}</div>
                  <p
                    className="text-white text-sm font-medium select-none cursor-pointer underline decoration-dotted decoration-white/30 underline-offset-2 active:text-blue-300 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setFactItem(item); }}
                  >
                    {item.name} <span className="text-[10px] opacity-50">ℹ️</span>
                  </p>
                  {subtitle && (
                    <p className="text-slate-500 text-[10px] leading-tight px-1">{subtitle}</p>
                  )}

                  {/* Status badge + action */}
                  {owned ? (
                    <>
                      {isEquipped ? (
                        <div className="w-full py-1.5 rounded-xl text-xs font-medium bg-green-600/30 text-green-400 border border-green-500/30">
                          Equipped ⚡
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            item.category === "avatars"
                              ? handleEquipAvatar(item)
                              : handleEquipTitle(item)
                          }
                          className="w-full py-1.5 rounded-xl text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 active:bg-blue-500/30 transition-colors"
                        >
                          Equip
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford}
                      className={`w-full py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        canAfford
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 active:bg-amber-500/30"
                          : "bg-white/5 text-slate-600 cursor-not-allowed"
                      }`}
                    >
                      🪙 {item.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Mystery Box Card ---- */

function MysteryBoxCard({
  item,
  coins,
  onBuy,
}: {
  item: ShopItem;
  coins: number;
  onBuy: (item: ShopItem) => void;
}) {
  const canAfford = coins >= item.price;
  const [opening, setOpening] = useState(false);

  const handleOpen = () => {
    if (!canAfford || opening) return;
    setOpening(true);
    setTimeout(() => {
      setOpening(false);
      onBuy(item);
    }, 800);
  };

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-b from-purple-900/30 to-purple-900/10 border border-purple-500/20 rounded-2xl p-6 text-center space-y-4">
        <div
          className="text-7xl"
          style={{
            animation: opening ? "mystery-shake 0.15s ease-in-out infinite" : "mystery-wobble 2s ease-in-out infinite",
          }}
        >
          {opening ? "✨" : "🎁"}
        </div>
        <h3 className="text-white text-lg font-bold">Mystery Box</h3>
        <p className="text-slate-400 text-sm">
          {opening ? "Opening..." : "Open for a random reward: coins, XP, or a rare avatar!"}
        </p>
        <button
          onClick={handleOpen}
          disabled={!canAfford || opening}
          className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${
            opening
              ? "bg-purple-500 text-white animate-pulse"
              : canAfford
                ? "bg-purple-600 text-white active:bg-purple-700 active:scale-95"
                : "bg-white/5 text-slate-600 cursor-not-allowed"
          }`}
        >
          {opening ? "Opening... ✨" : "Open Mystery Box 🎁  ·  🪙 " + item.price}
        </button>

        <style jsx>{`
          @keyframes mystery-wobble {
            0%, 100% { transform: rotate(-3deg) scale(1); }
            50% { transform: rotate(3deg) scale(1.05); }
          }
          @keyframes mystery-shake {
            0%, 100% { transform: rotate(-8deg) scale(1.1); }
            50% { transform: rotate(8deg) scale(1.1); }
          }
        `}</style>
      </div>

      {/* Possible Rewards section */}
      <div className="bg-white/5 rounded-2xl p-4 space-y-3">
        <h4 className="text-white text-sm font-semibold text-center">Possible Rewards</h4>
        <div className="space-y-2">
          <RewardChance color="text-slate-400" bg="bg-slate-400/10" label="Common" chance="60%" desc="10-30 coins or 20-40 XP" />
          <RewardChance color="text-blue-400" bg="bg-blue-400/10" label="Rare" chance="25%" desc="50 coins or 50 XP" />
          <RewardChance color="text-purple-400" bg="bg-purple-400/10" label="Epic" chance="10%" desc="80 coins or rare avatar" />
          <RewardChance color="text-amber-400" bg="bg-amber-400/10" label="Legendary" chance="5%" desc="Avatar you don't own yet!" />
        </div>
      </div>
    </div>
  );
}

function RewardChance({ color, bg, label, chance, desc }: { color: string; bg: string; label: string; chance: string; desc: string }) {
  return (
    <div className={`flex items-center justify-between ${bg} rounded-xl px-3 py-2`}>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase ${color}`}>{label}</span>
        <span className="text-slate-400 text-xs">{desc}</span>
      </div>
      <span className={`text-xs font-bold ${color}`}>{chance}</span>
    </div>
  );
}

/* ---- Pet Egg Card ---- */

const PET_STAGES = ["🥚", "🐣", "🐲", "🐉"] as const;
const PET_STAGE_NAMES = ["Egg", "Baby Dragon", "Young Dragon", "Dragon"] as const;
const NEXT_STAGE_AT = [1, 10, 30] as const;

function PetEggCard({
  item,
  coins,
  pet,
  onBuy,
}: {
  item: ShopItem;
  coins: number;
  pet: { active: boolean; stage: 0 | 1 | 2 | 3; gamesPlayed: number } | null;
  onBuy: (item: ShopItem) => void;
}) {
  const canAfford = coins >= item.price;

  if (pet) {
    const nextThreshold = pet.stage < 3 ? NEXT_STAGE_AT[pet.stage as 0 | 1 | 2] : null;
    const prevThreshold = pet.stage > 0 ? NEXT_STAGE_AT[(pet.stage - 1) as 0 | 1 | 2] : 0;
    const progressPct = nextThreshold
      ? Math.min(100, ((pet.gamesPlayed - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
      : 100;

    return (
      <div className="space-y-5">
        <div className="bg-gradient-to-b from-green-900/30 to-green-900/10 border border-green-500/20 rounded-2xl p-6 text-center space-y-4">
          <div className="text-7xl" style={{ animation: "pet-bounce 1.5s ease-in-out infinite" }}>
            {PET_STAGES[pet.stage]}
          </div>
          <h3 className="text-white text-lg font-bold">{PET_STAGE_NAMES[pet.stage]}</h3>
          <p className="text-emerald-400/70 text-xs">Your pet grows as you play!</p>
          <p className="text-slate-400 text-sm">{pet.gamesPlayed} games played</p>

          {/* Progress bar to next stage */}
          {nextThreshold && (
            <div className="space-y-1.5 px-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Progress to {PET_STAGE_NAMES[pet.stage + 1]}</span>
                <span className="text-blue-400">{pet.gamesPlayed}/{nextThreshold} games</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {pet.stage === 3 && (
            <p className="text-green-400 text-xs font-medium">Fully evolved! 🎉</p>
          )}

          <style jsx>{`
            @keyframes pet-bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
        </div>

        {/* Evolution path */}
        <div className="bg-white/5 rounded-2xl p-4 space-y-3">
          <h4 className="text-white text-sm font-semibold text-center">Evolution Path</h4>
          <div className="flex items-center justify-center gap-1">
            {PET_STAGES.map((emoji, i) => {
              const isActive = pet.stage >= i;
              const isCurrent = pet.stage === i;
              return (
                <div key={i} className="flex items-center gap-1">
                  <div className={`flex flex-col items-center ${isCurrent ? "scale-110" : ""} transition-transform`}>
                    <span className={`text-2xl ${isActive ? "" : "opacity-30 grayscale"}`}>{emoji}</span>
                    <span className={`text-[9px] mt-0.5 ${isCurrent ? "text-green-400 font-bold" : isActive ? "text-slate-400" : "text-slate-600"}`}>
                      {PET_STAGE_NAMES[i]}
                    </span>
                    {i > 0 && (
                      <span className={`text-[8px] ${isActive ? "text-slate-500" : "text-slate-700"}`}>
                        {NEXT_STAGE_AT[(i - 1) as 0 | 1 | 2]} games
                      </span>
                    )}
                  </div>
                  {i < PET_STAGES.length - 1 && (
                    <span className={`text-xs mx-0.5 ${pet.stage > i ? "text-green-500" : "text-slate-700"}`}>→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-b from-amber-900/30 to-amber-900/10 border border-amber-500/20 rounded-2xl p-6 text-center space-y-4">
        <div className="text-7xl" style={{ animation: "egg-wobble 2s ease-in-out infinite" }}>
          🥚
        </div>
        <h3 className="text-white text-lg font-bold">Pet Egg</h3>
        <p className="text-amber-400/70 text-xs">Your pet grows as you play!</p>
        <p className="text-slate-400 text-sm">
          Adopt a pet! Play games and watch it evolve.
        </p>
        <button
          onClick={() => onBuy(item)}
          disabled={!canAfford}
          className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${
            canAfford
              ? "bg-amber-600 text-white active:bg-amber-700 active:scale-95"
              : "bg-white/5 text-slate-600 cursor-not-allowed"
          }`}
        >
          🪙 {item.price} — Adopt!
        </button>

        <style jsx>{`
          @keyframes egg-wobble {
            0%, 100% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
          }
        `}</style>
      </div>

      {/* Evolution preview */}
      <div className="bg-white/5 rounded-2xl p-4 space-y-3">
        <h4 className="text-white text-sm font-semibold text-center">Evolution Path</h4>
        <div className="flex items-center justify-center gap-1">
          {PET_STAGES.map((emoji, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <span className="text-2xl opacity-50">{emoji}</span>
                <span className="text-[9px] text-slate-500 mt-0.5">{PET_STAGE_NAMES[i]}</span>
                {i > 0 && (
                  <span className="text-[8px] text-slate-600">{NEXT_STAGE_AT[(i - 1) as 0 | 1 | 2]} games</span>
                )}
              </div>
              {i < PET_STAGES.length - 1 && (
                <span className="text-xs text-slate-700 mx-0.5">→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
