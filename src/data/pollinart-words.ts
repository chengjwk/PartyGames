// Curated word pools for Pollinart. Three complexity tiers; the lobby
// picker selects a tier and every chain in the round samples its
// starting words from that tier. Word choices for each player are
// drawn without replacement from the active tier so picks feel fresh.
//
// Curation philosophy:
//   - Easy:   concrete, single-noun, kid-drawable in 30s.
//   - Medium: compound nouns, simple actions, mild abstractions —
//             still drawable, but might require a clever metaphor.
//   - Hard:   idioms, multi-word concepts, famous things — leans on
//             visual punning. Best with adult players.

import type { PollinartComplexity } from "../shared/pollinart-types";

const EASY: string[] = [
  // animals
  "cat", "dog", "fish", "duck", "cow", "horse", "pig", "sheep", "rabbit",
  "frog", "snake", "turtle", "elephant", "lion", "tiger", "bear", "monkey",
  "giraffe", "zebra", "panda", "kangaroo", "owl", "penguin", "shark",
  "whale", "dolphin", "octopus", "crab", "spider", "bee", "butterfly",
  "ant", "snail", "ladybug", "dragonfly", "worm", "bat", "mouse", "rat",
  "fox", "wolf", "deer", "moose", "squirrel", "hedgehog", "raccoon",
  // food
  "apple", "banana", "pear", "orange", "grape", "strawberry", "watermelon",
  "pineapple", "cherry", "lemon", "lime", "peach", "kiwi", "mango",
  "carrot", "tomato", "potato", "corn", "broccoli", "mushroom", "onion",
  "pumpkin", "pepper", "lettuce", "cucumber", "bread", "cheese", "pizza",
  "hamburger", "hot dog", "taco", "sandwich", "egg", "bacon", "donut",
  "cake", "cookie", "ice cream", "popsicle", "candy", "lollipop", "pie",
  "milk", "juice", "coffee", "tea", "water bottle", "soup", "noodles",
  "rice", "sushi", "popcorn", "pretzel",
  // objects
  "chair", "table", "bed", "lamp", "door", "window", "key", "lock",
  "book", "pencil", "pen", "eraser", "scissors", "ruler", "clock",
  "watch", "phone", "computer", "tv", "camera", "headphones", "guitar",
  "drum", "piano", "trumpet", "ball", "hat", "shoe", "sock", "shirt",
  "pants", "dress", "coat", "scarf", "glove", "boot", "sunglasses",
  "umbrella", "backpack", "wallet", "ring", "necklace", "crown",
  "bucket", "broom", "hammer", "screwdriver", "saw", "ladder", "rope",
  "fork", "spoon", "knife", "plate", "cup", "mug", "bowl", "pot", "pan",
  "kettle", "toothbrush", "soap", "towel", "comb", "mirror", "candle",
  // nature
  "tree", "flower", "leaf", "grass", "rose", "tulip", "sunflower",
  "cactus", "mushroom plant", "rock", "mountain", "hill", "river",
  "lake", "ocean", "beach", "island", "desert", "forest", "cave",
  "volcano", "rainbow", "cloud", "sun", "moon", "star", "lightning",
  "snowflake", "raindrop", "fire", "ice", "tornado",
  // vehicles
  "car", "truck", "bus", "bike", "scooter", "motorcycle", "train",
  "boat", "ship", "submarine", "airplane", "helicopter", "rocket",
  "balloon", "kite", "skateboard", "tractor", "fire truck",
  "police car", "ambulance",
  // places
  "house", "castle", "barn", "tent", "igloo", "lighthouse", "bridge",
  "tower", "church", "school", "hospital", "library", "park",
  "playground", "stadium",
  // body
  "eye", "ear", "nose", "mouth", "tooth", "hand", "foot", "heart",
  "brain", "bone", "tongue", "finger",
  // shapes / icons
  "circle", "square", "triangle", "star shape", "heart shape", "arrow",
  "smiley face", "snowman", "robot", "ghost", "alien", "skull",
  // weather / events
  "rain", "snow", "wind", "sunset", "birthday cake", "present",
  "balloon bunch",
];

