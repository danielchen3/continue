export interface ExtensionBlock {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  targetWord: string; // 要附着的目标词汇
}

export interface ParsedContent {
  mainContent: string;
  extensions: ExtensionBlock[];
  hasExtensions: boolean; // 新增：标记是否包含扩展
}

export function parseExtendedContent(text: string): ParsedContent {
  const extensions: ExtensionBlock[] = [];
  let mainContent = text;
  let extensionCounter = 0;

  const extensionRegex = /(\b[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*)\{\|([^}]+?)\|\}/g;
  let match;

  const matches: Array<{ match: RegExpExecArray; id: string }> = [];

  while ((match = extensionRegex.exec(text)) !== null) {
    const id = `extension-${extensionCounter++}`;
    matches.push({ match, id });
  }

  for (let i = matches.length - 1; i >= 0; i--) {
    const { match, id } = matches[i];
    const [fullMatch, targetWord, content] = match;
    const startIndex = match.index!;
    const endIndex = startIndex + fullMatch.length;

    extensions.unshift({
      id,
      content: content.trim(),
      startIndex,
      endIndex,
      targetWord: targetWord.trim(),
    });

    mainContent =
      mainContent.slice(0, startIndex) +
      targetWord +
      mainContent.slice(endIndex);
  }

  return {
    mainContent,
    extensions,
    hasExtensions: extensions.length > 0,
  };
}

export function hasExtensions(text: string): boolean {
  return /\b[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*\{\|[^}]+?\|\}/.test(text);
}
