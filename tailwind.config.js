/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        trabalho: '#3B82F6',
        sono: '#8B5CF6',
        rotina: '#6B7280',
        alimentacao: '#F59E0B',
        treino: '#EF4444',
        estudo: '#10B981',
        cardio: '#F97316',
        mobilidade: '#EC4899',
        lazer: '#06B6D4',
        leitura: '#84CC16',
      },
    },
  },
  plugins: [],
};
