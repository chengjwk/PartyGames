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

export function randomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}
