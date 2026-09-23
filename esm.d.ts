declare namespace Text2FrameMV {
  /** RPG Maker MV/MZ のイベントコマンド1つ / One RPG Maker MV/MZ event command. */
  export interface EventCommand {
    code: number;
    indent: number;
    parameters: any[];
  }

  /** 反映のしかた / How text is applied to the game. */
  export type Strategy = 'add' | 'merge' | 'overwrite';

  /**
   * Text2Frameの文法で書かれた文字列をRPG Maker MV/MZのイベントコマンドリストに変換します。
   * 戻り値にはMapの定義は含まれず、イベントコマンドリストのみが返るため、Mapへの組み込みは各自で行なってください。
   * Converts strings written in Text2Frame syntax into RPG Maker MV/MZ event command lists.
   * The return value only includes the event command list and does not contain the Map definition. Therefore, integration into the Map should be done individually.
   * @param text Text2Frameの文法に従って書かれた文字列
   * @param opts lineMap を true にすると、各コマンドが出てきたテキストの行番号(0始まり)も返します。
   */
  export function compile(text: string): EventCommand[];
  export function compile(text: string, opts: { lineMap: true }): { commands: EventCommand[]; lineMap: number[] };
  export function compile(text: string, opts?: { lineMap?: boolean }): EventCommand[] | { commands: EventCommand[]; lineMap: number[] };

  /**
   * テキストの先頭の見出し(--- で囲んだ部分)と本文を分けます。見出しが無ければ meta は空です。
   * Splits the front matter (between --- lines) from the body.
   */
  export function parseFrontMatter(text: string): { meta: Record<string, string>; body: string; header: string };

  /**
   * 反映のしかたの名前を確かめます。省略すると merge、知らない名前は null です。
   * Normalizes a strategy name; undefined means merge, unknown names give null.
   */
  export function resolveStrategy(name?: string | null): { strategy: Strategy } | null;

  /** メッセージの背景と位置の既定値 / The default message background and window position. */
  export function getMessageDefaults(): { background: number; windowPosition: number };

  /**
   * 祖先(base)・ゲーム(ours)・テキスト(theirs)の3つのコマンド列を統合します。同じ所を別々に変えていたら、
   * 両方を衝突の目印つきで残します。keepOurs / keepTheirs を渡すと、目印の代わりにその側の版を入れた列も返します。
   * Three-way merges base, ours (game) and theirs (text). Conflicts keep both sides between markers.
   */
  export function applyThreeWayMerge(
    base: EventCommand[],
    ours: EventCommand[],
    theirs: EventCommand[],
    options?: { keepOurs?: boolean; keepTheirs?: boolean }
  ): {
    commands: EventCommand[];
    commandsOurs?: EventCommand[];
    commandsTheirs?: EventCommand[];
    conflicts: number;
    warnings: string[];
  };

  /**
   * 2つのコマンド列が、テキストにしたときに区別できない差しか持たないかを返します。
   * Whether two command lists differ only in ways the text cannot show.
   */
  export function commandsEqual(a: EventCommand[], b: EventCommand[]): boolean;

  /**
   * 作り直した本文に、元のテキストのコメント行・空行の幅・タグ行の書き方を戻します。
   * approximate は、手掛かりが無く位置があやしいコメント行の件数です。
   * Restores comment lines and the author's spacing/tag spelling from the original body.
   */
  export function restoreAuthoredLines(
    originalBody: string,
    regeneratedBody: string,
    commentOutChar?: string
  ): { text: string; approximate: number; styleRestored: boolean };

  /**
   * ゲームのコマンド列をテキストへ統合して取り出します(Frame2Text が必要)。
   * text はテキストに書く内容、gameCommands はゲームへ書く内容(衝突したときは目印つき)です。
   * Merges the game's commands into the text (pull). Requires Frame2Text.
   */
  export function applyMergePull(opts: {
    gameCommands: EventCommand[];
    textBody?: string;
    baseBody?: string;
    englishTag?: boolean;
    omitDefaults?: boolean;
  }): { text: string; gameCommands: EventCommand[]; conflicts: number; warnings: string[] };

  /**
   * テキストファイル1つをゲームのデータへ反映します。反映先はテキストの見出しから決まり、opts で上書きできます。
   * 統合(merge)のあとは、結果をテキストにも書き戻します。投げずに ok と error で返します。
   * Applies one text file to the game data; the target comes from the front matter unless given.
   */
  export function applyTextFile(opts: {
    textPath: string;
    strategy?: Strategy;
    kind?: 'event' | 'common';
    mapId?: string | number;
    eventId?: string | number;
    pageId?: string | number;
    mapPath?: string;
    commonEventId?: string | number;
    commonEventPath?: string;
    /** 祖先(.t2f-base)を置くプロジェクトの場所 / Project root for .t2f-base */
    baseRoot?: string;
    /** 祖先のテキストを直接指定するとき / An explicit ancestor text path */
    basePath?: string;
    isDebug?: boolean;
  }): {
    ok: boolean;
    textPath: string;
    kind?: 'event' | 'common';
    target?: { kind: 'event' | 'common'; mapId?: string; eventId?: string; pageId?: string; commonEventId?: string };
    dataPath?: string;
    warnings: string[];
    conflicts: number;
    writtenBack?: boolean;
    writeBackPath?: string;
    writeBackText?: string;
    error?: string;
    errorLine?: number;
    errorLineText?: string;
  };

  /**
   * コマンド列を、そのままゲームのデータへ書きます。投げずに ok と error で返します。
   * Writes a command list straight into the game data.
   */
  export function applyCommandsToData(opts: {
    kind?: 'event' | 'common';
    commands: EventCommand[];
    mapId?: string | number;
    eventId?: string | number;
    pageId?: string | number;
    mapPath?: string;
    commonEventId?: string | number;
    commonEventPath?: string;
  }): { ok: boolean; dataPath?: string; error?: string };

  /** テキストに対応する祖先の鍵(テキストのパスから) / The ancestor key from a text file's path. */
  export function deriveBaseId(textPath: string, root?: string): { key: string };

  /**
   * 祖先の鍵を、front matter が指す宛先から決めます。テキストの名前を変えても移動しても同じ鍵になります。
   * 宛先が分からないときは deriveBaseId と同じ(パスから決める)。
   * The ancestor key for the target the front matter names; renaming or moving the text keeps it.
   */
  export function baseIdForTarget(
    textPath: string,
    root: string | undefined,
    target?: { kind?: 'event' | 'common'; mapId?: string | number; eventId?: string | number; pageId?: string | number; commonEventId?: string | number }
  ): { key: string };

  /** テキストのフォルダに対応する祖先(.t2f-base)のフォルダ / The ancestor folder for a text folder. */
  export function baseDirForTextDir(root: string, textDir: string): string;

  /** 祖先のテキストを読みます。無ければ null / Reads an ancestor text, or null. */
  export function readBaseText(root: string, key: string): string | null;

  /** 祖先のテキストを書きます。書けなければ投げます / Writes an ancestor text; throws on failure. */
  export function saveBaseText(root: string, key: string, text: string): void;
}

