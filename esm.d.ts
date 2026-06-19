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
   * 既存のイベントコマンドリストとテキストから変換した新コマンドリストを比較し、差分のみを適用します。
   * Compares existing event commands with newly compiled commands and applies only the differences.
   * @param existing_commands 既存のイベントコマンドリスト（終端コード code:0 を含む）
   * @param new_commands テキストから変換した新しいイベントコマンドリスト（終端コード code:0 を含む）
   */
  export function applyDiff(
    existing_commands: { code: number; parameters: any[]; indent: number }[],
    new_commands: { code: number; parameters: any[]; indent: number }[]
  ): {
    commands: { code: number; parameters: any[]; indent: number }[];
    warnings: string[];
  };
}

declare module "Text2Frame-MV" {
  export = Text2FrameMV;
}
declare module "Text2Frame-MV/Text2Frame.cjs.js" {
  export = Text2FrameMV;
}
declare module "Text2Frame-MV/Text2Frame.es.js" {
  export = Text2FrameMV;
}
declare module "Text2Frame-MV/Text2Frame.umd.js" {
  export = Text2FrameMV;
}
