/**
 * Strips contact details from resume text in the browser, before anything is sent to the AI.
 * The coach doesn't need them to write a good email, so they never leave the device.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// (407) 555-0123, 407.555.0123, +1 407 555 0123, 4075550123
const PHONE = /(?<![\d-])(?:\+?1[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-]?)\d{3}[\s.-]?\d{4}(?![\d-])/g;
// "4000 Central Florida Blvd", "123 N Main St, Apt 4"
const STREET =
  /\b\d{1,6}\s+(?:[NSEW]\.?\s+)?(?:[A-Z][A-Za-z.'-]*\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Way|Parkway|Pkwy|Place|Pl|Trail|Trl|Terrace|Ter)\b\.?(?:,?\s*(?:Apt|Unit|Suite|Ste|#)\.?\s*[\w-]+)?/g;
// ", FL 32816" or "Orlando, Florida 32816-1234"
const ZIP = /,\s*(?:[A-Z]{2}|[A-Z][a-z]+)\s+\d{5}(?:-\d{4})?\b/g;

export function redactContact(text: string): string {
  return text
    .replace(EMAIL, "[email removed]")
    .replace(STREET, "[address removed]")
    .replace(ZIP, "")
    .replace(PHONE, "[phone removed]");
}