const MEDIUM: string[] = [
  // compound nouns
  "lighthouse", "rollercoaster", "treehouse", "windmill", "fireplace",
  "skateboard ramp", "vending machine", "fire hydrant", "telescope",
  "binoculars", "magnifying glass", "compass", "globe", "anchor",
  "trophy", "medal", "podium", "throne", "chandelier", "telephone booth",
  "mailbox", "post office", "bookshelf", "fountain", "escalator",
  "elevator", "trampoline", "hammock", "treadmill", "rocking chair",
  "snowglobe", "music box", "jack-in-the-box", "kaleidoscope", "abacus",
  "stethoscope", "microscope", "calendar", "calculator", "typewriter",
  "spaceship", "submarine periscope", "ferris wheel", "merry-go-round",
  "drawbridge", "windsock", "weathervane",
  // actions
  "running", "swimming", "dancing", "jumping", "sleeping", "yawning",
  "sneezing", "crying", "laughing", "snoring", "whistling", "juggling",
  "skipping rope", "doing yoga", "lifting weights", "cooking dinner",
  "vacuuming", "mopping", "raking leaves", "shoveling snow",
  "fishing", "camping", "hiking", "stargazing", "bird watching",
  "knitting", "sewing", "painting", "sculpting", "baking",
  // places / scenes
  "farm", "zoo", "circus", "carnival", "movie theater", "amusement park",
  "haunted house", "ski resort", "campground", "garage sale",
  "construction site", "race track", "bowling alley", "art gallery",
  "museum", "aquarium", "planetarium", "bakery", "barber shop",
  "dentist office", "gas station", "convenience store",
  // characters / costumes
  "pirate", "ninja", "knight", "wizard", "witch", "vampire", "werewolf",
  "mermaid", "fairy", "unicorn", "dragon", "phoenix", "centaur",
  "minotaur", "yeti", "loch ness monster", "bigfoot", "leprechaun",
  "tooth fairy", "easter bunny", "snowman with scarf", "scarecrow",
  "cowboy", "astronaut", "scuba diver", "lumberjack", "chef",
  "firefighter", "construction worker", "magician",
  // emotions / abstractions
  "love", "jealousy", "anger", "fear", "happiness", "loneliness",
  "boredom", "surprise", "confusion", "exhaustion", "embarrassment",
  // events
  "birthday party", "wedding", "graduation", "halloween costume",
  "first day of school", "thanksgiving dinner", "christmas morning",
  "easter egg hunt", "fourth of july", "new year fireworks",
  "valentines day", "trick-or-treating", "campfire songs",
  // animals doing things
  "cat in a box", "dog with bone", "bird in nest", "hamster on wheel",
  "fish in bowl", "snake in grass", "spider in web", "bee on flower",
  "monkey with banana", "elephant spraying water",
  // tools / hobbies
  "fishing rod", "metal detector", "snow globe", "video game controller",
  "bowling pin", "boxing glove", "golf club", "tennis racket",
  "hockey stick", "skateboard with wheels",
  // sounds / weather
  "thunderstorm", "blizzard", "earthquake", "tsunami", "drought",
  "heat wave",
];

const HARD: string[] = [
  // idioms (visual puns!)
  "raining cats and dogs", "walking on eggshells", "spill the beans",
  "kick the bucket", "bite the bullet", "cold feet",
  "the elephant in the room", "barking up the wrong tree",
  "two birds with one stone", "let the cat out of the bag",
  "hold your horses", "piece of cake", "couch potato",
  "lend a hand", "head in the clouds", "break a leg",
  "burning the midnight oil", "buttering up", "cutting corners",
  "the early bird gets the worm", "wild goose chase", "fish out of water",
  "go bananas", "hit the hay", "in hot water", "monkey business",
  "on cloud nine", "pulling someone's leg", "spilled milk",
  "the ball is in your court", "throw in the towel", "tip of the iceberg",
  "under the weather", "when pigs fly", "you can't judge a book by its cover",
  // famous things / people / characters (drawable)
  "mona lisa", "the eiffel tower", "the great wall of china",
  "the statue of liberty", "stonehenge", "the pyramids",
  "the leaning tower of pisa", "mount rushmore", "the golden gate bridge",
  "the sphinx", "big ben", "the colosseum", "the taj mahal",
  "the hollywood sign", "santa claus", "frankenstein",
  "dracula", "the headless horseman", "medusa", "cyclops",
  "the loch ness monster", "the abominable snowman",
  // multi-concept
  "midlife crisis", "writers block", "stage fright", "social media",
  "fashion police", "couch surfing", "speed dating",
  "the chicken or the egg", "schrodinger's cat", "the trolley problem",
  "fight or flight", "the butterfly effect", "deja vu",
  "the bermuda triangle", "ufo abduction",
  "groundhog day", "the dog days of summer", "indian summer",
  "an existential crisis", "an awkward silence", "a brain freeze",
  "writers cramp", "the fountain of youth", "the road less traveled",
  "rose-colored glasses", "the silver lining", "the eye of the storm",
  "the calm before the storm", "the perfect storm",
  // ironic / quirky
  "a fish riding a bicycle", "a cat in business attire",
  "a dog playing poker", "a robot drinking coffee",
  "a banana with sunglasses", "a t-rex with tiny arms",
  "a sentient toaster", "a stressed-out octopus",
  "alien tourists", "a haunted vacuum cleaner",
  "a giraffe in a phone booth", "a penguin on vacation",
  // historical / cultural
  "the moon landing", "the wright brothers", "the gold rush",
  "the ice age", "the renaissance", "the wild west",
  "ancient egypt", "the silk road",
  // abstract feelings
  "writers block as a wall", "time flies", "money grows on trees",
  "the weight of the world", "shooting for the moon",
  "the grass is always greener", "the elephant in the corner",
  "barking mad", "the cherry on top",
];

const POOLS: Record<PollinartComplexity, string[]> = {
  easy: EASY,
  medium: MEDIUM,
  hard: HARD,
};

// Fisher-Yates shuffle (deterministic when seeded via Math.random;
// fine for our needs — no replayability requirement).
function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Build a shuffled "deck" for a round. The server hands out k-of-3 slices
// to each player as their starting-word choices, all from the same deck so
// no two players see the same options.
export function buildWordDeck(tier: PollinartComplexity): string[] {
  return shuffle(POOLS[tier]);
}

// Pick k unique words from the deck starting at `cursor`. Wraps around if
// the deck is shorter than the request (extremely thin tiers — won't
// happen with the current pool sizes but safe regardless).
export function dealChoices(deck: string[], cursor: number, k: number): string[] {
  if (deck.length === 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  let i = cursor;
  while (out.length < k && i < cursor + deck.length * 2) {
    const w = deck[i % deck.length];
    if (!seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
    i++;
  }
  return out;
}

export function poolSize(tier: PollinartComplexity): number {
  return POOLS[tier].length;
}
