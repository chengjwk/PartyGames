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
  "Globby", "Blobby", "Puddingy", "Velvety", "Waxy", "Rubbery", "Crumbly",
  "Flaky", "Greasy", "Fuzzy", "Prickly",
  // attitude / suspicion (the "questionable" / "dubious" energy)
  "Questionable", "Dubious", "Suspicious", "Shifty", "Shady", "Sketchy",
  "Mysterious", "Confused", "Bewildered", "Befuddled", "Cranky", "Sulky",
  "Smug", "Hangry", "Grouchy", "Snooty", "Sassy", "Salty", "Cheeky",
  "Petty", "Nosy", "Indignant", "Disgruntled", "Reluctant", "Apologetic",
  "Menacing", "Brooding", "Dramatic", "Melodramatic", "Sarcastic", "Bashful",
  "Flustered", "Startled", "Unimpressed", "Underwhelmed", "Unbothered",
  "Feral", "Ornery", "Peckish", "Woozy", "Loopy", "Dizzy", "Restless",
  // slightly upscale-but-wrong words
  "Disheveled", "Unhinged", "Rambunctious", "Flummoxed", "Overcaffeinated",
  "Underprepared", "Mildly Concerned", "Lightly Toasted", "Slightly Damp",
  "Vaguely Familiar", "Aggressively Polite", "Suspiciously Calm",
  "Cautiously Optimistic", "Begrudgingly Helpful", "Deeply Unserious",
  "Emotionally Fragile", "Technically Correct", "Legally Distinct",
  // secondhand-appliance energy — pairs well with the household nouns
  "Off-Brand", "Secondhand", "Refurbished", "Discontinued", "Unsupervised",
  "Gently Used", "Slightly Dented", "Out of Warranty", "Mildly Cursed",
  "Slightly Haunted", "Barely Functional", "Held Together", "Unplugged",
  "Overloaded", "Static-Charged", "Lint-Covered", "Dust-Caked",
  "Suspiciously Warm", "Freshly Laundered",
  // wear and tear
  "Dented", "Scuffed", "Chipped", "Warped", "Rusty", "Wonky", "Creased",
  "Splintered", "Battered", "Faded",
  // sound / motion
  "Clattery", "Honky", "Squeaky", "Creaky", "Wheezy", "Snorty", "Chompy",
  "Slurpy", "Burpy", "Hiccupy", "Sniffly", "Yawny", "Snoozy", "Drowsy",
  "Rattly", "Clanky", "Whirring", "Beeping", "Humming", "Gurgling",
  // size / state
  "Tiny", "Hefty", "Chonky", "Smol", "Beefy", "Sturdy", "Crumpled",
  "Tangled", "Tousled", "Frazzled", "Bedraggled", "Bewhiskered",
  // food-ish flavors
  "Buttery", "Cheesy", "Gravy-Flecked", "Marinated", "Pickled", "Toasted",
  "Frosted", "Glazed", "Caramelized", "Smoked", "Deep-Fried", "Sun-Dried",
];

const ANIMALS = [
  "Beaver", "Otter", "Fox", "Owl", "Wolf", "Bear", "Lion", "Tiger",
  "Panda", "Koala", "Hedgehog", "Raccoon", "Penguin", "Sloth", "Walrus", "Moose",
  "Badger", "Squirrel", "Lemur", "Narwhal", "Toucan", "Octopus", "Frog", "Newt",
  "Dolphin", "Hamster", "Llama", "Yak", "Capybara", "Mongoose",
  "Platypus", "Wombat", "Armadillo", "Pangolin", "Aardvark", "Manatee",
  "Axolotl", "Chinchilla", "Ferret", "Gerbil", "Marmot", "Meerkat", "Ocelot",
  "Okapi", "Tapir", "Quokka", "Puffin", "Pelican", "Flamingo", "Ostrich",
  "Emu", "Heron", "Stork", "Magpie", "Raven", "Goose", "Turkey", "Pigeon",
  "Squid", "Cuttlefish", "Jellyfish", "Starfish", "Crab", "Lobster", "Shrimp",
  "Snail", "Slug", "Beetle", "Moth", "Cricket", "Tadpole", "Salamander",
  "Gecko", "Iguana", "Chameleon", "Tortoise", "Alpaca", "Donkey", "Goat",
  "Piglet", "Bison", "Wildebeest", "Warthog", "Hippo", "Rhino", "Giraffe",
  "Zebra", "Gibbon", "Baboon", "Orangutan",
];

