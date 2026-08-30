import { createContext, useContext, type ReactNode } from "react";

export const AD_PLACEMENTS = [
  "home_primary",
  "search_infeed_1",
  "detail_after_description",
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];
export type AdRenderer = (placement: AdPlacement) => ReactNode;

const AdRendererContext = createContext<AdRenderer | null>(null);

export function AdSlotProvider({
  renderer,
  children,
}: {
  renderer: AdRenderer | null;
  children: ReactNode;
}) {
  return <AdRendererContext.Provider value={renderer}>{children}</AdRendererContext.Provider>;
}

export function AdSlot({
  placement,
  container = "div",
  className,
}: {
  placement: AdPlacement;
  container?: "div" | "li";
  className?: string;
}) {
  const renderer = useContext(AdRendererContext);
  if (!renderer) return null;
  const content = renderer(placement);
  if (content == null) return null;
  if (container === "li") {
    return (
      <li data-ad-placement={placement} className={className}>
        {content}
      </li>
    );
  }
  return (
    <div data-ad-placement={placement} className={className}>
      {content}
    </div>
  );
}
