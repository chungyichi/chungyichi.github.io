// The 懷舊 / 現代 switch of the "my games" page (src/MyGames.tsx). Loaded only on that page. Without JavaScript the switch stays hidden and the page is modern.
import { LOOK_KEY, RETRO_CLASS } from "./mygames.mjs";

const page = document.getElementById("mygames");
const toggle = page?.querySelector<HTMLElement>("[data-look-toggle]");
if (page && toggle) {
  const buttons = [...toggle.querySelectorAll<HTMLButtonElement>("button[data-look]")];
  // The inline script has already applied a saved choice; the buttons only follow the class.
  const show = () => {
    const retro = page.classList.contains(RETRO_CLASS);
    for (const button of buttons) button.setAttribute("aria-pressed", String((button.dataset.look === "retro") === retro));
  };
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const look = button.dataset.look === "retro" ? "retro" : "modern";
      page.classList.toggle(RETRO_CLASS, look === "retro");
      try {
        localStorage.setItem(LOOK_KEY, look);
      } catch {
        // private mode: the choice just isn't remembered
      }
      show();
    });
  }
  show();
  toggle.hidden = false;
}
