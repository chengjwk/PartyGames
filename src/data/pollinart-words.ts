// Curated word pools for Pollinart. Three difficulty tiers — every
// round is now a mix (target 2 easy / 1 medium / 1 hard at 4 players,
// scaled at other counts), so each chain samples its starting word
// from its assigned tier rather than a single lobby-selected tier.
// Word choices for each player are drawn without replacement from
// their tier deck so picks feel fresh across the round.
//
// Curation philosophy:
//   - Easy:   concrete, single-noun, kid-drawable in 30s.
//   - Medium: compound nouns, simple actions, mild abstractions,
//             and the "absurd combos" category — still drawable, but
//             might need a clever metaphor or a chuckle to pull off.
//             ("Turtle on a seesaw", "Potato on a skateboard.")
//   - Hard:   idioms, multi-word concepts, famous things, abstract
//             feelings. Leans on visual punning. Best with adult
//             players.
//
// Goal sizes: ~900 easy, ~900 medium, ~400 hard. Lots of variety
// means a long game has a tiny chance of repeating a seed word.

import type { PollinartComplexity } from "../shared/pollinart-types";

// ─────────────────────────── EASY ───────────────────────────
const EASY: string[] = [
  // Mammals
  "cat", "dog", "kitten", "puppy", "mouse", "rat", "hamster", "guinea pig",
  "gerbil", "rabbit", "hare", "squirrel", "chipmunk", "mole", "gopher",
  "fox", "wolf", "coyote", "jackal", "bear", "polar bear", "grizzly bear",
  "panda", "panda bear", "koala", "kangaroo", "wallaby", "wombat", "platypus",
  "echidna", "opossum", "armadillo", "anteater", "sloth", "monkey", "gorilla",
  "chimpanzee", "orangutan", "baboon", "lemur", "sugar glider",
  "lion", "lioness", "tiger", "leopard", "cheetah", "jaguar", "cougar",
  "bobcat", "lynx", "snow leopard", "ocelot",
  "elephant", "rhinoceros", "hippopotamus", "giraffe", "zebra", "okapi",
  "deer", "moose", "elk", "reindeer", "buffalo", "bison", "ram", "goat",
  "sheep", "lamb", "alpaca", "llama", "camel", "yak", "capybara",
  "horse", "donkey", "mule", "zebra foal", "pony", "unicorn", "pegasus",
  "pig", "piglet", "cow", "calf", "bull", "ox",
  "raccoon", "skunk", "beaver", "otter", "weasel", "ferret", "stoat",
  "marten", "wolverine", "badger", "hedgehog", "porcupine", "bat",
  "dolphin", "porpoise", "whale", "orca", "narwhal", "manatee", "dugong",
  "seal", "walrus", "sea lion", "sea otter",

  // Birds
  "bird", "robin", "sparrow", "finch", "cardinal", "blue jay", "magpie",
  "raven", "crow", "blackbird", "starling", "dove", "pigeon", "seagull",
  "swallow", "hummingbird", "canary", "lovebird", "parakeet", "cockatoo",
  "macaw", "parrot", "kingfisher", "puffin", "albatross", "woodpecker",
  "owl", "eagle", "bald eagle", "hawk", "falcon", "vulture", "condor",
  "kiwi bird", "emu", "ostrich", "cassowary", "rhea", "peacock", "peahen",
  "swan", "goose", "gosling", "duck", "duckling", "mallard", "wood duck",
  "chicken", "chick", "rooster", "hen", "turkey", "pheasant", "quail",
  "flamingo", "pelican", "stork", "heron", "egret", "crane", "ibis",
  "toucan", "hornbill", "penguin", "puffin",

  // Reptiles & amphibians
  "snake", "viper", "cobra", "python", "boa constrictor", "rattlesnake",
  "garter snake", "lizard", "gecko", "iguana", "chameleon", "komodo dragon",
  "monitor lizard", "skink", "newt", "salamander", "axolotl",
  "frog", "tree frog", "bullfrog", "tadpole", "toad",
  "alligator", "crocodile", "turtle", "tortoise", "terrapin", "sea turtle",

  // Sea creatures
  "fish", "goldfish", "koi fish", "betta fish", "tropical fish",
  "tuna", "salmon", "trout", "bass", "swordfish", "marlin", "sailfish",
  "shark", "great white shark", "hammerhead shark", "stingray", "manta ray",
  "eel", "moray eel", "electric eel", "puffer fish", "anglerfish",
  "octopus", "squid", "cuttlefish", "jellyfish", "starfish", "sea anemone",
  "sea horse", "sea urchin", "sand dollar", "coral", "coral reef",
  "clam", "oyster", "mussel", "scallop", "conch shell", "seashell",
  "snail", "slug", "crab", "hermit crab", "horseshoe crab", "lobster",
  "shrimp", "prawn", "crayfish", "barnacle", "krill",

  // Insects & arthropods
  "ant", "queen ant", "bee", "honeybee", "bumblebee", "hornet", "wasp",
  "yellow jacket", "butterfly", "monarch butterfly", "moth", "caterpillar",
  "cocoon", "chrysalis", "dragonfly", "damselfly", "firefly", "ladybug",
  "beetle", "stag beetle", "rhino beetle", "scarab", "cricket",
  "grasshopper", "praying mantis", "cicada", "stink bug", "cockroach",
  "termite", "spider", "tarantula", "scorpion", "tick", "flea", "mosquito",
  "fly", "housefly", "gnat", "centipede", "millipede", "earthworm", "worm",

  // Prehistoric / mythical
  "dinosaur", "t-rex", "tyrannosaurus rex", "triceratops", "brontosaurus",
  "stegosaurus", "pterodactyl", "velociraptor", "raptor", "ankylosaurus",
  "spinosaurus", "diplodocus", "woolly mammoth", "saber-toothed tiger",
  "dodo bird", "dragon", "phoenix", "gryphon", "griffin", "centaur",
  "minotaur", "cyclops", "medusa", "mermaid", "merman", "siren",
  "fairy", "pixie", "elf", "dwarf", "gnome", "leprechaun", "goblin",
  "troll", "ogre", "kraken", "hydra", "sasquatch", "yeti",
  "loch ness monster", "chupacabra",

  // Fruit
  "apple", "green apple", "pear", "banana", "orange", "tangerine",
  "clementine", "lemon", "lime", "grapefruit", "pomegranate",
  "grape", "bunch of grapes", "raisin", "strawberry", "raspberry",
  "blackberry", "blueberry", "cranberry", "elderberry", "currant",
  "watermelon", "honeydew", "cantaloupe", "melon", "pineapple",
  "kiwi fruit", "mango", "papaya", "guava", "passion fruit",
  "dragonfruit", "starfruit", "lychee", "rambutan", "durian", "jackfruit",
  "fig", "date", "prune", "peach", "nectarine", "apricot", "plum",
  "cherry", "cherries", "coconut", "avocado", "persimmon",

  // Vegetables
  "carrot", "potato", "sweet potato", "yam", "tomato", "cherry tomato",
  "cucumber", "zucchini", "summer squash", "butternut squash", "pumpkin",
  "eggplant", "bell pepper", "chili pepper", "jalapeño", "habanero",
  "onion", "red onion", "garlic", "ginger", "scallion", "leek",
  "lettuce", "spinach", "kale", "arugula", "cabbage", "red cabbage",
  "brussels sprout", "broccoli", "cauliflower", "asparagus", "artichoke",
  "celery", "mushroom", "portobello mushroom", "corn", "corn cob",
  "beet", "radish", "turnip", "parsnip", "rutabaga", "kohlrabi",
  "green beans", "peas", "snow peas", "edamame", "lentils", "chickpeas",

  // Prepared food
  "pizza", "pizza slice", "hamburger", "cheeseburger", "hot dog",
  "corn dog", "sandwich", "wrap", "sub", "taco", "burrito", "quesadilla",
  "enchilada", "nachos", "tortilla chip", "salsa", "guacamole",
  "sushi roll", "nigiri", "ramen", "udon noodles", "pho", "soup bowl",
  "stew", "chili bowl", "curry", "pad thai", "fried rice", "spring roll",
  "lasagna", "spaghetti", "ravioli", "gnocchi", "dumpling", "pierogi",
  "samosa", "falafel", "kebab", "gyro", "paella", "risotto",
  "pancake stack", "waffle", "crepe", "french toast", "omelet",
  "scrambled eggs", "fried egg", "sunny side up egg", "boiled egg",
  "bacon", "sausage link", "ham", "salami", "meatball",
  "bagel", "donut", "muffin", "croissant", "scone", "toast",
  "biscuit", "pretzel", "soft pretzel", "popcorn bucket", "potato chips",
  "french fries", "onion rings", "cereal bowl", "granola bar", "oatmeal",
  "yogurt cup", "ice cream cone", "double scoop", "sundae", "milkshake",
  "smoothie", "banana split",

  // Sweets / drinks
  "cake", "birthday cake", "wedding cake", "cupcake", "cookie",
  "chocolate chip cookie", "oreo", "brownie", "fudge", "candy", "lollipop",
  "gumball", "gummy bear", "jellybean", "chocolate bar", "candy bar",
  "candy cane", "ice cream", "popsicle", "marshmallow", "s'more",
  "gingerbread man", "eclair", "pie", "apple pie", "pumpkin pie", "tart",
  "cheesecake", "macaron", "cinnamon roll", "donut hole", "fortune cookie",
  "water bottle", "milk carton", "juice box", "soda can", "soda bottle",
  "coffee cup", "tea cup", "mug", "glass of milk", "milkshake",
  "wine glass", "beer mug", "champagne flute", "cocktail with umbrella",
  "thermos", "kettle", "teapot",

  // Kitchen objects
  "plate", "bowl", "cup", "saucer", "fork", "spoon", "knife", "butter knife",
  "chopsticks", "ladle", "spatula", "whisk", "tongs", "rolling pin",
  "pot", "stockpot", "frying pan", "skillet", "casserole dish",
  "oven", "stove", "stovetop", "microwave", "toaster", "toaster oven",
  "blender", "mixer", "stand mixer", "food processor", "coffee maker",
  "espresso machine", "french press", "kettle", "tea kettle",
  "can opener", "bottle opener", "corkscrew", "cheese grater",
  "cutting board", "colander", "strainer", "measuring cup",
  "salt shaker", "pepper mill", "lunchbox", "food container", "thermos",
  "ice cube tray", "ice cube",

  // Furniture
  "chair", "stool", "bar stool", "bench", "park bench", "sofa", "couch",
  "loveseat", "recliner", "ottoman", "armchair", "rocking chair",
  "table", "round table", "kitchen table", "coffee table", "side table",
  "desk", "writing desk", "standing desk", "dresser", "wardrobe",
  "nightstand", "bookshelf", "bookcase", "cabinet", "filing cabinet",
  "drawer", "bed", "bunk bed", "crib", "cradle", "hammock", "swing",
  "porch swing", "tire swing",

  // Electronics & screens
  "phone", "smartphone", "rotary phone", "flip phone", "tablet",
  "computer", "laptop", "monitor", "keyboard", "mouse pad", "computer mouse",
  "tv", "television", "remote control", "camera", "video camera",
  "polaroid camera", "drone", "speaker", "boombox", "stereo",
  "headphones", "earbuds", "microphone", "megaphone", "walkie-talkie",
  "calculator", "printer", "scanner", "fax machine", "typewriter",
  "radio", "record player", "turntable", "cassette tape", "vhs tape",
  "cd", "dvd",

  // Clothing & accessories
  "shirt", "t-shirt", "polo shirt", "button-up shirt", "sweater",
  "sweatshirt", "hoodie", "jacket", "coat", "raincoat", "trench coat",
  "vest", "pants", "jeans", "shorts", "skirt", "mini skirt", "dress",
  "ball gown", "wedding dress", "pajamas", "robe", "bathrobe",
  "swimsuit", "bikini", "trunks", "socks", "argyle socks", "stockings",
  "tights", "shoes", "sneakers", "high tops", "running shoes",
  "boots", "rain boots", "cowboy boots", "high heels", "flip-flops",
  "sandals", "slippers", "bunny slippers",
  "hat", "cap", "baseball cap", "beanie", "sun hat", "cowboy hat",
  "top hat", "beret", "fedora", "wizard hat", "witch hat", "santa hat",
  "graduation cap", "crown", "tiara", "helmet", "construction helmet",
  "viking helmet", "bicycle helmet",
  "scarf", "mittens", "gloves", "boxing gloves", "oven mitt",
  "sunglasses", "eyeglasses", "monocle", "tie", "bow tie", "neck tie",
  "suspenders", "belt", "watch", "wristwatch", "pocket watch",
  "ring", "wedding ring", "necklace", "pendant", "bracelet", "anklet",
  "earrings", "brooch",

  // Toys & games
  "doll", "teddy bear", "stuffed animal", "action figure", "toy soldier",
  "toy car", "toy train", "toy plane", "toy boat", "building blocks",
  "lego brick", "jigsaw puzzle", "rubik's cube", "board game", "monopoly",
  "deck of cards", "playing card", "ace of spades", "die", "dice",
  "ball", "beach ball", "basketball", "soccer ball", "football",
  "baseball", "tennis ball", "golf ball", "ping pong ball", "bowling ball",
  "balloon", "balloon bunch", "water balloon", "kite", "yo-yo",
  "jump rope", "hula hoop", "frisbee", "slinky", "jack-in-the-box",
  "music box", "snow globe", "wind-up toy", "spinning top", "marble",
  "boomerang", "slingshot", "rubber duck", "bath toy", "kazoo",

  // Musical instruments
  "guitar", "acoustic guitar", "electric guitar", "bass guitar", "ukulele",
  "banjo", "violin", "viola", "cello", "double bass", "harp", "lute",
  "piano", "grand piano", "upright piano", "keyboard", "organ",
  "accordion", "harmonica", "drum", "snare drum", "bass drum", "bongos",
  "conga", "tambourine", "triangle", "xylophone", "marimba", "glockenspiel",
  "trumpet", "trombone", "tuba", "french horn", "cornet", "bugle",
  "flute", "piccolo", "clarinet", "oboe", "bassoon", "saxophone",
  "bagpipes", "didgeridoo", "sitar", "panpipes",

  // Tools
  "hammer", "claw hammer", "mallet", "screwdriver", "phillips screwdriver",
  "wrench", "monkey wrench", "pliers", "saw", "hand saw", "chainsaw",
  "drill", "power drill", "axe", "hatchet", "shovel", "spade", "rake",
  "broom", "mop", "dustpan", "vacuum cleaner", "scissors", "pruning shears",
  "garden trowel", "watering can", "hose", "sprinkler", "lawn mower",
  "snow shovel", "paintbrush", "paint roller", "paint can", "paint bucket",
  "ladder", "stepladder", "toolbox", "level", "tape measure", "ruler",
  "stud finder",

  // School
  "book", "open book", "notebook", "textbook", "pencil", "pen",
  "marker", "permanent marker", "crayon", "colored pencil", "highlighter",
  "eraser", "pencil sharpener", "scissors", "ruler", "protractor",
  "compass", "graph paper", "calculator", "backpack", "lunchbox",
  "glue stick", "glue bottle", "tape dispenser", "duct tape",
  "paper clip", "binder clip", "stapler", "three-ring binder", "folder",
  "manila folder", "planner", "calendar", "globe", "world map",
  "chalkboard", "whiteboard", "easel", "paint palette", "paint set",
  "watercolor set", "sketchbook",

  // Bathroom
  "toothbrush", "toothpaste tube", "soap bar", "shampoo bottle",
  "conditioner bottle", "towel", "bath towel", "washcloth", "sponge",
  "loofah", "bathtub", "shower", "shower head", "sink", "faucet",
  "mirror", "hand mirror", "toilet", "toilet paper roll", "hair dryer",
  "comb", "hairbrush", "razor", "electric razor", "nail clipper",
  "tweezers", "cotton swab", "bandage", "first aid kit", "thermometer",

  // Sky & weather
  "sun", "rising sun", "setting sun", "moon", "full moon", "crescent moon",
  "half moon", "star", "shooting star", "constellation", "milky way",
  "planet", "earth", "saturn", "mars", "jupiter", "rocket", "rocket ship",
  "satellite", "asteroid", "comet", "ufo", "flying saucer",
  "cloud", "fluffy cloud", "raincloud", "thundercloud", "storm cloud",
  "snowflake", "raindrop", "puddle", "sunbeam", "rainbow", "double rainbow",
  "lightning bolt", "thunderbolt", "tornado", "hurricane swirl",

  // Land & water
  "mountain", "mountain range", "snowy peak", "hill", "valley", "cliff",
  "canyon", "plateau", "mesa", "desert", "sand dune", "oasis", "cactus",
  "forest", "jungle", "savanna", "tundra", "rainforest",
  "glacier", "iceberg", "snowy field",
  "beach", "ocean", "sea", "wave", "tidal wave", "river", "stream",
  "creek", "waterfall", "geyser", "hot spring", "lake", "pond",
  "swamp", "marsh", "island", "tropical island", "peninsula", "atoll",
  "cave", "cavern", "stalactite", "stalagmite",
  "rock", "boulder", "pebble", "skipping stone",

  // Plants
  "tree", "oak tree", "pine tree", "palm tree", "willow tree", "evergreen",
  "christmas tree", "bamboo grove", "fern", "mushroom", "toadstool",
  "grass blade", "lawn", "hedge", "vine", "ivy", "moss",
  "flower", "rose", "tulip", "sunflower", "daisy", "daffodil", "lily",
  "orchid", "carnation", "dandelion", "dandelion puff", "lotus",
  "lily pad", "water lily", "morning glory", "iris", "hyacinth",
  "cactus", "saguaro cactus", "succulent", "bonsai", "venus flytrap",
  "seed", "sprout", "sapling", "leaf", "fall leaf", "branch", "log",
  "stump", "tree ring", "pinecone", "acorn",

  // Buildings & landmarks (simple)
  "house", "small house", "mansion", "cottage", "cabin", "log cabin",
  "igloo", "tent", "tipi", "yurt", "hut", "treehouse", "castle",
  "sandcastle", "palace", "fortress", "lighthouse", "windmill",
  "water tower", "gas station", "fire station", "police station",
  "post office", "library", "museum", "bank", "hospital", "school",
  "factory", "warehouse", "gym", "movie theater", "stadium", "arena",
  "church", "cathedral", "temple", "mosque", "synagogue", "pagoda",
  "barn", "silo", "farmhouse", "scarecrow",

  // Vehicles
  "car", "convertible", "truck", "pickup truck", "semi truck", "dump truck",
  "fire truck", "ambulance", "police car", "taxi", "bus", "school bus",
  "double-decker bus", "van", "minivan", "motorcycle", "scooter", "moped",
  "bicycle", "tricycle", "unicycle", "skateboard", "rollerblades",
  "roller skates", "ice skates", "ski", "snowboard", "sled", "toboggan",
  "segway", "hoverboard", "golf cart", "atv", "dirt bike", "monster truck",
  "race car", "formula one car", "go-kart", "train", "steam train",
  "locomotive", "freight train", "caboose", "subway car", "tram",
  "monorail", "tractor", "bulldozer", "excavator", "crane truck",
  "forklift", "cement mixer", "lawnmower",
  "plane", "jet", "biplane", "helicopter", "blimp", "zeppelin",
  "hot air balloon", "parachute", "paraglider", "hang glider", "rocket",
  "spaceship", "drone",
  "boat", "rowboat", "sailboat", "canoe", "kayak", "raft", "dinghy",
  "yacht", "speedboat", "ferry", "cruise ship", "submarine", "jet ski",
  "surfboard", "paddleboard", "gondola",

  // Body parts
  "head", "hair", "ponytail", "face", "eye", "eyeball", "eyebrow",
  "eyelash", "nose", "ear", "mouth", "lip", "tooth", "tongue", "jaw",
  "chin", "cheek", "neck", "shoulder", "arm", "elbow", "wrist", "hand",
  "fist", "thumbs up", "peace sign", "finger", "thumb", "fingernail",
  "palm", "back", "chest", "belly", "belly button", "waist", "hip",
  "leg", "knee", "ankle", "foot", "toe", "heel", "skeleton", "skull",
  "bone", "rib", "spine", "heart", "brain", "lungs", "muscle",

  // Shapes & icons
  "circle", "oval", "square", "rectangle", "triangle", "equilateral triangle",
  "diamond", "rhombus", "pentagon", "hexagon", "octagon", "star shape",
  "five-pointed star", "six-pointed star", "heart shape", "broken heart",
  "arrow", "double arrow", "curved arrow", "target", "bullseye",
  "lightning bolt", "smiley face", "frowny face", "winky face",
  "peace symbol", "plus sign", "minus sign", "times sign", "divide sign",
  "equals sign", "exclamation point", "question mark", "ampersand",
  "dollar sign", "percent sign", "infinity sign", "recycling symbol",
  "yin yang", "hashtag", "at symbol", "trophy", "medal", "ribbon",
  "first place ribbon",

  // People & costumes (single archetypes)
  "baby", "toddler", "kid", "teenager", "adult", "elder", "twins",
  "family", "mom", "dad", "sister", "brother", "grandma", "grandpa",
  "prince", "princess", "king", "queen", "knight", "wizard", "witch",
  "ghost", "vampire", "werewolf", "mummy", "zombie", "frankenstein",
  "skeleton", "mermaid", "pirate", "ninja", "samurai", "viking",
  "caveman", "monk", "santa claus", "santa with sack", "easter bunny",
  "tooth fairy", "leprechaun", "snowman", "scarecrow", "robot", "alien",
  "astronaut", "scuba diver", "chef", "firefighter", "police officer",
  "doctor", "nurse", "teacher", "mailman", "postman", "construction worker",
  "lumberjack", "soldier", "clown",

  // Events / holiday icons
  "birthday cake", "birthday present", "birthday hat", "gift box",
  "wrapped present", "ribbon bow", "party hat", "party horn", "confetti",
  "fireworks", "wedding rings", "wedding bouquet", "graduation cap",
  "diploma", "christmas stocking", "christmas wreath", "christmas ornament",
  "candy cane", "gingerbread house", "jack-o-lantern", "halloween candy",
  "easter egg", "easter basket", "valentine heart", "valentine card",
  "love letter", "menorah", "dreidel", "thanksgiving turkey", "cornucopia",
  "american flag", "parade float", "marching band drum",

  // Sports equipment
  "baseball bat", "baseball glove", "tennis racket", "badminton racket",
  "golf club", "putter", "hockey stick", "lacrosse stick", "ski poles",
  "fishing rod", "fishing net", "fishing tackle box", "life jacket",
  "snorkel", "scuba mask", "flippers", "swim goggles", "swim cap",
  "diving board", "soccer cleat", "shin guard", "wrestling mat", "boxing ring",

  // Misc concrete (light absurdity sneaks in)
  "candle", "lit candle", "lantern", "flashlight", "lamp", "lampshade",
  "desk lamp", "floor lamp", "chandelier", "fireplace", "campfire",
  "match", "lit match", "hourglass", "sundial", "alarm clock",
  "wall clock", "cuckoo clock", "grandfather clock",
  "magic wand", "broomstick", "cauldron", "crystal ball", "tarot card",
  "ouija board", "magic 8 ball",
  "bucket", "watering can", "fire hydrant", "mailbox", "traffic cone",
  "traffic light", "stop sign", "billboard", "lamppost", "manhole cover",
  "fire escape", "satellite dish", "antenna", "weather vane", "periscope",
  "telescope", "microscope", "binoculars", "magnifying glass",
  "abacus", "globe", "atlas", "passport", "suitcase", "rolling luggage",
  "umbrella", "parasol", "umbrella stand", "raincoat", "rain boots",
  "snow shovel", "ice scraper", "snow globe",
  "treasure chest", "treasure map", "gold coin", "stack of coins",
  "piggy bank", "wallet", "purse", "handbag",
  "envelope", "stamped letter", "postcard", "postage stamp", "newspaper",
  "magazine", "comic book", "scroll", "feather quill", "ink well",
  "key", "skeleton key", "padlock", "combination lock", "key ring",
  "wrench", "magnet", "horseshoe magnet", "battery", "lightbulb",
  "old lightbulb", "candlestick", "match book",
];

