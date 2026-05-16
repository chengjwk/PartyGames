// Mix of "nice" adjectives (Brave, Cheery) with funnier/weirder ones
// (Lumpy, Questionable, Squelchy) so a roll-of-the-dice random name
// has a good chance of landing somewhere absurd.
const ADJECTIVES = [
  // classics
  "Brave", "Clever", "Witty", "Sneaky", "Mighty", "Sleepy", "Happy", "Speedy",
  "Sparkly", "Grumpy", "Cheery", "Cozy", "Fancy", "Goofy", "Jazzy", "Lucky",
  "Plucky", "Quirky", "Snazzy", "Spunky", "Zippy", "Wobbly", "Bouncy", "Twirly",
  "Lanky", "Fluffy", "Bubbly", "Dapper", "Jolly", "Nifty",
  // squishy / texture / shape — kid-funny
  "Squishy", "Squelchy", "Lumpy", "Bumpy", "Crusty", "Crispy", "Gloopy",
  "Mushy", "Soggy", "Slimy", "Sticky", "Pokey", "Squiggly", "Wiggly",
  "Jiggly", "Floppy", "Squashy", "Doughy", "Knobbly", "Spongy", "Stringy",
  "Globby", "Blobby", "Puddingy",
  // attitude / suspicion (the "questionable" / "dubious" energy)
  "Questionable", "Dubious", "Suspicious", "Shifty", "Shady", "Sketchy",
  "Mysterious", "Confused", "Bewildered", "Befuddled", "Cranky", "Sulky",
  "Smug", "Hangry", "Grouchy", "Snooty", "Sassy", "Salty", "Cheeky",
  "Petty", "Nosy", "Indignant", "Disgruntled", "Reluctant", "Apologetic",
  // slightly upscale-but-wrong words
  "Disheveled", "Unhinged", "Rambunctious", "Flummoxed", "Overcaffeinated",
  "Underprepared", "Mildly Concerned", "Lightly Toasted", "Slightly Damp",
  "Vaguely Familiar", "Aggressively Polite", "Suspiciously Calm",
  "Cautiously Optimistic", "Begrudgingly Helpful",
  // sound / motion
  "Clattery", "Honky", "Squeaky", "Creaky", "Wheezy", "Snorty", "Chompy",
  "Slurpy", "Burpy", "Hiccupy", "Sniffly", "Yawny", "Snoozy", "Drowsy",
  // size / state
  "Tiny", "Hefty", "Chonky", "Smol", "Beefy", "Sturdy", "Crumpled",
  "Tangled", "Tousled", "Frazzled", "Bedraggled", "Bewhiskered",
  // food-ish flavors
  "Buttery", "Cheesy", "Gravy-Flecked", "Marinated", "Pickled", "Toasted",
  "Frosted", "Glazed", "Caramelized", "Smoked",
];

const ANIMALS = [
  "Beaver", "Otter", "Fox", "Owl", "Wolf", "Bear", "Lion", "Tiger",
  "Panda", "Koala", "Hedgehog", "Raccoon", "Penguin", "Sloth", "Walrus", "Moose",
  "Badger", "Squirrel", "Lemur", "Narwhal", "Toucan", "Octopus", "Frog", "Newt",
  "Dolphin", "Hamster", "Llama", "Yak", "Capybara", "Mongoose",
];

const FOODS = [
  "Pizza", "Donut", "Taco", "Pretzel", "Bagel", "Pancake", "Waffle", "Burrito",
  "Ravioli", "Cupcake", "Sundae", "Pickle", "Biscuit", "Macaron", "Croissant", "Muffin",
  "Cookie", "Latte", "Mango", "Pepper", "Avocado", "Banana", "Tofu", "Noodle",
  "Dumpling", "Lemon", "Brownie", "Marshmallow", "Pumpkin", "Toast",
];

const NOUNS = [...ANIMALS, ...FOODS];

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomName(): string {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}
