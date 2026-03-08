import type { JQueryStatic } from "jquery";

declare global {
  interface Window {
    $: JQueryStatic;
    jQuery: JQueryStatic;
    d3: typeof import("d3");
    c3: typeof import("c3");
  }
}

export {};
