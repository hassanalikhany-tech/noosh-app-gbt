export default {
  content: ['./index.html', './App.tsx', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  safelist: ['bg-teal-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500'],
  theme: { extend: { colors: { navy: { 900: '#0f172a', 950: '#020617' } }, screens: { xs: '400px' }, fontFamily: { sans: ['Vazirmatn', 'Tahoma', 'sans-serif'] } } },
};
