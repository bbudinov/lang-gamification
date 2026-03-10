export type ShopCategory = "avatars" | "titles" | "mystery" | "pets";

export interface ShopItem {
  id: string;
  category: ShopCategory;
  emoji: string;
  name: string;
  price: number;
  /** For mystery box — not shown in owned items */
  consumable?: boolean;
}

export const SHOP_ITEMS: ShopItem[] = [
  // Premium Avatars (beyond the 12 free ones in profile)
  { id: "avatar-dragon", category: "avatars", emoji: "🐉", name: "Dragon", price: 100 },
  { id: "avatar-shark", category: "avatars", emoji: "🦈", name: "Shark", price: 80 },
  { id: "avatar-eagle", category: "avatars", emoji: "🦅", name: "Eagle", price: 80 },
  { id: "avatar-dino", category: "avatars", emoji: "🦖", name: "Dinosaur", price: 100 },
  { id: "avatar-wolf", category: "avatars", emoji: "🐺", name: "Wolf", price: 80 },
  { id: "avatar-peacock", category: "avatars", emoji: "🦚", name: "Peacock", price: 100 },
  { id: "avatar-parrot", category: "avatars", emoji: "🦜", name: "Parrot", price: 60 },
  { id: "avatar-flamingo", category: "avatars", emoji: "🦩", name: "Flamingo", price: 60 },
  { id: "avatar-octopus", category: "avatars", emoji: "🐙", name: "Octopus", price: 80 },
  { id: "avatar-unicorn", category: "avatars", emoji: "🦄", name: "Unicorn", price: 120 },

  // Title Badges
  { id: "title-wizard", category: "titles", emoji: "🧙", name: "Word Wizard", price: 75 },
  { id: "title-hero", category: "titles", emoji: "🦸", name: "Language Hero", price: 75 },
  { id: "title-star", category: "titles", emoji: "🌟", name: "Star Collector", price: 75 },
  { id: "title-explorer", category: "titles", emoji: "🧭", name: "World Explorer", price: 100 },
  { id: "title-champion", category: "titles", emoji: "🏆", name: "Champion", price: 120 },
  { id: "title-ninja", category: "titles", emoji: "🥷", name: "Word Ninja", price: 100 },

  // Pet Egg
  { id: "pet-egg", category: "pets", emoji: "🥚", name: "Pet Egg", price: 200 },

  // Mystery Box (consumable — can buy multiple times)
  { id: "mystery-box", category: "mystery", emoji: "🎁", name: "Mystery Box", price: 120, consumable: true },
];

/** Possible mystery box rewards */
export interface MysteryReward {
  type: "coins" | "xp" | "avatar";
  amount?: number;
  itemId?: string;
  emoji: string;
  label: string;
}

export function rollMysteryBox(ownedItems: string[]): MysteryReward {
  const roll = Math.random();

  if (roll < 0.4) {
    // 40% — coins (30-80)
    const amount = 30 + Math.floor(Math.random() * 51);
    return { type: "coins", amount, emoji: "🪙", label: `${amount} Coins` };
  }

  if (roll < 0.7) {
    // 30% — XP (20-60)
    const amount = 20 + Math.floor(Math.random() * 41);
    return { type: "xp", amount, emoji: "⭐", label: `${amount} XP` };
  }

  // 30% — random avatar (if any unowned left, otherwise coins)
  const avatarItems = SHOP_ITEMS.filter(
    (i) => i.category === "avatars" && !ownedItems.includes(i.id)
  );
  if (avatarItems.length > 0) {
    const pick = avatarItems[Math.floor(Math.random() * avatarItems.length)];
    return { type: "avatar", itemId: pick.id, emoji: pick.emoji, label: `${pick.emoji} ${pick.name}` };
  }

  // Fallback — coins
  const amount = 50 + Math.floor(Math.random() * 51);
  return { type: "coins", amount, emoji: "🪙", label: `${amount} Coins` };
}
