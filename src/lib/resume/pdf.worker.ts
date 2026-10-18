// pdf.js reads the PDF in this Web Worker so a big file never freezes the page.
// Importing the worker build is enough: it starts listening as soon as it loads inside a worker.
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
