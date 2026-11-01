import { tr } from './db/lang';

/*
 * 「操作」の画面から設定へ飛ぶためのひと揃い。vscode に依存しない(src/db/* と同じ約束)ので、
 * テストから直接呼べる。vscode を使う側は src/commandsView.ts。
 *
 * 設定は VS Code の設定画面にあって辿り着きにくい。名指しで開けるようにするのが目的で、
 * 開くときの合い言葉(@id: と @ext:)の作り方はここだけが知っている。
 */

export const EXTENSION_ID = 'yktsr.text2frame-language-support';

export interface SettingLink {
    /** package.json の設定の名前(text2frame. より後ろ)。 */
    key: string;
    label: string;
    /** 名前の横に薄く出す分類。package.json の見出しと揃える。 */
    note: string;
}

/** その設定ひとつだけを開く合い言葉。 */
export function settingQuery(key: string): string {
    return '@id:text2frame.' + key;
}

/** この拡張の設定をまとめて開く合い言葉。 */
export function allSettingsQuery(): string {
    return '@ext:' + EXTENSION_ID;
}

/** 名前と分類は、呼ばれたときの言語で選ぶ。 */
export function settingLinks(): SettingLink[] {
    const apply = tr('反映・取り出し', 'Apply and pull');
    const write = tr('テキストを書く', 'Writing');
    const play = tr('テストプレイ', 'Test play');
    const deep = tr('上級', 'Advanced');
    return [
        { key: 'exportScope', label: tr('取り出す範囲', 'What to pull'), note: apply },
        { key: 'strategy', label: tr('反映のしかた', 'How to apply'), note: apply },
        { key: 'reviewBeforeApply', label: tr('反映の前に見せる', 'Review before applying'), note: apply },
        { key: 'englishTag', label: tr('タグを英語で書く', 'English tags'), note: apply },
        { key: 'omitDefaultTags', label: tr('既定のタグを省く', 'Omit default tags'), note: apply },
        { key: 'history.keep', label: tr('控えを残す回数', 'How much history to keep'), note: apply },
        { key: 'textBaseDir', label: tr('テキストの置き場所', 'Text folder'), note: apply },
        { key: 'dataDir', label: tr('ゲームデータの置き場所', 'Game data folder'), note: apply },
        { key: 'messageCheck', label: tr('はみ出しを知らせる', 'Warn when text overflows'), note: write },
        { key: 'messageLineLength', label: tr('1行に入る文字数', 'Characters per line'), note: write },
        { key: 'showDatabaseNames', label: tr('番号に名前を添える', 'Show database names'), note: write },
        { key: 'usageContextLines', label: tr('使っている箇所の前後', 'Context lines for usages'), note: write },
        { key: 'testPlayPage', label: tr('テストプレイで開くページ', 'Test play page'), note: play },
        { key: 'openRunningText', label: tr('実行中のテキストを開く', 'Open the running text'), note: play },
        { key: 'tryEvent.clearPlayerTransparency', label: tr('試すとき透明を解く', 'Clear transparency when trying'), note: play },
        { key: 'modulePath', label: tr('本体のパス', 'Path to the compiler'), note: deep }
    ];
}
