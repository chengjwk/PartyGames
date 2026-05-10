const ADJECTIVES = [
  "Brave", "Clever", "Witty", "Sneaky", "Mighty", "Sleepy", "Happy", "Speedy",
  "Sparkly", "Grumpy", "Cheery", "Cozy", "Fancy", "Goofy", "Jazzy", "Lucky",
  "Plucky", "Quirky", "Snazzy", "Spunky", "Zippy", "Wobbly", "Bouncy", "Twirly",
  "Lanky", "Fluffy", "Bubbly", "Dapper", "Jolly", "Nifty",
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
