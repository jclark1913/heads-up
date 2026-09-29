import { useLayoutEffect, useRef } from 'react'

export function FittedPrompt({
  text,
  language,
  hiddenFromReader,
}: {
  text: string
  language?: string
  hiddenFromReader: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current!
    const fit = () => {
      let size = Math.min(112, Math.max(32, element.clientWidth / 7))
      element.style.fontSize = size + 'px'
      while (
        (element.scrollHeight > element.clientHeight + 1 ||
          element.scrollWidth > element.clientWidth + 1) &&
        size > 24
      ) {
        size -= 2
        element.style.fontSize = size + 'px'
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [text])
  return (
    <div
      className="prompt-text"
      ref={ref}
      dir="auto"
      lang={language}
      aria-hidden={hiddenFromReader}
    >
      {text}
    </div>
  )
}