const FOODS = [
  "Pizza", "Donut", "Taco", "Pretzel", "Bagel", "Pancake", "Waffle", "Burrito",
  "Ravioli", "Cupcake", "Sundae", "Pickle", "Biscuit", "Macaron", "Croissant", "Muffin",
  "Cookie", "Latte", "Mango", "Pepper", "Avocado", "Banana", "Tofu", "Noodle",
  "Dumpling", "Lemon", "Brownie", "Marshmallow", "Pumpkin", "Toast",
  "Nacho", "Churro", "Empanada", "Samosa", "Gnocchi", "Meatball", "Radish",
  "Turnip", "Eggplant", "Zucchini", "Artichoke", "Beet", "Onion", "Garlic",
  "Lentil", "Oatmeal", "Porridge", "Custard", "Pudding", "Trifle", "Scone",
  "Crumpet", "Baguette", "Sourdough", "Tortilla", "Pita", "Ramen", "Udon",
  "Gyoza", "Kimchi", "Wasabi", "Ketchup", "Mustard", "Gravy", "Syrup",
  "Popsicle", "Gumdrop", "Jellybean", "Lollipop", "Licorice", "Nougat",
  "Truffle", "Eclair", "Strudel", "Cobbler", "Flapjack", "Corndog",
  "Meatloaf", "Casserole", "Coleslaw", "Guacamole", "Hummus", "Falafel",
  "Kebab", "Pierogi", "Latke", "Espresso", "Smoothie", "Milkshake", "Slushie",
  "Lemonade",
];

// Household objects — the comedy comes from anthropomorphizing the mundane.
const HOUSEHOLD = [
  "Toaster", "Kettle", "Blender", "Microwave", "Colander", "Spatula", "Whisk",
  "Ladle", "Corkscrew", "Can Opener", "Rolling Pin", "Cutting Board",
  "Oven Mitt", "Teapot", "Thermos", "Mop", "Broom", "Dustpan", "Vacuum",
  "Feather Duster", "Sponge", "Squeegee", "Plunger", "Bucket", "Ironing Board",
  "Clothespin", "Coat Hanger", "Doormat", "Doorknob", "Doorstop",
  "Light Switch", "Lampshade", "Ceiling Fan", "Radiator", "Thermostat",
  "Smoke Alarm", "Fire Extinguisher", "Step Ladder", "Toolbox", "Screwdriver",
  "Wrench", "Tape Measure", "Duct Tape", "Extension Cord", "Power Strip",
  "Doorbell", "Mailbox", "Recycling Bin", "Watering Can", "Garden Hose",
  "Wheelbarrow", "Lawn Chair", "Bird Feeder", "Garden Gnome", "Wind Chime",
  "Flowerpot",
];

// Everyday carry, desk clutter, and things you trip over.
const EVERYDAY = [
  "Stapler", "Hole Punch", "Paperclip", "Rubber Band", "Sticky Note",
  "Highlighter", "Eraser", "Ruler", "Scissors", "Glue Stick", "Notebook",
  "Clipboard", "Calculator", "Whiteboard", "Desk Lamp", "Swivel Chair",
  "Umbrella", "Raincoat", "Rain Boot", "Odd Sock", "Mitten", "Scarf",
  "Beanie", "Shoelace", "Belt Buckle", "Backpack", "Tote Bag", "Wallet",
  "Keyring", "House Key", "Sunglasses", "Toothbrush", "Hairbrush", "Comb",
  "Loofah", "Bath Towel", "Bathrobe", "Slipper", "Pillow", "Duvet",
  "Beanbag", "Footstool", "Bookend", "Bookmark", "Piggy Bank", "Alarm Clock",
  "Hourglass", "Snow Globe", "Rubber Duck", "Yo-Yo", "Kazoo", "Harmonica",
  "Bubble Wrap", "Cardboard Box", "Shopping Cart", "Traffic Cone",
  "Parking Meter", "Fire Hydrant", "Speed Bump", "Wheelie Bin", "Scarecrow",
];

const NOUNS = [...ANIMALS, ...FOODS, ...HOUSEHOLD, ...EVERYDAY];

// Server truncates names at 24 chars, so only pair an adjective that fits.
const MAX_LEN = 24;

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomName(): string {
  const noun = pick(NOUNS);
  const room = MAX_LEN - noun.length - 1;
  return `${pick(ADJECTIVES.filter((a) => a.length <= room))} ${noun}`;
}
