const tokenize = (json: string) => {
  const parts: Array<{ text: string; className: string }> = [];
  const regex =
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\],:]/g;

  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(json)) !== null) {
    if (match.index > last) {
      parts.push({ text: json.slice(last, match.index), className: "" });
    }

    const token = match[0];
    let className = "text-foreground/80";

    if (/^"/.test(token) && json[match.index + token.length] === ":") {
      className = "text-primary";
    } else if (/^"/.test(token)) {
      className = "text-secondary";
    } else if (/true|false|null/.test(token)) {
      className = "text-amber-400";
    } else if (/^-?\d/.test(token)) {
      className = "text-cyan-400";
    } else if (/[{}\[\]]/.test(token)) {
      className = "text-muted-foreground";
    }

    parts.push({ text: token, className });
    last = match.index + token.length;
  }

  if (last < json.length) {
    parts.push({ text: json.slice(last), className: "" });
  }

  return parts;
};

interface JsonSyntaxHighlightProps {
  code: string;
  showLineNumbers?: boolean;
}

export const JsonSyntaxHighlight = ({
  code,
  showLineNumbers = true,
}: JsonSyntaxHighlightProps) => {
  const lines = code.split("\n");

  return (
    <pre className="font-mono text-[13px] leading-6">
      {lines.map((line, lineIdx) => {
        const tokens = tokenize(line);
        return (
          <div key={lineIdx} className="flex">
            {showLineNumbers && (
              <span className="mr-4 inline-block w-8 shrink-0 select-none text-right text-muted-foreground/50">
                {lineIdx + 1}
              </span>
            )}
            <span className="min-w-0 flex-1">
              {tokens.map((token, i) => (
                <span key={i} className={token.className}>
                  {token.text}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </pre>
  );
};
