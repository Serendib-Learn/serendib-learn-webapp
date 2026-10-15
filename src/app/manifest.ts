import type { MetadataRoute } from "next";

/**
 * Makes the site installable — "Add to Home Screen" on a phone, "Install" in
 * desktop Chrome and Edge — the way the original serendib.learn prototype
 * was, with the same icons. Opens straight into the portal.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Serendib Learn — Sinhala & Tamil, taught by Sri Lankans",
    short_name: "Serendib",
    description:
      "Personally vetted Sri Lankan tutors for Sinhala and Tamil, with your lessons, materials and practice partners in one place.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    background_color: "#F7F3ED",
    theme_color: "#1B4332",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
