import {
  cssVariablesBlock,
  resolvePaletteDefinition,
  tokensFor,
  tokensToCssVariables,
} from "@/lib/admin-palettes";
import type { AdminPaletteSettings } from "@/lib/admin-palettes/types";

/** CSS inițial pe server — evită flash înainte de hidratare */
export function AdminPaletteStyles({
  settings,
}: {
  settings: AdminPaletteSettings;
}) {
  const def = resolvePaletteDefinition(settings);
  const tokens = tokensFor(def, settings.admin_day_night);
  const vars = tokensToCssVariables(tokens, settings.admin_day_night);
  const block = cssVariablesBlock(vars);

  return (
    <style
      id="admin-palette-ssr"
      dangerouslySetInnerHTML={{
        __html: `:root{${block}}`,
      }}
    />
  );
}
