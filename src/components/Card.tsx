import type { HTMLAttributes, ReactNode } from "react";
export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`surface ${className}`} {...rest} />;
}
export function Section({ title, action, children, id }: { title?: string; action?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="sec" aria-labelledby={title ? id : undefined}>
      {title && <div className="sec-h"><h2 id={id}>{title}</h2>{action}</div>}
      {children}
    </section>
  );
}
export function Empty({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="surface center">
      <p style={{ fontWeight: 600 }}>{title}</p>
      {text && <p className="muted small" style={{ marginTop: 4 }}>{text}</p>}
      {children}
    </div>
  );
}
