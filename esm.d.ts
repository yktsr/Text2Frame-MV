namespace Text2FrameMV {
  /**
   * Text2Frameの文法で書かれた文字列をRPG Maker MV/MZのイベントコマンドリストに変換します。
   * 戻り値にはMapの定義は含まれず、イベントコマンドリストのみが返るため、Mapへの組み込みは各自で行なってください。
   * Converts strings written in Text2Frame syntax into RPG Maker MV/MZ event command lists.
   * The return value only includes the event command list and does not contain the Map definition. Therefore, integration into the Map should be done individually.
   * @param text Text2Frameの文法に従って書かれた文字列
   */
  export function compile(
    text: string
  ): { code: number; parameters: any[]; indent: number }[];

  /**
   * 既存のイベントコマンドリスト(JSONを構造の正とする)に対し、テキスト側の会話文字列だけを
   * 対応スロットへ差し替えます。移動/分岐/スイッチ等の非会話コマンドは変更しません。
   * Overlays only the conversation strings from the text onto the existing command list,
   * leaving non-conversation commands (movement, branches, switches, ...) untouched.
   * @param existing_commands 既存のイベントコマンドリスト（終端コード code:0 を含む）
   * @param new_commands テキストから変換した新しいイベントコマンドリスト（終端コード code:0 を含む）
   */
  export function applyOverlay(
    existing_commands: { code: number; parameters: any[]; indent: number }[],
    new_commands: { code: number; parameters: any[]; indent: number }[]
  ): {
    commands: { code: number; parameters: any[]; indent: number }[];
    warnings: string[];
  };
}

declare module "@yktsr/text2frame-mv" {
  export = Text2FrameMV;
}
declare module "@yktsr/text2frame-mv/Text2Frame.cjs.js" {
  export = Text2FrameMV;
}
declare module "@yktsr/text2frame-mv/Text2Frame.es.mjs" {
  export = Text2FrameMV;
}
declare module "@yktsr/text2frame-mv/Text2Frame.umd.js" {
  export = Text2FrameMV;
}