// ─────────────────────────── MEDIUM ───────────────────────────
const MEDIUM: string[] = [
  // Compound nouns / specific contraptions
  "lighthouse", "rollercoaster", "ferris wheel", "merry-go-round",
  "carousel", "bumper cars", "tilt-a-whirl", "drop tower",
  "treehouse village", "windmill on a hill", "water mill", "fireplace mantle",
  "skate ramp", "halfpipe", "vending machine", "claw machine",
  "fire hydrant", "telescope on tripod", "binoculars on a balcony",
  "magnifying glass over an ant", "compass rose", "antique globe",
  "ship anchor", "trophy case", "olympic medal podium", "throne room",
  "chandelier with candles", "telephone booth", "british phone booth",
  "mailbox at the curb", "post office building", "bookshelf full of books",
  "fountain in the park", "escalator", "elevator", "trampoline",
  "hammock between trees", "treadmill", "rocking chair on porch",
  "snowglobe with castle", "music box with ballerina", "kaleidoscope",
  "abacus on a desk", "stethoscope around neck", "microscope on lab bench",
  "calendar on the wall", "calculator with paper roll", "typewriter",
  "vintage typewriter", "spaceship cockpit", "submarine periscope",
  "drawbridge with moat", "windsock at the airport", "weathervane on roof",
  "rainbow over hills", "shooting star with trail", "satellite dish on roof",
  "windmill with sails turning", "ferris wheel at carnival",

  // Actions & people doing things
  "running a marathon", "jogging in the park", "swimming laps",
  "diving off a board", "dancing at a wedding", "salsa dancing",
  "breakdancing", "tap dancing", "ballet dancer mid-spin",
  "jumping rope", "playing hopscotch", "skipping stones",
  "sleeping in a hammock", "snoring loudly", "yawning hugely",
  "sneezing", "hiccuping", "laughing uncontrollably", "crying tears",
  "whistling a tune", "juggling balls", "juggling chainsaws",
  "doing yoga", "child's pose", "downward dog pose", "tree pose",
  "lifting weights", "doing push-ups", "doing sit-ups", "jumping jacks",
  "running on a treadmill", "stationary bike",
  "cooking dinner", "stirring a pot", "baking cookies",
  "frosting a cake", "kneading dough", "chopping vegetables",
  "vacuuming the floor", "mopping the floor", "raking leaves",
  "shoveling snow", "building a snowman", "watering plants",
  "planting seeds", "digging a hole", "fishing off a dock",
  "camping in the woods", "hiking up a mountain", "stargazing with telescope",
  "bird watching", "knitting a scarf", "crocheting a doily",
  "weaving on a loom", "embroidering a hoop", "painting a portrait",
  "painting a fence", "sculpting clay", "throwing pottery on a wheel",
  "doing magic tricks", "pulling rabbit from hat", "sawing a person in half",
  "riding a bike", "riding a horse", "riding a unicycle",
  "rollerblading", "ice skating in figure eights", "skiing downhill",
  "snowboarding off a ramp", "surfing a wave", "windsurfing",
  "walking a dog", "walking a tiger on a leash", "brushing teeth",
  "blowing bubbles", "blowing out birthday candles", "skating in a rink",
  "fencing match", "boxing match", "wrestling match", "karate kick",
  "tai chi pose", "meditation pose",

  // Places / scenes
  "farm", "petting zoo", "zoo", "circus tent", "carnival midway",
  "amusement park entrance", "haunted house", "haunted mansion",
  "ski resort", "ski lodge", "campground", "garage sale",
  "construction site", "race track", "bowling alley", "art gallery",
  "museum exhibit", "aquarium tank", "planetarium dome", "bakery window",
  "barber shop pole", "dentist office chair", "gas station pump",
  "convenience store aisle", "drive-in movie", "drive-thru window",
  "diner counter", "food truck", "ice cream truck", "taco truck",
  "hot dog cart", "pretzel stand", "lemonade stand", "kissing booth",
  "kissing booth at a fair", "puppet show", "magic show", "talent show",
  "movie premiere red carpet", "rock concert", "stadium concert",
  "opera performance", "ballet performance",

  // Costumes / characters
  "pirate captain", "treasure-hunting pirate", "ninja in black",
  "knight in shining armor", "wizard with staff", "witch on broomstick",
  "vampire with cape", "werewolf in moonlight", "mermaid on a rock",
  "fairy godmother", "unicorn with rainbow mane", "dragon breathing fire",
  "phoenix rising from ashes", "centaur with bow", "minotaur in maze",
  "yeti in the snow", "loch ness monster surfacing", "bigfoot in the woods",
  "leprechaun with pot of gold", "tooth fairy with pillow",
  "easter bunny delivering eggs", "snowman with carrot nose", "scarecrow in field",
  "cowboy on horseback", "astronaut planting a flag", "scuba diver and reef",
  "lumberjack chopping wood", "chef tossing pizza dough",
  "firefighter holding hose", "construction worker with hard hat",
  "magician with top hat",

  // Emotions / abstractions (drawable)
  "love at first sight", "jealousy", "anger", "fear", "terror", "panic",
  "happiness", "joy", "loneliness", "boredom", "shock", "surprise gift",
  "confusion", "exhaustion", "yawning fatigue", "embarrassment",
  "indignation", "smugness", "boredom in class", "daydreaming",
  "stage fright", "stress headache", "headache",

  // Events
  "birthday party scene", "wedding ceremony", "wedding reception",
  "graduation ceremony", "halloween costume party", "halloween parade",
  "first day of school", "last day of school", "summer vacation",
  "thanksgiving dinner", "christmas morning", "easter egg hunt",
  "fourth of july fireworks", "new year's countdown", "valentines day date",
  "trick-or-treating", "campfire sing-along", "movie night", "game night",
  "sleepover", "pillow fight", "potluck dinner", "barbecue cookout",
  "garden party", "tea party", "tea time", "afternoon tea", "high tea",

  // Animals doing things — common
  "cat in a box", "cat napping in a sunbeam", "cat on a windowsill",
  "dog with a bone", "dog playing fetch", "dog wearing a sweater",
  "puppy in a basket", "kitten with yarn",
  "bird in a nest", "bird with a worm", "hamster on a wheel",
  "fish in a fishbowl", "snake in tall grass", "spider in a web",
  "bee on a flower", "monkey with a banana", "elephant spraying water",
  "horse jumping a fence", "horse race", "dolphin jumping out of water",
  "whale breaching the surface", "shark fin in water", "snail on a leaf",
  "ant carrying a leaf", "ladybug on a flower",

  // Tools / hobbies / contraptions
  "fishing rod with reel", "metal detector at the beach", "snow globe",
  "video game controller", "joystick", "bowling pin", "bowling ball with finger holes",
  "boxing glove", "boxing speed bag", "golf club bag", "tennis racket and ball",
  "hockey stick and puck", "skateboard with wheels", "skis crossed at the top",
  "drum kit", "guitar amp", "microphone stand", "dj turntable",

  // Sounds / weather
  "thunderstorm", "lightning striking a tree", "blizzard", "snow flurry",
  "earthquake crack", "tsunami wave", "drought-cracked earth",
  "heat wave shimmer", "tornado siren", "rainbow after rain",
  "morning mist", "fog rolling in", "monsoon rain",

  // Mild idioms (visual)
  "lend a hand", "head in the clouds", "couch potato", "fish out of water",
  "scaredy cat", "lone wolf", "early bird", "night owl", "bookworm",
  "snail mail", "social butterfly", "top dog", "dark horse",
  "going bananas", "going apes", "raining cats and dogs", "in the doghouse",
  "kick the can", "spill the beans",

  // Compound concepts (whimsical, drawable)
  "treasure map with X", "treasure chest overflowing with gold",
  "pirate ship on the horizon", "jolly roger flag", "ship in a bottle",
  "message in a bottle washed ashore", "fortune cookie with paper sticking out",
  "winning lottery ticket", "magic 8 ball answer window",
  "crystal ball with swirling smoke", "ouija board with planchette",
  "magic carpet flying", "genie emerging from a lamp",
  "three wishes granted", "shooting star wish", "wishing well",
  "four-leaf clover", "rabbit's foot keychain", "lucky horseshoe",
  "fortune teller at a table", "tarot card spread",

  // Absurd combinations — the fun stuff
  "turtle on a seesaw", "potato on a skateboard", "potato wearing sunglasses",
  "penguin doing yoga", "penguin in a hot tub", "penguin sliding on ice",
  "cat wearing a top hat", "cat in a business suit", "cat as a barista",
  "elephant riding a bicycle", "elephant balancing on a beach ball",
  "elephant tightrope walking", "hamster lifting weights",
  "hamster running a business", "hamster in a tiny office",
  "walrus in a tuxedo", "walrus surfing", "walrus playing the saxophone",
  "pig flying a kite", "pig in a tutu", "pig sipping coffee",
  "bear playing chess", "bear at a piano recital", "bear knitting a scarf",
  "squirrel reading a newspaper", "squirrel parachuting", "squirrel as a CEO",
  "goldfish using a phone", "goldfish at a tea party",
  "snail on rollerblades", "snail riding a turtle for speed",
  "crab playing tennis", "crab at a knitting circle",
  "pug in a suit and tie", "pug riding a roomba",
  "sheep wearing reading glasses", "sheep at a book club",
  "owl with a graduation cap", "owl reading the newspaper",
  "duck in a bowler hat", "duck detective with magnifying glass",
  "octopus juggling eight balls", "octopus playing eight instruments",
  "octopus typing on eight keyboards", "octopus knitting eight socks",
  "snake doing yoga", "snake wearing pants", "snake in a top hat",
  "lobster at a piano", "lobster claws holding cards",
  "hedgehog in a teacup", "hedgehog on a skateboard",
  "flamingo on a pogo stick", "flamingo in winter clothing",
  "crocodile brushing its teeth", "crocodile at the dentist",
  "frog playing a tuba", "frog on a unicycle", "frog ordering takeout",
  "bunny lifting weights", "bunny at the gym", "bunny in a wig",
  "bee at the gym", "bee delivering mail", "bee in a business suit",
  "toaster wearing a tie", "toaster running away", "haunted vacuum cleaner",
  "sentient toaster", "stressed-out octopus", "octopus in a hurry",
  "pumpkin with sunglasses", "pumpkin riding a unicycle",
  "bowling pin with a beard", "bowling pin in a wedding dress",
  "walking pineapple", "pineapple wearing a crown",
  "wizard banana", "banana on a yoga mat", "banana on a phone call",
  "detective duck", "duck wearing a deerstalker hat",
  "astronaut squirrel", "squirrel on the moon", "moonwalking squirrel",
  "pirate hamster", "hamster captain on a tiny ship",
  "ninja turtle", "turtle in a karate gi", "turtle doing a handstand",
  "cactus wearing a sweater", "cactus with a bandage",
  "sloth running a marathon", "sloth in athletic wear",
  "vampire eating spaghetti", "vampire trying on sunglasses",
  "werewolf at a salon getting a perm", "werewolf as a barber",
  "mummy doing laundry", "mummy in a sauna",
  "ghost making toast", "ghost taking a bath", "ghost vacuuming",
  "zombie playing piano", "zombie at karaoke",
  "skeleton tap-dancing", "skeleton at a yoga class",
  "yeti playing the violin", "yeti hosting a podcast",
  "bigfoot at a tea party", "bigfoot taking a selfie",
  "mermaid riding a bicycle on land", "mermaid using a phone",
  "unicorn at a barbecue", "unicorn on a treadmill",
  "dragon knitting a scarf", "dragon doing pottery",
  "centaur playing soccer", "centaur as a barista",
  "cyclops at the eye doctor", "medusa at a hair salon",
  "witch on a roomba", "witch ordering takeout", "witch in a yoga class",
  "wizard using a smartphone", "wizard at a coffee shop",
  "knight on a tricycle", "knight stuck in a revolving door",
  "pirate at a yoga class", "ninja at a baby shower",
  "cowboy on a unicycle", "cowboy hosting a podcast",
  "astronaut in a hammock", "astronaut watering plants",
  "robot in a rocking chair", "robot baking cookies",
  "alien at a barbecue", "alien tourist taking photos",
  "lumberjack in a tutu", "lumberjack at a ballet class",
  "chef juggling tomatoes", "chef tossing pancakes in the air",
  "firefighter riding a unicorn", "police officer riding a kangaroo",
  "doctor with butterfly wings", "nurse playing the drums",
  "magician pulling spaghetti out of a hat", "magician with a rabbit",
  "clown driving a tractor", "clown with too many balloons",
  "crocodile at a dentist", "shark wearing braces",
  "whale on a skateboard", "dolphin doing the limbo",
  "lobster at a barbecue", "crab at a typewriter",
  "jellyfish doing ballet", "octopus knitting socks",
  "bat at a baby shower", "owl reading the news on TV",
  "polar bear at the beach", "walrus surfing a tsunami",
  "seal balancing flaming torches", "elephant tightrope walking",
  "giraffe doing the limbo", "zebra in a marching band",
  "lion at a piano recital", "tiger having a tea party",
  "leopard doing yoga in spots", "cheetah on a scooter",
  "wolf howling at a lightbulb", "fox riding a bear riding a horse",
  "beaver building a sandcastle at the beach", "otter on a yoga mat",
  "raccoon at an ATM", "raccoon as a chef",
  "squirrel parachuting with an acorn", "chipmunk doing tax returns",
  "hedgehog in a tea kettle", "mole with a periscope",
  "bat sleeping in a hammock", "owl delivering pizza",
  "octopus making coffee for eight customers",
  "pigeon delivering pizza", "robot pouring coffee",
  "pug as a yoga instructor", "ferret in a top hat",

  // Famous-but-easy
  "mona lisa", "starry night painting", "the scream painting",
  "leaning tower of pisa", "eiffel tower", "statue of liberty",
  "big ben clock tower", "great wall of china", "pyramids of giza",
  "sphinx", "stonehenge", "taj mahal", "golden gate bridge",
  "mount rushmore",

  // More compound nouns
  "bird's nest with eggs", "spider web with droplets",
  "anthill cross-section", "beehive with bees", "honeycomb pattern",
  "snake charmer with cobra", "lion tamer with whip",
  "fire breather", "sword swallower", "knife thrower with assistant",
  "trapeze artist mid-swing", "tightrope walker", "human cannonball",
  "stilt walker", "unicyclist juggling", "puppeteer pulling strings",
  "ventriloquist with dummy", "mime trapped in a box",
  "street magician with cards", "fortune teller with crystal ball",

  // Cooking scenes
  "kitchen disaster", "burning toast", "boiling-over pot",
  "exploding microwave", "pancake flip going wrong", "soufflé collapsing",

  // Sports moments
  "soccer goalkeeper save", "basketball slam dunk", "baseball home run",
  "football touchdown dance", "tennis serve", "golf swing",
  "bowling strike", "ice hockey slap shot", "ski jump",
  "skateboard kickflip", "snowboard halfpipe trick",
  "surfing a barrel wave", "olympic ring symbol",

  // Activities
  "campfire roasting marshmallows", "stargazing on a hill",
  "picnic on a blanket", "picnic basket with food", "sunbathing on sand",
  "building a sandcastle", "burying friend in sand", "playing tic-tac-toe",
  "playing chess", "playing checkers", "playing cards",
  "playing video games", "playing hopscotch", "playing leapfrog",
  "playing tag", "playing hide-and-seek",

  // Misc tools-with-context
  "magnifying glass over a fingerprint", "compass pointing north",
  "telescope pointed at the moon", "microscope with slide",
  "stethoscope on a heartbeat", "metal detector finding treasure",
  "swiss army knife unfolded", "tool belt with hammer",

  // Whimsical short combos
  "snail postal service", "cat astronaut", "dog detective",
  "bear barista", "rabbit accountant", "frog DJ", "fox gardener",
  "owl librarian", "duck mailman", "penguin waiter",
  "robot dog walker", "ghost bookkeeper",
];

