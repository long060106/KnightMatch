import { Fragment, type CSSProperties } from "react";

/**
 * A headline whose words rise one by one out of their own masks when the page opens (CSS only, so
 * it plays from the prerendered HTML and on every client-side navigation). Same effect as the home
 * page headline; reduced motion shows the words straight away.
 */
export function RisingWords({ text }: { text: string }) {
  return text.split(" ").map((word, i) => (
    <Fragment key={i}>
      {i > 0 && " "}
      <span className="km-word-mask">
        <span className="km-word" style={{ "--i": i } as CSSProperties}>
          {word}
        </span>
      </span>
    </Fragment>
  ));
}
