import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { nextTick, onMounted, watch } from "vue";
import { useRoute } from "vitepress";

async function drawDiagrams() {
  const nodes = document.querySelectorAll<HTMLElement>(".mermaid");
  if (!nodes.length) {
    return;
  }
  const { default: mermaid } = await import("mermaid");
  const dark = document.documentElement.classList.contains("dark");
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: dark ? "dark" : "default",
    flowchart: {
      curve: "basis",
      nodeSpacing: 48,
      rankSpacing: 52,
      padding: 18,
      wrappingWidth: 200,
      htmlLabels: true,
      useMaxWidth: true,
    },
  });
  nodes.forEach((node) => node.removeAttribute("data-processed"));
  await mermaid.run({ nodes });
}

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute();
    const render = () => {
      void nextTick()
        .then(() => drawDiagrams())
        .catch((error) => console.error(error));
    };
    onMounted(render);
    watch(
      () => route.path,
      () => {
        void nextTick().then(render);
      },
    );
  },
} satisfies Theme;
