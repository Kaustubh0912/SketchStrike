type Category = 'gaming' | 'anime' | 'food' | 'animals' | 'internet' | 'movies';

const WORDS: Record<Category, string[]> = {
  gaming: [
    'minecraft', 'fortnite', 'mario', 'zelda', 'pokemon', 'sonic',
    'kirby', 'tetris', 'pacman', 'overwatch', 'valorant', 'roblox',
    'controller', 'joystick', 'speedrun', 'boss fight', 'respawn',
  ],
  anime: [
    'naruto', 'goku', 'pikachu', 'luffy', 'levi', 'gojo',
    'eren', 'asuna', 'sailor moon', 'totoro', 'spirited away',
  ],
  food: [
    'pizza', 'burger', 'sushi', 'taco', 'ramen', 'donut',
    'pancake', 'waffle', 'ice cream', 'sandwich', 'spaghetti',
    'cupcake', 'pretzel', 'popcorn', 'avocado', 'watermelon',
  ],
  animals: [
    'penguin', 'octopus', 'giraffe', 'elephant', 'dolphin', 'kangaroo',
    'panda', 'koala', 'flamingo', 'butterfly', 'hedgehog', 'platypus',
    'narwhal', 'sloth', 'raccoon', 'jellyfish', 'chameleon',
  ],
  internet: [
    'meme', 'tweet', 'wifi', 'emoji', 'hashtag', 'podcast',
    'streaming', 'firewall', 'browser', 'download', 'bluetooth',
  ],
  movies: [
    'titanic', 'avatar', 'inception', 'shrek', 'frozen', 'matrix',
    'jaws', 'gladiator', 'rocky', 'joker', 'batman', 'spiderman',
  ],
};

const ALL_WORDS = Object.values(WORDS).flat();

export interface PickWordOptions {
  customPool?: string[];
  exclude?: Set<string>;
}

export function pickWordChoices(count: number, options: PickWordOptions = {}): string[] {
  const customPool = options.customPool ?? [];
  // Use the host's bank only when it has enough words to cover the choice count.
  // With fewer than `count` words we fall back to the default bank rather than
  // returning a short list (the drawer would have nothing to pick from).
  const useCustom = customPool.length >= count;
  const sourcePool = useCustom ? customPool : ALL_WORDS;
  const exclude = options.exclude ?? new Set<string>();

  let pool = sourcePool.filter((w) => !exclude.has(w));
  if (pool.length < count) pool = [...sourcePool];

  const choices: string[] = [];
  while (choices.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const [picked] = pool.splice(idx, 1);
    if (picked) choices.push(picked);
  }
  return choices;
}
