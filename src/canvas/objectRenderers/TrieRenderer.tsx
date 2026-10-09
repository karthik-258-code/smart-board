import type { TrieObject } from '../../domain/model'

type TrieLayoutNode = { char: string; prefix: string; terminal: boolean; x: number; y: number; children: TrieLayoutNode[] }
type MutableTrieNode = { char: string; prefix: string; terminal: boolean; children: Map<string, MutableTrieNode> }

function layoutTrie(words: string[]): TrieLayoutNode {
  const root: MutableTrieNode = { char: '∅', prefix: '', terminal: false, children: new Map() }
  for (const word of words) {
    let node = root
    let prefix = ''
    for (const char of word) {
      prefix += char
      if (!node.children.has(char)) node.children.set(char, { char, prefix, terminal: false, children: new Map() })
      node = node.children.get(char)!
    }
    node.terminal = true
  }
  let leaf = 0
  const arrange = (node: MutableTrieNode, depth: number): TrieLayoutNode => {
    const children = [...node.children.values()].sort((a, b) => a.char.localeCompare(b.char)).map((child) => arrange(child, depth + 1))
    const y = children.length ? children.reduce((sum, child) => sum + child.y, 0) / children.length : leaf++ * 56
    return { char: node.char, prefix: node.prefix, terminal: node.terminal, x: 26 + depth * 62, y: 36 + y, children }
  }
  return arrange(root, 0)
}

function flatten(node: TrieLayoutNode): TrieLayoutNode[] {
  return [node, ...node.children.flatMap(flatten)]
}

export function TrieRenderer({ object }: { object: TrieObject }) {
  const root = layoutTrie(object.words)
  const nodes = flatten(root)
  return <g className="trie-object">
    <text className="trie-title" x="0" y="-10">TRIE · {object.words.length} WORDS</text>
    {nodes.slice(1).map((node) => {
      const parent = nodes.find((candidate) => node.prefix.length === candidate.prefix.length + 1 && node.prefix.startsWith(candidate.prefix))!
      return <line className="trie-edge" key={node.prefix} x1={parent.x} y1={parent.y} x2={node.x} y2={node.y} />
    })}
    {object.words.length === 0 && <text className="trie-empty" x="0" y="35">Empty trie · insert a word in the inspector</text>}
    {nodes.map((node) => <g className={`trie-node${node.terminal ? ' trie-terminal' : ''}`} data-prefix={node.prefix} key={node.prefix || 'root'} transform={`translate(${node.x} ${node.y})`}>
      <circle r="17" /><text textAnchor="middle" dominantBaseline="middle">{node.char}</text>{node.terminal && <circle className="trie-terminal-mark" cx="12" cy="-12" r="4" />}
    </g>)}
  </g>
}
