const themeScript = `
  (function () {
    try {
      var choice = localStorage.getItem("prompt-chain-theme") || "system";
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var theme = choice === "system" ? (prefersDark ? "dark" : "light") : choice;
      document.documentElement.dataset.themeChoice = choice;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.dataset.themeChoice = "system";
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    }
  })();
`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
