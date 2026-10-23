import { useEffect, useState } from "react";

export function useTypewriter(phrases: string[], active: boolean) {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!active) {
      setText("");
      return;
    }
    const phrase = phrases[phraseIndex % phrases.length];
    const done = !deleting && text === phrase;
    const cleared = deleting && text === "";

    const delay = done ? 1600 : cleared ? 200 : deleting ? 18 : 34;
    const id = setTimeout(() => {
      if (done) {
        setDeleting(true);
      } else if (cleared) {
        setDeleting(false);
        setPhraseIndex((i) => (i + 1) % phrases.length);
      } else {
        setText(deleting ? phrase.slice(0, text.length - 1) : phrase.slice(0, text.length + 1));
      }
    }, delay);

    return () => clearTimeout(id);
  }, [text, deleting, phraseIndex, phrases, active]);

  return text;
}
