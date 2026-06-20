import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'

export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '500', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})
