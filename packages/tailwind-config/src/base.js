/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // Next.js app directory
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // Next.js pages directory (legacy)
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    // Components directory
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // Src directory (for apps using src folder)
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // Shared UI components from monorepo
    "../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'spin-fast': 'spin 0.5s linear infinite',
      },
    },
  },
  plugins: [
    // Plugins communs seront ajoutés ici si nécessaire
  ],
}