import { Fragment } from "react";

// Only reviewed, explicit product links become anchors. Ordinary copy stays escaped.
const allowed = new Set(["/shop/moon-phase-print", "/shop/birth-sky-map"]);

export function ContextualProductText({ text }: { text: string }) {
  return <>{text.split(/(\[\[[^\]\r\n|]+\|\/shop\/[a-z-]+\]\])/g).map((part, index) => {
    const match = part.match(/^\[\[([^\]\r\n|]+)\|(\/shop\/[a-z-]+)\]\]$/);
    return match && allowed.has(match[2])
      ? <a key={index} href={match[2]} className="halleus-contextual-product-link">{match[1]}</a>
      : <Fragment key={index}>{part}</Fragment>;
  })}</>;
}
