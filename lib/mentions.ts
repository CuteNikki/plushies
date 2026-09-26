/**
 * Mentions of other plushies in a description or fact, typed as @Name.
 *
 * They're saved as @[Name](id), so they keep pointing at the right plushie
 * when it's renamed. The name is only a fallback, for once it's deleted.
 */

export type MentionTarget = { id: string; name: string; slug: string };

export type MentionPart = string | { id: string; name: string };

const MENTION = /@\[([^\]\n]*)\]\(([\w-]+)\)/g;

/** Whether a character continues a name or word, e.g. the P in @Peach. */
const WORD = /[\p{L}\p{N}_]/u;

export function mention(target: { id: string; name: string }) {
  return `@[${target.name.replace(/[[\]\n]/g, '')}](${target.id})`;
}

/** The text in pieces: plain text, and the mentions in between. */
export function splitMentions(text: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const match of text.matchAll(MENTION)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ name: match[1], id: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** The ids of the plushies mentioned, e.g. for Mentioned by. */
export function mentionedIds(text: string) {
  return [...text.matchAll(MENTION)].map((match) => match[2]);
}

/** Just the names, for where links can't go, e.g. a link preview. */
export function mentionsToText(
  text: string,
  targets?: ReadonlyMap<string, MentionTarget>
) {
  return text.replace(
    MENTION,
    (_, name: string, id: string) => targets?.get(id)?.name ?? name
  );
}

/**
 * As typed in the form: @Name, with their name now. Deleted plushies become
 * their plain name, so saving again doesn't link someone else by that name.
 */
export function mentionsToEditable(
  text: string,
  targets: ReadonlyMap<string, MentionTarget>
) {
  return text.replace(MENTION, (_, name: string, id: string) => {
    const target = targets.get(id);
    return target ? `@${target.name}` : name;
  });
}

/**
 * Back to how it's saved: each @Name that is a plushie's name becomes a
 * mention. The longest name wins, so @Peach Pie isn't @Peach and " Pie".
 * When several plushies share a name, the ones in `preferred` go first.
 */
export function editableToMentions(
  text: string,
  targets: readonly MentionTarget[],
  preferred: ReadonlySet<string> = new Set()
) {
  const candidates = [...targets].sort(
    (a, b) =>
      b.name.length - a.name.length ||
      Number(preferred.has(b.id)) - Number(preferred.has(a.id))
  );
  let result = '';
  let index = 0;
  while (index < text.length) {
    const at = text.indexOf('@', index);
    if (at === -1) break;
    result += text.slice(index, at);
    index = at + 1;
    // Not in the middle of a word, e.g. an email address.
    if (at > 0 && WORD.test(text[at - 1])) {
      result += '@';
      continue;
    }
    const rest = text.slice(index);
    const target = candidates.find(
      ({ name }) =>
        name &&
        rest.slice(0, name.length).toLowerCase() === name.toLowerCase() &&
        !WORD.test(rest.charAt(name.length))
    );
    if (target) {
      result += mention(target);
      index += target.name.length;
    } else {
      result += '@';
    }
  }
  return result + text.slice(index);
}
