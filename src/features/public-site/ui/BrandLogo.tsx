import { getTranslations } from "next-intl/server";
import { getBrandLogoAssets } from "@/lib/brand-logo-cache";
import { BrandMarkSvg } from "./BrandMarkSvg";

type Props = {
  /** Dimensiune fixă (px) — alternativă la className pe shell */
  size?: number;
  className?: string;
  animated?: boolean;
  /** LCP hero logo in public header */
  priority?: boolean;
};

/** Header: ~64px mobil, ~72px desktop */
const DEFAULT_SHELL = "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]";

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
  alt,
  priority = false,
}: {
  onyxSrc: string;
  lightBgSrc: string | null;
  px: number;
  alt: string;
  priority?: boolean;
}) {
  const imgClass = "brand-logo-img h-full w-full object-contain";

  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={onyxSrc}
        alt={alt}
        width={px}
        height={px}
        className={`brand-logo-img--onyx-bg absolute inset-0 ${imgClass}`}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : "lazy"}
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
  priority = false,
}: Props) {
  const tShell = await getTranslations("public.shell");
  const { onyx: onyxSrc, lightBg: lightBgSrc } = await getBrandLogoAssets();
  const { className: boxClass, style: boxStyle } = shellBox(className, size);
  const px = size ?? 64;

  if (onyxSrc) {
    const imgs = (
      <LogoImages
        onyxSrc={onyxSrc}
        lightBgSrc={lightBgSrc}
        px={px}
        alt={tShell("brandFallback")}
        priority={priority}
      />
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
