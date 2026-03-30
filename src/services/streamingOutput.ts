/**
 * Stream text output with typing effect
 * Updates a message gradually instead of showing it all at once
 */

export interface StreamOptions {
  delayPerChar?: number // ms between character updates (default 5)
  delayPerLine?: number // ms between line updates (default 30)
  useLineDelay?: boolean // if true, update per line instead of per char
  minCharsPerUpdate?: number // minimum chars to show in each update (default 1)
}

export async function streamText(
  text: string,
  onProgress: (currentText: string) => void,
  options: StreamOptions = {},
): Promise<void> {
  const {
    delayPerChar = 5,
    delayPerLine = 30,
    useLineDelay = false,
    minCharsPerUpdate = 1,
  } = options

  if (!useLineDelay) {
    // Stream character by character with small delay
    let accumulated = ''
    for (let i = 0; i < text.length; i++) {
      accumulated += text[i]
      
      // Update less frequently for better performance
      if ((i + 1) % minCharsPerUpdate === 0 || i === text.length - 1) {
        onProgress(accumulated)
        await sleep(delayPerChar)
      }
    }
  } else {
    // Stream line by line
    const lines = text.split('\n')
    let accumulated = ''
    
    for (let i = 0; i < lines.length; i++) {
      accumulated += lines[i]
      if (i < lines.length - 1) {
        accumulated += '\n'
      }
      onProgress(accumulated)
      await sleep(delayPerLine)
    }
  }
}

/**
 * Specialized streaming for code blocks
 * Detects code and uses block-aware streaming
 */
export async function streamCode(
  text: string,
  onProgress: (currentText: string) => void,
  options: StreamOptions = {},
): Promise<void> {
  const isCode = /^(import|from|def|class|function|const|let|var|async|await|=>)/m.test(text)
  
  if (isCode) {
    // For code: stream line by line for better readability
    await streamText(text, onProgress, {
      ...options,
      useLineDelay: true,
      delayPerLine: options.delayPerLine ?? 20,
    })
  } else {
    // For regular text: stream character by character
    await streamText(text, onProgress, {
      ...options,
      delayPerChar: options.delayPerChar ?? 3,
    })
  }
}

/**
 * Simple sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
