// 検索用の文字列正規化と、よく使う言い方の言い換え。

/** カタカナ→ひらがな、全角英数→半角、記号・空白の除去、小文字化 */
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s　＜＞<>［］[\]（）()・、，,。/／:：]/g, '')
}

// 普段の呼び方 → 成分表での書き方（どちらかに当たればヒット）
const SYNONYMS: Record<string, string[]> = {
  ごはん: ['めし精白米うるち米'],
  ご飯: ['めし精白米うるち米'],
  白米: ['めし精白米うるち米'],
  米: ['こめ'],
  豚: ['ぶた'],
  豚肉: ['ぶた'],
  牛: ['うし'],
  牛肉: ['うし'],
  鶏: ['にわとり'],
  鶏肉: ['にわとり'],
  とり: ['にわとり'],
  卵: ['鶏卵'],
  たまご: ['鶏卵'],
  玉子: ['鶏卵'],
  玉ねぎ: ['たまねぎ'],
  玉葱: ['たまねぎ'],
  人参: ['にんじん'],
  大根: ['だいこん'],
  白菜: ['はくさい'],
  胡瓜: ['きゅうり'],
  茄子: ['なす'],
  南瓜: ['かぼちゃ'],
  馬鈴薯: ['じゃがいも'],
  ポテト: ['じゃがいも'],
  鮭: ['さけ'],
  サーモン: ['さけ', 'ますのすけ'],
  鯖: ['さば'],
  鰤: ['ぶり'],
  鯵: ['あじ'],
  ツナ: ['まぐろ類缶詰'],
  ちくわ: ['竹輪'],
  さつまあげ: ['さつま揚げ'],
  厚揚げ: ['生揚げ'],
  あつあげ: ['生揚げ'],
  ゆで卵: ['全卵ゆで'],
  ゆでたまご: ['全卵ゆで'],
  昆布: ['こんぶ'],
  ささみ: ['ささみ'],
  鶏もも: ['にわとりもも'],
  鶏むね: ['にわとりむね'],
  手羽: ['手羽'],
  パン: ['パン類'],
  ヨーグルト: ['ヨーグルト'],
  納豆: ['糸引き納豆'],
  豆腐: ['豆腐'],
  味噌: ['みそ'],
  醤油: ['しょうゆ'],
  砂糖: ['上白糖'],
  お茶: ['茶'],
  コーヒー: ['コーヒー浸出液'],
  ジュース: ['ジュース'],
}

/** クエリ（空白区切り）を、各語の候補リストに展開する */
export function expandQuery(q: string): string[][] {
  return q
    .split(/[\s　]+/)
    .filter(Boolean)
    .map((w) => {
      const alts = [w, ...(SYNONYMS[w] ?? [])]
      return [...new Set(alts.map(normalize))].filter(Boolean)
    })
    .filter((alts) => alts.length > 0)
}

/** 全ての語（のいずれかの言い換え）を含むか */
export function matches(haystackNormalized: string, terms: string[][]): boolean {
  return terms.every((alts) => alts.some((a) => haystackNormalized.includes(a)))
}

/** 並び順用のスコア（小さいほど上位） */
export function score(haystackNormalized: string, terms: string[][]): number {
  let s = haystackNormalized.length / 100
  for (const alts of terms) {
    const pos = Math.min(...alts.map((a) => {
      const p = haystackNormalized.indexOf(a)
      return p < 0 ? 999 : p
    }))
    s += pos
  }
  return s
}
