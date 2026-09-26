"use client";

export default function ShareWhatsApp({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={() => {
        const message = `${text}\n${window.location.href}`;
        window.open(
          `https://wa.me/?text=${encodeURIComponent(message)}`,
          "_blank",
          "noopener,noreferrer"
        );
      }}
    >
      Share on WhatsApp
    </button>
  );
}
