(() => {
  function normalizeText(text) {
    return String(text || '')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function estimateTokenCount(text) {
    return Math.max(1, Math.round(String(text || '').split(/\s+/).filter(Boolean).length * 1.3));
  }

  function splitParagraphs(text) {
    return normalizeText(text)
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean);
  }

  function chunkParagraphByWords(paragraph, targetTokens, overlapTokens) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    const approxWordsTarget = Math.max(40, Math.round(targetTokens / 1.3));
    const approxWordsOverlap = Math.max(12, Math.round(overlapTokens / 1.3));
    const chunks = [];
    let start = 0;
    while (start < words.length) {
      const end = Math.min(words.length, start + approxWordsTarget);
      chunks.push(words.slice(start, end).join(' '));
      if (end >= words.length) break;
      start = Math.max(start + 1, end - approxWordsOverlap);
    }
    return chunks;
  }

  function buildSmartChunks(text, sourceId, targetTokens = 500, overlapTokens = 100) {
    const paragraphs = splitParagraphs(text);
    const out = [];
    let idx = 0;
    for (const paragraph of paragraphs) {
      const paraTokens = estimateTokenCount(paragraph);
      if (paraTokens <= targetTokens) {
        out.push({
          id: `${sourceId}_chunk_${idx}`,
          chunkIndex: idx,
          text: paragraph,
          tokenCount: paraTokens,
        });
        idx += 1;
        continue;
      }
      const split = chunkParagraphByWords(paragraph, targetTokens, overlapTokens);
      for (const part of split) {
        out.push({
          id: `${sourceId}_chunk_${idx}`,
          chunkIndex: idx,
          text: part,
          tokenCount: estimateTokenCount(part),
        });
        idx += 1;
      }
    }
    return out;
  }

  function tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  function scoreChunk(queryTokens, chunkText, docFreq, totalChunks) {
    const terms = tokenize(chunkText);
    if (!terms.length || !queryTokens.length) return 0;
    const tf = new Map();
    for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
    const lenNorm = Math.sqrt(terms.length);
    let score = 0;
    for (const q of queryTokens) {
      const freq = tf.get(q) || 0;
      if (!freq) continue;
      const df = docFreq.get(q) || 0;
      const idf = Math.log((1 + totalChunks) / (1 + df)) + 1;
      score += (freq / lenNorm) * idf;
    }
    return score;
  }

  function retrieveTopChunks(query, docs, topK = 12) {
    const queryTokens = tokenize(query);
    const allChunks = docs.flatMap(doc =>
      (doc.chunks || []).map(ch => ({
        ...ch,
        docId: doc.id,
        docName: doc.name,
        text: typeof ch === 'string' ? ch : ch.text,
        chunkIndex: typeof ch === 'string' ? 0 : ch.chunkIndex,
        tokenCount: typeof ch === 'string' ? estimateTokenCount(ch) : ch.tokenCount,
      }))
    );
    const docFreq = new Map();
    for (const chunk of allChunks) {
      const uniq = new Set(tokenize(chunk.text));
      for (const t of uniq) docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
    const ranked = allChunks
      .map(chunk => ({
        ...chunk,
        score: scoreChunk(queryTokens, chunk.text, docFreq, allChunks.length),
      }))
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score);
    return (ranked.length ? ranked : allChunks).slice(0, topK);
  }

  window.KlyxeRagEngine = {
    estimateTokenCount,
    buildSmartChunks,
    retrieveTopChunks,
  };
})();
