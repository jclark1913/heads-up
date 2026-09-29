export function exportWords(title: string, words: readonly string[]) {
  const url = URL.createObjectURL(
    new Blob([words.join('\n')], { type: 'text/plain;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download =
    ([...title.trim()]
      .map((character) => (character.codePointAt(0)! < 32 ? '-' : character))
      .join('')
      .replace(/[<>:"/\\|?*]/g, '-')
      .slice(0, 80) || 'my-deck') + '.txt'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
