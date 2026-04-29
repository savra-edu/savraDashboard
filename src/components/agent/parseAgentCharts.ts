export type AgentSegment =
  | { kind: 'markdown'; text: string }
  | { kind: 'chart'; json: string };

/** Split assistant markdown on ```chart blocks */
export function splitAssistantContent(content: string): AgentSegment[] {
  const segments: AgentSegment[] = [];
  const re = /```chart\s*\n?([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (match.index > cursor) {
      segments.push({ kind: 'markdown', text: content.slice(cursor, match.index) });
    }
    segments.push({ kind: 'chart', json: match[1].trim() });
    cursor = match.index + match[0].length;
  }
  if (cursor < content.length) {
    segments.push({ kind: 'markdown', text: content.slice(cursor) });
  }
  if (segments.length === 0) {
    segments.push({ kind: 'markdown', text: content });
  }
  return segments;
}
