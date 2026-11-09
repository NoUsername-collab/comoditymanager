import {
  Cormorant_Garamond,
  Lora,
  Montserrat,
  Nunito,
  Playfair_Display,
  Raleway,
} from "next/font/google";

/*
 * Heading fonts the operator can pick for the public site. Each is declared
 * here once, as a CSS variable on <html>, and never preloaded: a browser
 * downloads a font only when text on the page uses it, so a site pays for its
 * own font alone. Every one carries Latin Extended (ș, ț) and Cyrillic.
 */
const playfair = Playfair_Display({ variable: "--font-pub-playfair", display: "swap", preload: false });
const lora = Lora({ variable: "--font-pub-lora", display: "swap", preload: false });
const cormorant = Cormorant_Garamond({ variable: "--font-pub-cormorant", display: "swap", preload: false });
const montserrat = Montserrat({ variable: "--font-pub-montserrat", display: "swap", preload: false });
const raleway = Raleway({ variable: "--font-pub-raleway", display: "swap", preload: false });
const nunito = Nunito({ variable: "--font-pub-nunito", display: "swap", preload: false });

export const PUBLIC_FONT_VARIABLES = [playfair, lora, cormorant, montserrat, raleway, nunito]
  .map((font) => font.variable)
  .join(" ");
