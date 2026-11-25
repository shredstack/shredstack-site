import Image from "next/image";
import Link from "next/link";
import { SOCIAL_LINKS, SocialIcon } from "./SocialLinks";

export function Footer() {
  return (
    <footer className="bg-surface-950 text-surface-300 py-12 border-t border-surface-800">
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/shredstack_logo.png"
                alt="ShredStack"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-xl font-bold">
                <span className="text-gradient-rainbow">Shred</span>
                <span className="text-white">Stack</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-surface-400">
              AI & Data Engineer building cool things.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Navigation
            </h3>
            <div className="flex flex-col gap-2">
              <Link href="/about" className="text-sm hover:text-accent-400 transition-colors">
                About
              </Link>
              <Link href="/projects" className="text-sm hover:text-accent-400 transition-colors">
                Projects
              </Link>
              <Link href="/blog" className="text-sm hover:text-accent-400 transition-colors">
                Blog
              </Link>
              <Link href="/partners" className="text-sm hover:text-accent-400 transition-colors">
                Partners
              </Link>
              <Link href="/contact" className="text-sm hover:text-accent-400 transition-colors">
                Contact
              </Link>
              <Link href="/disclosure" className="text-sm hover:text-accent-400 transition-colors">
                Affiliate Disclosure
              </Link>
            </div>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Connect
            </h3>
            <div className="flex gap-4">
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-surface-400 ${link.hoverClass} transition-colors`}
                  aria-label={link.label}
                >
                  <SocialIcon link={link} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-surface-800 text-sm text-surface-500 space-y-2">
          <p>
            Some links on this site are affiliate links. If you buy through them I may earn a small
            commission at no extra cost to you.{" "}
            <Link href="/disclosure" className="underline hover:text-accent-400 transition-colors">
              Learn more
            </Link>
          </p>
          <p>&copy; {new Date().getFullYear()} Sarah Dorich. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
