// Web games shown in the Games tab. Each entry is an externally hosted game the
// teacher can play inside the app (embedded iframe) or open in a new browser tab.
// Add a game by appending an entry with a stable id slug and its full https URL
// (matches how ROSTERS / RESOURCES are kept as static manifests).

export interface Game {
  id: string; // stable slug, e.g. "minecraft-explore-english"
  title: string;
  url: string; // full https URL
}

export const GAMES: Game[] = [
  {
    id: "minecraft-explore-english",
    title: "Minecraft Explore English",
    url: "https://minecraft-explore-english.vercel.app/",
  },
  {
    id: "super-toy-world",
    title: "Super Toy World",
    url: "https://super-toy-world.vercel.app/",
  },
];
