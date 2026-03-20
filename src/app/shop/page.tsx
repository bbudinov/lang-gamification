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

export default function ShopPage() {
  const router = useRouter();
  const { coins, ownedItems, equippedTitle, pet, buyItem, addCoins, addPoints, equipTitle, hatchPet } =
    useProgressStore();
  const { updateProfile } = useAuthStore();
  const [tab, setTab] = useState<ShopCategory>("avatars");
  const [mysteryResult, setMysteryResult] = useState<MysteryReward | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);
  const [factItem, setFactItem] = useState<ShopItem | null>(null);
  const { targetLanguage } = useProgressStore();

  const items = SHOP_ITEMS.filter((i) => i.category === tab);

  const handleBuy = (item: ShopItem) => {
    if (item.category === "mystery") {
      if (coins < item.price) return;
      // Spend coins manually for consumable
      const spent = useProgressStore.getState().spendCoins(item.price);
      if (!spent) return;

      const reward = rollMysteryBox(ownedItems);
      if (reward.type === "coins" && reward.amount) addCoins(reward.amount);
      if (reward.type === "xp" && reward.amount) addPoints(reward.amount);
      if (reward.type === "avatar" && reward.itemId) {
        // Add avatar to owned without charging again
        useProgressStore.setState((s) => ({ ownedItems: [...s.ownedItems, reward.itemId!] }));
      }
      setMysteryResult(reward);
      return;
    }

    // Pet egg — special handling
    if (item.id === "pet-egg") {
      if (pet) return; // already have a pet
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
          <h1 className="text-white font-bold text-lg">Shop</h1>
          <div className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1.5">
            <span className="text-yellow-300 text-xs">🪙</span>
            <span className="text-white text-xs font-bold">{coins}</span>
          </div>
        </div>
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
              const isEquipped =
                item.category === "titles" && equippedTitle === item.id;
              const canAfford = coins >= item.price;

              return (
                <div
                  key={item.id}
                  className={`bg-white/5 rounded-2xl p-3 text-center space-y-2 transition-all ${
                    justBought === item.id ? "ring-2 ring-green-400 scale-105" : ""
                  }`}
                >
                  <div className="text-4xl select-none">{item.emoji}</div>
                  <p
                    className="text-white text-sm font-medium select-none cursor-pointer underline decoration-dotted decoration-white/30 underline-offset-2 active:text-blue-300 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setFactItem(item); }}
                  >
                    {item.name} <span className="text-[10px] opacity-50">ℹ️</span>
                  </p>

                  {owned ? (
                    <button
                      onClick={() =>
                        item.category === "avatars"
                          ? handleEquipAvatar(item)
                          : handleEquipTitle(item)
                      }
                      className={`w-full py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        isEquipped
                          ? "bg-green-600/30 text-green-400 border border-green-500/30"
                          : "bg-white/10 text-slate-300 active:bg-white/20"
                      }`}
                    >
                      {isEquipped ? "Equipped" : "Use"}
                    </button>
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

  return (
    <div className="bg-gradient-to-b from-purple-900/30 to-purple-900/10 border border-purple-500/20 rounded-2xl p-6 text-center space-y-4">
      <div className="text-7xl" style={{ animation: "mystery-wobble 2s ease-in-out infinite" }}>
        🎁
      </div>
      <h3 className="text-white text-lg font-bold">Mystery Box</h3>
      <p className="text-slate-400 text-sm">
        Open for a random reward: coins, XP, or a rare avatar!
      </p>
      <button
        onClick={() => onBuy(item)}
        disabled={!canAfford}
        className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${
          canAfford
            ? "bg-purple-600 text-white active:bg-purple-700 active:scale-95"
            : "bg-white/5 text-slate-600 cursor-not-allowed"
        }`}
      >
        🪙 {item.price} — Open!
      </button>

      <style jsx>{`
        @keyframes mystery-wobble {
          0%, 100% { transform: rotate(-3deg) scale(1); }
          50% { transform: rotate(3deg) scale(1.05); }
        }
      `}</style>
    </div>
  );
}

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

    return (
      <div className="bg-gradient-to-b from-green-900/30 to-green-900/10 border border-green-500/20 rounded-2xl p-6 text-center space-y-4">
        <div className="text-7xl" style={{ animation: "pet-bounce 1.5s ease-in-out infinite" }}>
          {PET_STAGES[pet.stage]}
        </div>
        <h3 className="text-white text-lg font-bold">{PET_STAGE_NAMES[pet.stage]}</h3>
        <p className="text-slate-400 text-sm">{pet.gamesPlayed} games played</p>
        {nextThreshold && (
          <p className="text-blue-400 text-xs">
            Next evolution: {PET_STAGE_NAMES[pet.stage + 1]} at {nextThreshold} games
          </p>
        )}
        {pet.stage === 3 && (
          <p className="text-green-400 text-xs font-medium">Fully evolved!</p>
        )}

        <style jsx>{`
          @keyframes pet-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-amber-900/30 to-amber-900/10 border border-amber-500/20 rounded-2xl p-6 text-center space-y-4">
      <div className="text-7xl" style={{ animation: "egg-wobble 2s ease-in-out infinite" }}>
        🥚
      </div>
      <h3 className="text-white text-lg font-bold">Pet Egg</h3>
      <p className="text-slate-400 text-sm">
        Adopt a pet! Play games and watch it evolve.
      </p>
      <p className="text-slate-500 text-xs">🥚 → 🐣 (1 game) → 🐲 (10 games) → 🐉 (30 games)</p>
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
  );
}
