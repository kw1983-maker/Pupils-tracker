// Web games shown in the Games tab. Each entry is a game the teacher can play
// inside the app (embedded iframe) or open in a new browser tab. Add a game by
// appending an entry with a stable id slug and a URL (matches how ROSTERS /
// RESOURCES are kept as static manifests).

export interface Game {
  id: string; // stable slug, e.g. "minecraft-explore-english"
  title: string;
  // Full https URL for an externally hosted game, OR a root-relative path to a
  // self-contained page shipped in public/ (e.g. "/games/spelling-game-board.html").
  // Games.tsx uses this only as an iframe src / anchor href, so both work.
  url: string;
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
  {
    id: "spelling-game-board",
    title: "The Spelling Game",
    url: "/games/spelling-game-board.html",
  },
];