declare namespace Frame2TextMV {
  type EventCommand = Text2FrameMV.EventCommand;

  /** 取り出す対象1件 / One pull target. */
  export interface Target {
    kind: 'event' | 'common';
    mapId?: string;
    eventId?: string;
    pageId?: string;
    commonEventId?: string;
    /** テキストのファイル名(拡張子なし)にも使う鍵 / Also the text file name without extension */
    key: string;
  }

  /** Frame2Text の版 / The Frame2Text version. */
  export const VERSION: string;

  /**
   * イベントコマンドの配列を Text2Frame のテキストに戻します。
   * Converts an event command list back into Text2Frame text.
   * @param englishTag タグを英語で書くか / Write tags in English
   */
  export function decompile(
    commands: EventCommand[],
    englishTag: boolean,
    options?: { pretty?: boolean; translationOnly?: boolean; omitDefaults?: boolean }
  ): string;

  /** 書き出すテキストの見出しを作ります / Renders the front matter for a text file. */
  export function renderFrontMatter(
    entry: { mapId?: string | number; eventId?: string | number; pageId?: string | number; commonEventId?: string | number },
    kind: 'event' | 'common'
  ): string;

  /**
   * 取り出すテキストを組み立てます(ファイルは書きません)。統合(merge)のときは既存のテキスト・祖先と合わせ、
   * ゲームにも書くものがあれば writeBack に入れます。目印が残っていて統合できないときは skipped が付きます。
   * Builds the text to pull without writing files.
   */
  export function buildPullText(opts: {
    list: EventCommand[];
    strategy?: 'merge' | 'overwrite';
    existingText?: string;
    previousText?: string;
    baseText?: string;
    fallbackHeader?: string;
    englishTag?: boolean;
    omitDefaults?: boolean;
  }): {
    text?: string;
    baseText?: string;
    writeBack?: { commands: EventCommand[] } | null;
    conflicts: number;
    markers?: boolean;
    approximate?: number;
    warnings?: string[];
    skipped?: 'game' | 'text';
  };