// ─────────────────────────── HARD ───────────────────────────
const HARD: string[] = [
  // Idioms — visual puns
  "raining cats and dogs", "walking on eggshells", "spill the beans",
  "kick the bucket", "bite the bullet", "cold feet",
  "the elephant in the room", "barking up the wrong tree",
  "two birds with one stone", "let the cat out of the bag",
  "hold your horses", "piece of cake", "couch potato as a career",
  "head in the clouds (literally)", "break a leg", "burning the midnight oil",
  "buttering up the boss", "cutting corners", "the early bird gets the worm",
  "wild goose chase", "fish out of water", "go bananas",
  "hit the hay", "in hot water", "monkey business",
  "on cloud nine", "pulling someone's leg", "no use crying over spilled milk",
  "the ball is in your court", "throw in the towel", "tip of the iceberg",
  "under the weather", "when pigs fly", "you can't judge a book by its cover",
  "a wolf in sheep's clothing", "a chip on your shoulder",
  "a needle in a haystack", "a penny for your thoughts",
  "at the drop of a hat", "back to the drawing board",
  "barking mad", "bee in your bonnet", "between a rock and a hard place",
  "bull in a china shop", "burning bridges", "burying your head in the sand",
  "by the skin of your teeth", "castles in the sky", "caught red-handed",
  "chasing rainbows", "cherry on top", "chip off the old block",
  "clutching at straws", "crocodile tears", "curiosity killed the cat",
  "dance like nobody's watching", "diamond in the rough",
  "don't count your chickens before they hatch",
  "don't put all your eggs in one basket", "dropping like flies",
  "every cloud has a silver lining", "fingers crossed", "flogging a dead horse",
  "frog in your throat", "get cold feet", "ghost in the machine",
  "give the cold shoulder", "go down in flames", "gold digger",
  "grasping at straws", "hair of the dog", "hand to mouth",
  "hands tied behind your back", "happy as a clam",
  "have your cake and eat it too", "hit the books", "hit the nail on the head",
  "hot potato", "ignorance is bliss", "in over your head",
  "iron fist in a velvet glove", "it's all greek to me", "jump ship",
  "knock on wood", "let sleeping dogs lie", "life is a beach",
  "like watching paint dry", "lock, stock and barrel", "loose cannon",
  "lost in translation", "loose lips sink ships", "method to the madness",
  "miss the boat", "money doesn't grow on trees", "more bang for your buck",
  "nip it in the bud", "no man is an island", "off the deep end",
  "off the hook", "on the same page", "out of the blue",
  "out of the frying pan into the fire", "over the moon",
  "paint yourself into a corner", "pearl of wisdom", "play hardball",
  "play it by ear", "pot calling the kettle black", "pulling your hair out",
  "pushing daisies", "putting all your eggs in one basket",
  "rain or shine", "rolling in the deep", "shooting the breeze",
  "shooting fish in a barrel", "silver lining", "sit on the fence",
  "sitting duck", "sleeping with the fishes", "smell a rat",
  "spill the tea", "stab in the back", "stick a fork in it",
  "straw that broke the camel's back", "string of bad luck",
  "take the bull by the horns", "thinking outside the box",
  "throw caution to the wind", "thumb of approval", "tongue in cheek",
  "touch and go", "turn a blind eye", "two-faced",

  // Famous things / places / people (drawable)
  "the mona lisa", "the scream", "the starry night",
  "the eiffel tower", "the great wall of china", "the statue of liberty",
  "stonehenge", "the pyramids of giza", "the leaning tower of pisa",
  "mount rushmore", "the golden gate bridge", "the sphinx", "big ben",
  "the colosseum", "the taj mahal", "the hollywood sign",
  "the sydney opera house", "the parthenon", "the brandenburg gate",
  "the kremlin", "easter island heads", "machu picchu", "the acropolis",
  "santa claus going down a chimney", "frankenstein's monster",
  "dracula in a coffin", "the headless horseman",
  "medusa with snakes for hair", "the cyclops with one eye",
  "the loch ness monster surfacing", "the abominable snowman",

  // Multi-concept / abstract feelings
  "midlife crisis", "writers block", "stage fright", "social media addiction",
  "fashion police", "couch surfing", "speed dating", "the friend zone",
  "the chicken or the egg", "schrodinger's cat", "the trolley problem",
  "fight or flight response", "the butterfly effect", "deja vu",
  "the bermuda triangle", "ufo abduction", "groundhog day repeating",
  "the dog days of summer", "indian summer", "existential crisis",
  "awkward silence", "brain freeze", "writer's cramp",
  "the fountain of youth", "the road less traveled",
  "rose-colored glasses", "the silver lining", "the eye of the storm",
  "the calm before the storm", "the perfect storm",
  "ships passing in the night", "the road to nowhere",
  "the light at the end of the tunnel", "needle in a haystack",
  "the weight of the world on your shoulders", "carrying the torch",
  "the elephant in the corner", "an albatross around your neck",

  // Ironic / quirky / surreal
  "a fish riding a bicycle", "a cat in business attire",
  "a dog playing poker", "a robot drinking coffee",
  "a banana with sunglasses", "a t-rex with tiny arms trying to clap",
  "a sentient toaster on a date", "a stressed-out octopus juggling",
  "alien tourists on a tour bus", "a haunted vacuum cleaner",
  "a giraffe in a phone booth", "a penguin on tropical vacation",
  "a t-rex trying to do push-ups", "a cat herding sheep",
  "a fish climbing a tree", "a snail in the fast lane",
  "a polar bear on a beach vacation", "a chameleon at a paint store",
  "a kangaroo as a boxer", "a cow attempting ballet",
  "a goat as a tax accountant", "a horse betting on horse races",
  "a flamingo on stilts", "a dolphin in a bathtub",
  "a giraffe wearing a turtleneck", "a snake hiring a tailor",

  // Historical / cultural moments
  "the moon landing", "the wright brothers' first flight",
  "the california gold rush", "the ice age", "the renaissance",
  "the wild west shootout", "ancient egypt with pharaohs",
  "the silk road caravan", "the great pyramids being built",
  "discovery of fire", "the first wheel", "the printing press",
  "the industrial revolution", "the roaring twenties flapper",
  "the disco era", "the moon walk dance", "the cold war",

  // Abstract concepts
  "time flying by", "money growing on trees", "the grass is always greener",
  "the cherry on top", "shooting for the moon", "reaching for the stars",
  "the weight of the world", "writer's block as a wall",
  "anxiety as a tangled mess of yarn", "imposter syndrome",
  "fomo (fear of missing out)", "decision fatigue", "analysis paralysis",
  "spring fever", "cabin fever", "wanderlust",
  "post-vacation blues", "monday morning blues",

  // Multi-pun absurdity
  "a CEO penguin in a corner office", "a knight in a microwave",
  "a vampire moonlighting as a barista", "a wizard's tech support",
  "ghost insurance salesman", "a yeti's beach resort",
  "a mummy's spa day", "a centaur trying to get pants that fit",
  "a dragon stuck in a chimney", "a witch on a flight cancellation call",
  "an alien's first job interview", "a dinosaur watching its own museum exhibit",
  "the easter bunny on a treadmill", "santa on a beach in summer",
  "the tooth fairy with a bag of receipts",

  // Highbrow visual puns
  "the eye of the beholder", "the salt of the earth",
  "wolf in sheep's clothing", "lion's share", "swan song",
  "albatross around your neck", "white whale obsession",
  "trojan horse", "achilles heel", "midas touch",
  "pandora's box", "siren's song", "icarus flying too close to the sun",
  "atlas holding up the world", "narcissus admiring his reflection",
  "sisyphus pushing a boulder", "the gordian knot",
];

