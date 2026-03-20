 "use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X, Droplets } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

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
  categoryLinks?: Array<{ label: string; href: string }>;
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
  categoryLinks,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [mobileCategoryMenuOpen, setMobileCategoryMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setCategoryMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-sky-100 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="relative mx-auto flex w-full max-w-[90rem] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-6">
        <div className="flex w-full items-center justify-between 2xl:w-auto">
          <Link
            href={homeHref}
            className="inline-flex shrink-0 items-center gap-2 font-semibold tracking-tight text-slate-800"
            onClick={() => {
              onHomeClick?.();
              setMobileMenuOpen(false);
                setMobileCategoryMenuOpen(false);
            }}
          >
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
              <Droplets className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg">Sip Purified Water</span>
          </Link>

          <motion.button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            whileTap={{ scale: 0.9 }}
            className="inline-flex rounded-xl border border-sky-200 bg-white p-2 text-slate-700 hover:bg-sky-50 2xl:hidden"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <motion.span
              key={mobileMenuOpen ? "close" : "open"}
              initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="inline-flex"
            >
              {mobileMenuOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </motion.span>
          </motion.button>
        </div>

        <nav className="hidden w-full min-w-0 items-center gap-x-2 gap-y-2 2xl:flex 2xl:w-auto 2xl:flex-nowrap 2xl:justify-end 2xl:gap-2">
          <Link
            href={homeHref}
            className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700"
            onClick={() => {
              onHomeClick?.();
            }}
          >
            Home
          </Link>
          {categoryLinks && categoryLinks.length > 0 ? (
            <div className="relative" ref={categoryMenuRef}>
              <button
                type="button"
                onClick={() => setCategoryMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  categoryMenuOpen
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                }`}
              >
                Categories
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${
                    categoryMenuOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {categoryMenuOpen ? (
                <div className="absolute right-0 top-11 z-50 min-w-[220px] rounded-2xl border border-sky-100 bg-white p-2 shadow-lg shadow-sky-500/10">
                  {categoryLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setCategoryMenuOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {hideAuthButtons && orderHistoryHref ? (
            <Link
              href={orderHistoryHref}
              className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-700"
            >
              View Orders
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

        <AnimatePresence initial={false}>
          {mobileMenuOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute left-4 right-4 top-full z-50 mt-1 rounded-2xl border border-sky-100 bg-white p-2 shadow-sm sm:left-6 sm:right-6 2xl:hidden"
            >
            <div className="flex flex-col gap-1">
              <Link
                href={homeHref}
                onClick={() => {
                  onHomeClick?.();
                  setMobileMenuOpen(false);
                }}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
              >
                Home
              </Link>

              {categoryLinks && categoryLinks.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMobileCategoryMenuOpen((prev) => !prev)}
                    className="inline-flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                  >
                    <span>Categories</span>
                    <ChevronDown
                      className={`size-4 transition-transform duration-200 ${
                        mobileCategoryMenuOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {mobileCategoryMenuOpen ? (
                    <div className="ml-2 flex flex-col gap-1 border-l border-sky-100 pl-2">
                      {categoryLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => {
                            setMobileCategoryMenuOpen(false);
                            setMobileMenuOpen(false);
                          }}
                          className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}

              {hideAuthButtons && orderHistoryHref ? (
                <Link
                  href={orderHistoryHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                >
                  View Orders
                </Link>
              ) : null}

              {viewUsersHref ? (
                <Link
                  href={viewUsersHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                >
                  View Users
                </Link>
              ) : null}

              {manageOrdersHref ? (
                <Link
                  href={manageOrdersHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                >
                  Manage Orders
                </Link>
              ) : null}

              {!hideAuthButtons ? (
                <div className="mt-1 flex flex-col gap-2">
                  {onLoginClick ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLoginClick();
                      }}
                      className="rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    >
                      Login
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    >
                      Login
                    </Link>
                  )}

                  {onSignupClick ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onSignupClick();
                      }}
                      className="rounded-xl bg-sky-500 px-3 py-2 text-left text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600"
                    >
                      Sign Up
                    </button>
                  ) : (
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600"
                    >
                      Sign Up
                    </Link>
                  )}
                </div>
              ) : (
                <div className="mt-1 flex flex-col gap-2 border-t border-sky-100 pt-2">
                  {profileHref ? (
                    <Link
                      href={profileHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                    >
                      My profile
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogoutClick?.();
                    }}
                    className="rounded-xl bg-sky-500 px-3 py-2 text-left text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-600"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}