  /**
   * テキストのフォルダを走査し、front matter が指す行き先からファイルの場所を引ける表を作ります。
   * 同じ行き先のテキストが2つ以上あるものは duplicates に入ります(書き先が決められません)。
   * Indexes a text folder by the target its front matter names.
   */
  export function indexTexts(textDir: string): { paths: { [key: string]: string }; duplicates: { [key: string]: string[] } };

  /**
   * 取り出しの書き先。同じ行き先のテキストが既にあればその場所、無ければ既定の名前。
   * Where to write a pull: the existing text for that target, or the default name.
   */
  export function outPathFor(textDir: string, index: { paths: { [key: string]: string } } | undefined, target: Target): string;

  /**
   * data フォルダから、取り出せるイベントのページとコモンイベントを並べます。
   * onlyFile を渡すと、そのデータファイルの分だけにします。
   * Lists pull targets in a data folder.
   */
  export function enumerateTargets(dataDir: string, onlyFile?: string): Target[];

  /**
   * 1件をテキストへ取り出します。テキストと祖先を書き、必要ならゲームにも書きます。投げずに ok と error で返します。
   * Pulls one target into a text file (and its ancestor).
   */
  export function pullTargetToText(opts: {
    dataDir: string;
    target: Target;
    outPath: string;
    baseDir: string;
    englishTag?: boolean;
    omitDefaults?: boolean;
    strategy?: 'merge' | 'overwrite';
  }): {
    ok: boolean;
    skipped?: 'game' | 'text';
    text?: string;
    conflicts?: number;
    markers?: boolean;
    wroteGame?: boolean;
    dataPath?: string;
    overwritten?: boolean;
    approximate?: number;
    warnings?: string[];
    baseSaveError?: Error | null;
    error?: string;
  };

  /**
   * buildPullText が返した writeBack をゲームのデータへ書きます(Text2Frame が必要)。
   * Writes buildPullText's writeBack into the game data. Requires Text2Frame.
   */
  export function writeBackToGame(
    writeBack: { commands: EventCommand[] } | null | undefined,
    target: Target | { kind: 'event' | 'common'; mapId?: string; eventId?: string; pageId?: string; commonEventId?: string },
    paths: { mapPath?: string; commonEventPath?: string }
  ): { ok: boolean; dataPath?: string; error?: string };

  /** テキストのフォルダに対応する祖先(.t2f-base)のフォルダ / The ancestor folder for a text folder. */
  export function baseDirForTextDir(root: string, textDir: string): string;
}

declare module "@yktsr/text2frame-mv" {
  export = Text2FrameMV;
}
declare module "@yktsr/text2frame-mv/Text2Frame.js" {
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
declare module "@yktsr/text2frame-mv/Frame2Text.js" {
  export = Frame2TextMV;
}
