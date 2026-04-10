// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        'elos-verde': '#4a5d4e',     // Cor principal (Verde Musgo)
        'elos-bege': '#d2b48c',      // Detalhes (Bege/Dourado)
        'elos-fundo': '#fdfaf5',     // Fundo creme suave
        'elos-texto': '#333d35',
      },
      fontFamily: {
        tradicional: ['Georgia', 'serif'], // Para títulos e elegância
        moderna: ['Segoe UI', 'sans-serif'], // Para números e dados (facilita leitura)
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.05)', // Sombra profissional, não pesada
      }
    },
  },
}