// Dedupe at module load so accidental within-tier repeats (the list
// is hand-curated and large) don't make the deck. Cross-tier overlap
// is allowed — "snowman" can appear in easy and "snowman with scarf"
// in medium without colliding.
function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of arr) {
    const key = w.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

const POOLS: Record<PollinartComplexity, string[]> = {
  easy: dedupe(EASY),
  medium: dedupe(MEDIUM),
  hard: dedupe(HARD),
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

// Build a shuffled deck per tier — used by the per-chain mixed-tier
// dealing pipeline. Each chain pulls its starting-word choices from
// the deck matching its assigned tier.
export function buildMixedDecks(): Record<PollinartComplexity, string[]> {
  return {
    easy: shuffle(POOLS.easy),
    medium: shuffle(POOLS.medium),
    hard: shuffle(POOLS.hard),
  };
}

// Deal a fixed per-player mix of starting-word choices: 2 easy + 1
// medium + 1 hard, tagged with their tier and shuffled so the easy
// options aren't always presented first. Every player gets the same
// mix, so no one is ever stuck with three hard clues, and the tier
// each chain ends up in is determined by which option the originator
// picks. Cursors are advanced into the caller's deck records so
// successive players don't see duplicates.
export const PICK_CHOICES_MIX: Record<PollinartComplexity, number> = {
  easy: 2,
  medium: 1,
  hard: 1,
};

export function dealMixedChoices(
  decks: Record<PollinartComplexity, string[]>,
  cursors: Record<PollinartComplexity, number>,
): Array<{ word: string; tier: PollinartComplexity }> {
  const out: Array<{ word: string; tier: PollinartComplexity }> = [];
  for (const tier of ["easy", "medium", "hard"] as PollinartComplexity[]) {
    const k = PICK_CHOICES_MIX[tier];
    const picked = dealChoices(decks[tier], cursors[tier], k);
    cursors[tier] += k;
    for (const w of picked) out.push({ word: w, tier });
  }
  return shuffle(out);
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
