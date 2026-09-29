import Papa from 'papaparse'
import { deckLimits } from './decks'
import { checkInputSize, collectCards } from './importPreview'

export type ImportFormat = 'text' | 'csv' | 'json'
export type CsvDelimiter = ',' | ';' | '\t'

export function formatForFile(name: string): ImportFormat {
  const extension = name.split('.').pop()?.toLowerCase()
  if (extension === 'txt') return 'text'
  if (extension === 'csv' || extension === 'json') return extension
  throw new Error('Choose a .txt, .csv, or .json file.')
}

export function decodeWordFile(buffer: ArrayBuffer): string {
  if (buffer.byteLength > deckLimits.bytes)
    throw new Error('This file is larger than 1 MiB. Choose a smaller file.')
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    if (text.includes('\0')) throw new Error('NUL character')
    return text
  } catch {
    throw new Error(
      'This file is not readable UTF-8 text. Save it as UTF-8 and try again.',
    )
  }
}

export async function readWordFile(file: File) {
  const format = formatForFile(file.name)
  if (file.size > deckLimits.bytes)
    throw new Error('This file is larger than 1 MiB. Choose a smaller file.')
  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch {
    throw new Error(
      'This file could not be opened. Choose it again or paste its text.',
    )
  }
  return { input: decodeWordFile(buffer), format }
}

export function readCsv(input: string, delimiter: CsvDelimiter) {
  checkInputSize(input)
  const parsed = Papa.parse<string[]>(input.replace(/^\uFEFF/, ''), {
    delimiter,
    header: false,
    dynamicTyping: false,
    skipEmptyLines: false,
  })
  if (parsed.errors.length) {
    const error = parsed.errors[0]
    const location =
      error.row === undefined ? '' : ' near record ' + (error.row + 1)
    throw new Error('CSV could not be read' + location + ': ' + error.message)
  }
  const rows = parsed.data
  const firstRow = rows.find((row) => row.some((cell) => cell.trim()))
  const columnCount = firstRow?.length ?? 1
  // A bounded selector also prevents a malformed file from creating thousands of controls.
  if (columnCount > 100)
    throw new Error(
      'CSV supports up to 100 columns. Export only the columns you need.',
    )
  rows.forEach((row, index) => {
    if (row.some((cell) => cell.trim()) && row.length !== columnCount)
      throw new Error(
        'CSV record ' +
          (index + 1) +
          ' has ' +
          row.length +
          ' columns; expected ' +
          columnCount +
          '. Correct the source text or CSV separator.',
      )
  })
  return { rows, columnCount }
}

export function parseCsv(
  input: string,
  options: {
    delimiter: CsvDelimiter
    header: boolean
    column: number
  },
) {
  const { rows, columnCount } = readCsv(input, options.delimiter)
  if (
    !Number.isInteger(options.column) ||
    options.column < 0 ||
    options.column >= columnCount
  )
    throw new Error('Choose a card column that exists in this CSV.')
  const firstSource = options.header ? 2 : 1
  const values = rows
    .slice(firstSource - 1)
    .map((row) =>
      row.every((cell) => !cell.trim()) ? '' : row[options.column],
    )
  return collectCards(values, { firstSource, flattenNewlines: true })
}

export function parseJson(input: string) {
  checkInputSize(input)
  let value: unknown
  try {
    value = JSON.parse(input.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error(
      'JSON could not be read. Check its quotes, commas, and brackets.',
    )
  }
  let words: unknown[]
  let title: string | undefined
  if (Array.isArray(value)) words = value
  else if (
    value &&
    typeof value === 'object' &&
    'words' in value &&
    Array.isArray(value.words) &&
    Object.keys(value).every((key) => key === 'words' || key === 'title')
  ) {
    words = value.words
    if ('title' in value) {
      if (typeof value.title !== 'string')
        throw new Error('The JSON title must be text.')
      title = value.title
    }
  } else {
    throw new Error(
      'Use a JSON list of strings or an object with "words" and an optional "title".',
    )
  }
  return { ...collectCards(words, { flattenNewlines: true }), title }
}
