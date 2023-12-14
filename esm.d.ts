declare module "Text2Frame-MV/Text2Frame.mjs" {
  /**
   * ここに関数の説明文を書く
   * @param text コマンドテキスト
   */
  export function convert(
    text: string
  ): { code: number; parameters: any[]; indent: number }[];
}
