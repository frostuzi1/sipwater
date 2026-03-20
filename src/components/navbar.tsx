 "use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Droplets } from "lucide-react";

type NavbarProps = {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  hideAuthButtons?: boolean;
  homeHref?: string;
  userName?: string;
  onHomeClick?: () => void;
  onLogoutClick?: () => void;
  profileHref?: string;
  orderHistoryHref?: string;
  viewUsersHref?: string;
  manageOrdersHref?: string;
};

export function Navbar({
  onLoginClick,
  onSignupClick,
  hideAuthButtons = false,
  homeHref = "/",
  userName,
  onHomeClick,
  onLogoutClick,
  profileHref,
  orderHistoryHref,
  viewUsersHref,
  manageOrdersHref,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-6">
        <Link
          href={homeHref}
          className="inline-flex shrink-0 items-center gap-2 font-semibold tracking-tight text-slate-800"
          onClick={() => {
            onHomeClick?.();
          }}
        >
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
            <Droplets className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg">Sip Purified Water</span>
        </Link>

        <nav className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:w-auto sm:justify-end sm:gap-2">
          <Link
            href={homeHref}
            className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700"
            onClick={() => {
              onHomeClick?.();
            }}
          >
            Home
          </Link>
          {hideAuthButtons && orderHistoryHref ? (
            <Link
              href={orderHistoryHref}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700"
            >
              Order history
            </Link>
          ) : null}
          {viewUsersHref ? (
            <Link
              href={viewUsersHref}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700"
            >
              View Users
            </Link>
          ) : null}
          {manageOrdersHref ? (
            <Link
              href={manageOrdersHref}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700"
            >
              Manage Orders
            </Link>
          ) : null}
          {!hideAuthButtons && (
            <>
              {onLoginClick ? (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                >
                  Login
                </button>
              ) : (
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                >
                  Login
                </Link>
              )}
              {onSignupClick ? (
                <button
                  type="button"
                  onClick={onSignupClick}
                  className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600"
                >
                  Sign Up
                </button>
              ) : (
                <Link
                  href="/signup"
                  className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600"
                >
                  Sign Up
                </Link>
              )}
            </>
          )}
          {hideAuthButtons && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  menuOpen
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-sky-100 bg-white text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                }`}
              >
                <span className="text-xs tracking-wide text-sky-600">
                  Account
                </span>
                <span>{userName ?? "User"}</span>
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {menuOpen ? (
                <div className="absolute left-0 top-12 z-50 min-w-[230px] rounded-2xl border border-sky-100 bg-white p-2 shadow-lg shadow-sky-500/10 animate-in fade-in zoom-in-95 duration-150 sm:left-auto sm:right-0">
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    >
                      My profile
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogoutClick?.();
                    }}
                    className="mt-2 w-full rounded-xl bg-sky-500 px-3 py-2 text-left text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

