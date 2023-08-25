//@ts-check

/** @type {import('tailwindcss').Config} */
const config = {
	content: ['./src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			colors: {},
		},
	},
	plugins: [
		require('tailwind-scrollbar'),
		require('@tailwindcss/typography'),
	],
};

module.exports = config;
