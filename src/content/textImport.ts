import { checkInputSize, collectCards } from './importPreview'

export type TextDelimiter = 'lines' | 'commas' | 'tabs' | 'whitespace'
const separators: Record<TextDelimiter, RegExp> = {
  lines: /\r\n|[\r\n]/,
  commas: /[,،]|\r\n|[\r\n]/,
  tabs: /\t|\r\n|[\r\n]/,
  whitespace: /\s/u,
}
export function parseText(input: string, delimiter: TextDelimiter) {
  checkInputSize(input)
  return collectCards(input.replace(/^\uFEFF/, '').split(separators[delimiter]))
}
