<script>
  import { icon } from "../actions";
  import { untrack } from "svelte";

  let { onChange, initialMode = "html" } = $props();

  let mode = $state(untrack(() => $state.snapshot(initialMode)));

  function setMode(newMode) {
    if (mode === newMode) return;
    mode = newMode;
    // 触发操作，调用回调
    onChange?.(mode);
  }
</script>

<div class="toggle-container">
  <button class:active={mode === "html"} onclick={() => setMode("html")}>
    <span use:icon={"globe"} class="icon"></span>
    <span style:margin-left="2px">HTML</span>
  </button>
  <button class:active={mode === "pdf"} onclick={() => setMode("pdf")}>
    <span use:icon={"notebook"} class="icon"></span>
    <span style:margin-left="2px">PDF</span>
  </button>
</div>

<style>
  .toggle-container {
    display: flex;
    gap: 0px;
    text-align: right;
    justify-content: right;
    position: absolute;
    top: 0;
    right: 0;
    z-index: 99;
  }

  button {
    height: 24px;
    width: 56px;
    padding: 2px 4px;
    border: 0px solid #ccc;
    background: white;
    cursor: pointer;
    border-radius: 0px;
    display: flex;
    justify-content: center;
    line-height: 14px;
    gap: 2px;
    font-size: 12px;
  }
  button.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }
</style>
