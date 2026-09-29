export interface Prompt {
  id: string
  text: string
}
export interface Bank {
  id: string
  title: string
  schemaVersion: 1
  version: number
  source: 'builtin' | 'custom'
  language?: 'en' | 'ar'
  description: string
  prompts: Prompt[]
}

const words = {
  en: [
    'Elephant',
    'Brushing your teeth',
    'Superhero',
    'Ice cream',
    'Playing football',
    'Giraffe',
    'Taking a selfie',
    'Astronaut',
    'Popcorn',
    'Riding a bicycle',
    'Penguin',
    'Making a pizza',
    'Robot',
    'Butterfly',
    'Reading a book',
    'Dinosaur',
    'Swimming',
    'Sunglasses',
    'Playing the guitar',
    'A rainy day',
  ],
  ar: [
    'فيل',
    'تنظيف الأسنان',
    'بطل خارق',
    'آيس كريم',
    'لعب كرة القدم',
    'زرافة',
    'التقاط صورة',
    'رائد فضاء',
    'فشار',
    'ركوب الدراجة',
    'بطريق',
    'صنع البيتزا',
    'روبوت',
    'فراشة',
    'قراءة كتاب',
    'ديناصور',
    'سباحة',
    'نظارة شمسية',
    'عزف الغيتار',
    'يوم ممطر',
  ],
}
export const banks: Bank[] = [
  {
    id: 'en-mix',
    schemaVersion: 1,
    version: 1,
    source: 'builtin',
    title: 'A little of everything',
    language: 'en',
    description: 'Animals, everyday things & a little imagination.',
    prompts: words.en.map((text, i) => ({ id: 'en-' + i, text })),
  },
  {
    id: 'ar-mix',
    schemaVersion: 1,
    version: 1,
    source: 'builtin',
    title: 'قليل من كل شيء',
    language: 'ar',
    description: 'The same easygoing mix, with Arabic cards.',
    prompts: words.ar.map((text, i) => ({ id: 'ar-' + i, text })),
  },
]
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.max(0, Math.min(0.999999999, random())) * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
