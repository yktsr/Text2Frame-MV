const chai = require('chai');
const expect = chai.expect;
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mcpRoots, mcpArgs, mcpLabel } = require('../out/mcpRoots');

/* 同梱の MCP サーバをどのフォルダに差し出すか。vscode を使う側(src/mcpProvider.ts)は
 * ここを呼ぶだけなので、判断はここで見る。
 *
 * いちばん大事なのは「フォルダごとに1つ」。1つにまとめると、祖先(.t2f-base)の鍵が
 * テキストの置き場所で分かれる約束と噛み合わず、別のプロジェクトが鍵を取り合う。 */
describe('mcp server roots', function () {
    let tmp;

    const project = function (name, dataDir) {
        const root = path.join(tmp, name);
        fs.mkdirSync(path.join(root, dataDir || 'data'), { recursive: true });
        fs.writeFileSync(path.join(root, dataDir || 'data', 'System.json'), '{}');
        return root;
    };

    beforeEach(function () {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't2f-mcp-roots-'));
    });
    afterEach(function () {
        try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    });

    it('offers one server per RPG Maker project folder', function () {
        const a = project('aquarium');
        const b = project('another');

        expect(mcpRoots([a, b], 'data')).to.eql([a, b]);
    });

    /* ツクールのプロジェクトでないフォルダは出さない(道具が何も答えられないため)。 */
    it('leaves out a folder without data/System.json', function () {
        const good = project('game');
        const plain = path.join(tmp, 'notes');
        fs.mkdirSync(plain);

        expect(mcpRoots([plain, good], 'data')).to.eql([good]);
    });

    it('follows the configured data folder', function () {
        const root = project('game', 'ゲームデータ');

        expect(mcpRoots([root], 'data')).to.eql([]);
        expect(mcpRoots([root], 'ゲームデータ')).to.eql([root]);
    });

    it('says nothing when there is no folder at all', function () {
        expect(mcpRoots([], 'data')).to.eql([]);
        expect(mcpRoots([''], 'data')).to.eql([]);
    });

    it('does not offer the same folder twice', function () {
        const root = project('game');

        expect(mcpRoots([root, root], 'data')).to.eql([root]);
    });

    /* 設定を変えている人のところでエディタと MCP が別のフォルダを見ると、祖先の鍵が
     * 分かれて3方向マージが狂う。だから既定に任せず必ず渡す。 */
    it('always passes both folders to the server', function () {
        const args = mcpArgs('/ext/lib/t2f-mcp.js', '/game', 'ゲームデータ', 'ほんやく');

        expect(args).to.eql([
            '/ext/lib/t2f-mcp.js',
            '--root', '/game',
            '--data-dir', 'ゲームデータ',
            '--text-dir', 'ほんやく'
        ]);
    });

    it('names the folder only when there is more than one', function () {
        expect(mcpLabel('/path/to/aquarium', 1)).to.equal('Text2Frame');
        expect(mcpLabel('/path/to/aquarium', 2)).to.equal('Text2Frame (aquarium)');
    });
});
