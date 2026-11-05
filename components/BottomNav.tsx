"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  active: "home" | "explore" | "profile" | null;
  /** On the home page these open the editor / profile sheet in place; elsewhere they link back home. */
  onWrite?: () => void;
  onProfile?: () => void;
};

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const HomeIcon = icon(<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />);
const ExploreIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </>,
);
const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
const UserIcon = icon(
  <>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
  </>,
);

export default function BottomNav({ active, onWrite, onProfile }: Props) {
  const cls = (k: string) => `tab${active === k ? " active" : ""}`;
  return (
    <nav className="bottom-nav" aria-label="Main">
      <Link href="/" className={cls("home")} aria-current={active === "home" ? "page" : undefined}>
        <span className="tab-ico">{HomeIcon}</span>
        <span>Home</span>
      </Link>
      <Link href="/explore" className={cls("explore")} aria-current={active === "explore" ? "page" : undefined}>
        <span className="tab-ico">{ExploreIcon}</span>
        <span>Explore</span>
      </Link>
      {onWrite ? (
        <button className="tab tab-write" onClick={onWrite} aria-label="New writing">
          <span className="tab-fab">{PlusIcon}</span>
          <span>Write</span>
        </button>
      ) : (
        <Link href="/?write=1" className="tab tab-write" aria-label="New writing">
          <span className="tab-fab">{PlusIcon}</span>
          <span>Write</span>
        </Link>
      )}
      {onProfile ? (
        <button className={cls("profile")} onClick={onProfile}>
          <span className="tab-ico">{UserIcon}</span>
          <span>Profile</span>
        </button>
      ) : (
        <Link href="/?me=1" className={cls("profile")}>
          <span className="tab-ico">{UserIcon}</span>
          <span>Profile</span>
        </Link>
      )}
    </nav>
  );
}
