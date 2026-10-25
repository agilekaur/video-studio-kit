import React from "react";
import { createRoot } from "react-dom/client";
import { TryIt } from "./TryIt.jsx";

function mount() {
  const root = document.getElementById("vs-try");
  if (!root) return;
  createRoot(root).render(<TryIt exampleBase="v/" />);
  // every effect card on the page gets a "Try on your video" button
  document.querySelectorAll("article.card[id]").forEach((card) => {
    const meta = card.querySelector(".meta");
    if (!meta || meta.querySelector(".try-card-btn")) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "try-card-btn";
    b.textContent = "Try on your video";
    b.addEventListener("click", () => window.vsTry && window.vsTry(card.id));
    meta.appendChild(b);
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
else mount();
