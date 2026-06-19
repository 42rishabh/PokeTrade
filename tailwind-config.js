tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        retro: ['"Press Start 2P"', "monospace"],
      },
      colors: {
        pokeRed: {
          50: "#7ddde7",
          500: "#114c76",
          600: "#185d91",
          700: "#344a6b",
        },
        pokemon: {
          normal: "#A8A77A",
          fire: "#EE8130",
          water: "#6390F0",
          electric: "#F7D02C",
          grass: "#7AC74C",
          ice: "#96D9D6",
          fighting: "#C22E28",
          poison: "#A33EA1",
          ground: "#E2BF65",
          flying: "#A98FF3",
          psychic: "#F95587",
          bug: "#A6B91A",
          rock: "#B6A136",
          ghost: "#705746",
          dragon: "#6F35FC",
          steel: "#B7B7CE",
          fairy: "#D685AD",
        },
      },
    },
  },
};
