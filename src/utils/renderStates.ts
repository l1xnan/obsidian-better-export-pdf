export interface RenderState {
  filename: string;
  status: number;
}

interface FileItem {
  file: { name: string };
}

/** 从文件列表初始化渲染状态数组 */
export function initRenderStates<T extends FileItem>(data: T[]): RenderState[] {
  return data.map((item) => ({ status: 0, filename: item.file.name }));
}

/** 标记第 index 个文件渲染完成（返回新数组，配合 $state 使用） */
export function completeRenderState(states: RenderState[], index: number): RenderState[] {
  states[index].status = 1;
  return [...states];
}
