<script lang="ts">
  import { type ParamType } from "./render";
  import { SquareCheckBig, Loader } from "@lucide/svelte";

  interface Props {
    startCount: number;
  }

  let { startCount }: Props = $props();

  let renderStates = $state<{ filename: string; status: number }[]>([]);

  export function initRenderStates(data: ParamType[]) {
    data.forEach((param) => {
      renderStates.push({ status: 0, filename: param.file.name });
    });
  }
  export function updateRenderStates(i: number) {
    renderStates[i].status = 1;
  }
</script>

<div class="progress">
  <div>Rendering...</div>
  {#each renderStates as item}
    <div>
      {#if item.status}
        <SquareCheckBig size="14" />
      {:else}
        <Loader size="14" />
      {/if}
      {item.filename}
    </div>
  {/each}
</div>

<style>
  .progress {
    font-size: 14px;
  }
</style>
