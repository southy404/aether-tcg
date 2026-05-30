

export interface FrameItem {
  id: string;
  name: string;
  price: number;
  className: string;
  particleEffect?: string;
  previewSize?: number;
  glowColor?: string;
  shine?: boolean;
}

export interface PlaymatItem {
  id: string;
  name: string;
  price: number;
  img: string; // for the shop/customize preview
  className: string; // to apply to the gameboard
  hint?: string;
}

export const cosmeticItems = {
  avatars: [
    { id: 'avatar_0', name: 'Aether Geist', price: 0, img: '/avatar/spirit.jpg', hint: 'aether spirit' },
    { id: 'avatar_10', name: 'Cyber-Wächter', price: 150, img: '/avatar/robot.jpg', hint: 'cybernetic guard' },
  ],
  cardBacks: [
    { id: 'sleeve_0', name: 'Standard', price: 0, img: '/card-back-logo.jpg?v=3', hint: 'standard card back' },
    { id: 'sleeve_tinkerer', name: 'Tinkerer Bob', price: 200, img: '/cosmetics/sleeve/tinkerer-bob.jpg', hint: 'tinkerer bob' },
  ],
  coins: [
    { id: 'coin_1', name: 'Standard-Münze', price: 0, imgHead: '/coins/coin-1.jpg', imgTail: '/coins/coin-1.jpg', hint: 'standard gold coin' },
  ],
  frames: [
    { id: 'frame_1', name: 'Standard-Rahmen', price: 0, className: 'f-silver' },
    { id: 'frame_aether', name: 'Sovereign', price: 1500, className: 'f-aether', particleEffect: 'aether-dots', previewSize: 250, glowColor: '#3b82f6', shine: true },
    { id: 'frame_gold', name: 'Exalted', price: 1200, className: 'f-gold', previewSize: 250, glowColor: '#fde047', shine: true },
    { id: 'frame_fire', name: 'Inferno', price: 1500, className: 'f-fire', particleEffect: 'fire-dots', previewSize: 280, glowColor: '#ef4444', shine: false },
    { id: 'frame_void', name: 'Void', price: 1500, className: 'f-void', particleEffect: 'void-dots', previewSize: 280, glowColor: '#a855f7', shine: true },
    { id: 'frame_nature', name: 'Emerald', price: 1000, className: 'f-nature', particleEffect: 'nature-dots', previewSize: 250, glowColor: '#34d399', shine: false },
    { id: 'frame_celestial', name: 'Celestial', price: 1500, className: 'f-celestial', previewSize: 250, glowColor: '#ffffff', shine: true },
    { id: 'frame_tech', name: 'Neural', price: 1200, className: 'f-tech', previewSize: 250, glowColor: '#22d3ee', shine: true },
    { id: 'frame_silver', name: 'Veteran', price: 800, className: 'f-silver', previewSize: 250 },
    { id: 'frame_crimson', name: 'Crimson', price: 800, className: 'f-crimson', previewSize: 250 },
    { id: 'frame_obsidian', name: 'Obsidian', price: 700, className: 'f-obsidian', previewSize: 250 },
  ] as FrameItem[],
  effects: [
    { id: 'effect_1', name: 'Kein Effekt', price: 0, img: '', hint: 'no effect' },
    { id: 'effect_2', name: 'Lodernde Aura', price: 1000, img: '', hint: 'flaming aura gif' },
    { id: 'effect_3', name: 'Kosmischer Nebel', price: 1000, img: '', hint: 'cosmic nebula gif' }
  ],
  playmats: [
    { id: 'playmat_1', name: 'Aether Void', price: 0, img: '/cosmetics/playmat/playmat-void.jpg', className: 'playmat-standard', hint: 'aether void battlefield' },
    { id: 'playmat_2', name: 'Infernal Rift', price: 500, img: '/cosmetics/playmat/playmat-fire.jpg', className: 'playmat-inferno', hint: 'infernal rift battlefield' },
    { id: 'playmat_3', name: 'Frozen Sanctum', price: 500, img: '/cosmetics/playmat/playmat-frozen.jpg', className: 'playmat-deepsea', hint: 'frozen sanctum battlefield' },
    { id: 'playmat_4', name: 'Void Market Plaza', price: 500, img: '/cosmetics/playmat/playmat-plaza.jpg', className: 'playmat-sky-temple', hint: 'void market plaza battlefield' },
  ] as PlaymatItem[],
};

export type CosmeticType = 'avatar' | 'cardBack' | 'coin' | 'frame' | 'effect' | 'playmat';
export type AvatarItem = typeof cosmeticItems.avatars[0];
export type CardBackItem = typeof cosmeticItems.cardBacks[0];
export type CoinItem = typeof cosmeticItems.coins[0];
export type EffectItem = typeof cosmeticItems.effects[0];


export type CosmeticItem = AvatarItem | CardBackItem | CoinItem | FrameItem | EffectItem | PlaymatItem;
