import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// Importando o novo plugin específico para o Tailwind v4
import tailwindcss from '@tailwindcss/postcss' 
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ótica Elos - Gestão',
        short_name: 'ÓticaElos',
        description: 'Sistema de gestão financeira e clientes - Ótica Elos',
        theme_color: '#4a5d4e', // Seu verde musgo
        background_color: '#fdfaf5', // Fundo creme
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any' 
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(), // Aciona o motor do Tailwind v4
        autoprefixer(),
      ],
    },
  },
})