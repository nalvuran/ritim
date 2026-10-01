import type { ButtonHTMLAttributes } from "react";
import { haptic } from "../services/ui";

type Variant = "primary" | "dark" | "soft" | "ghost" | "danger";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; block?: boolean; small?: boolean }

/** Büyük dokunma alanlı, hafif "haptic" geri bildirimli buton. */
export function Button({ variant = "primary", block, small, className = "", onClick, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`btn ${variant}${block ? " block" : ""}${small ? " sm" : ""} ${className}`}
      onClick={e => { haptic(); onClick?.(e); }}
      {...rest}
    />
  );
}
