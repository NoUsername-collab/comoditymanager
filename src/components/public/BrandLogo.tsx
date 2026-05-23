import { readFile } from "fs/promises";
import path from "path";
import { BrandMarkSvg } from "./BrandMarkSvg";

type Props = {
  /** Dimensiune fixă (px) — alternativă la className pe shell */
  size?: number;
  className?: string;
  animated?: boolean;
};

const LOGO_ONYX_PATHS = ["logo/logo.png", "public/logo/logo.png"];
const LOGO_LIGHT_BG_PATHS = [
  "logo/logo-dark.png",
  "logo/logo-on-light.png",
  "public/logo/logo-dark.png",
];

/** Header: ~64px mobil, ~72px desktop */
const DEFAULT_SHELL = "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]";

async function loadLogo(paths: string[]): Promise<string | null> {
  for (const rel of paths) {
    try {
      const buf = await readFile(path.join(process.cwd(), rel));
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      continue;
    }
  }
  return null;
}

function shellBox(className: string, size?: number) {
  const classes = ["relative shrink-0 overflow-hidden"];
  if (className) {
    classes.push(className);
  } else if (size == null) {
    classes.push(DEFAULT_SHELL);
  }
  const style =
    size != null
      ? {
          width: size,
          height: size,
          maxWidth: size,
          maxHeight: size,
        }
      : undefined;
  return { className: classes.join(" "), style };
}

function LogoImages({
  onyxSrc,
  lightBgSrc,
  px,
}: {
  onyxSrc: string;
  lightBgSrc: string | null;
  px: number;
}) {
  const imgClass = "brand-logo-img h-full w-full object-contain";

  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={onyxSrc}
        alt="Casa Emil"
        width={px}
        height={px}
        className={`brand-logo-img--onyx-bg absolute inset-0 ${imgClass}`}
        decoding="async"
      />
      {lightBgSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lightBgSrc}
          alt=""
          aria-hidden
          width={px}
          height={px}
          className={`brand-logo-img--light-bg absolute inset-0 ${imgClass}`}
          decoding="async"
        />
      )}
    </div>
  );
}

/** Logo PNG — dimensiune pe container; vizibil pe toate paletele. */
export async function BrandLogo({
  size,
  className = "",
  animated = true,
}: Props) {
  const onyxSrc = await loadLogo(LOGO_ONYX_PATHS);
  const lightBgSrc = await loadLogo(LOGO_LIGHT_BG_PATHS);
  const { className: boxClass, style: boxStyle } = shellBox(className, size);
  const px = size ?? 64;

  if (onyxSrc) {
    const imgs = (
      <LogoImages onyxSrc={onyxSrc} lightBgSrc={lightBgSrc} px={px} />
    );

    if (!animated) {
      return (
        <div className={boxClass} style={boxStyle}>
          {imgs}
        </div>
      );
    }

    return (
      <div className={`brand-logo-shell ${boxClass}`} style={boxStyle}>
        {imgs}
      </div>
    );
  }

  return (
    <BrandMarkSvg size={size} animated={animated} className={className} />
  );
}
