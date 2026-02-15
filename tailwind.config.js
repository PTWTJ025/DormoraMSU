/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
    "./src/**/*.component.{html,ts}",
    "./src/**/*.component.{html,ts,css}"
  ],
  safelist: [
    'w-[300px]','h-[170px]','rounded-[22px]','shadow-[0_8px_28px_rgba(0,0,0,.12)]',
    'border','border-slate-200','bg-white','overflow-hidden',
    'px-5','pt-4','pb-5','mt-3','mt-4','gap-3','gap-1',
    'text-[22px]','leading-7','font-extrabold','text-slate-900',
    'text-[16px]','leading-6','text-slate-800',
    'text-[14px]','leading-5','text-slate-400','font-bold',
    'fill-yellow-400','fill-slate-300','w-[18px]','h-[18px]',
    'font-thai','object-cover','flex','items-center'
  ],
  
  theme: {
    extend: {
      fontFamily: {
        'thai': ['Noto Sans Thai', 'sans-serif'],
        'english': ['Inter', 'sans-serif'],
      },
      spacing: {
        '0.45': '0.45rem',
      },
    },
  },
  plugins: [],
}

 