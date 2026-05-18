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

export function pickWordChoices(count: number, exclude: Set<string> = new Set()): string[] {
  const pool = ALL_WORDS.filter((w) => !exclude.has(w));
  const choices: string[] = [];
  const seen = new Set<string>();
  while (choices.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const word = pool[idx];
    if (word && !seen.has(word)) {
      choices.push(word);
      seen.add(word);
    }
    pool.splice(idx, 1);
  }
  return choices;
}
