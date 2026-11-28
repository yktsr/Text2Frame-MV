const { expect } = require('chai');
const { commentCharFrom, SHIPPED_COMMENT_CHAR } = require('../out/commentChar');

/* 画面の色分けと反映は、同じ文字を見なければならない。食い違うと**コメント行が本文として
 * 色分けされ、本文がコメントとして消える**。だから決め方を本体と同じ3段にして、ここで固める。
 *
 *   設定 > そのゲームの plugins.js(プラグインが実際に入っているときだけ) > 出荷時の `%`
 */
describe('which character starts a comment line', function () {
    const pluginsJs = function (parameters, status) {
        return 'var $plugins =\n' + JSON.stringify([
            { name: 'Community_Basic', status: true, description: '', parameters: {} },
            { name: 'Text2Frame', status: status !== false, description: '', parameters }
        ], null, 1) + ';\n';
    };
    const sharp = pluginsJs({ 'Comment Out Char': '#' });

    it('takes what the setting says, over the game', function () {
        expect(commentCharFrom(';', sharp, true)).to.equal(';');
    });

    it('takes the game\'s own setting when the setting is empty', function () {
        expect(commentCharFrom('', sharp, true)).to.equal('#');
    });

    /* 項目だけ残してプラグインを消した形。その設定はゲームの中で何も動かしていない。 */
    it('ignores the game when the plugin itself is not there', function () {
        expect(commentCharFrom('', sharp, false)).to.equal(SHIPPED_COMMENT_CHAR);
    });

    it('ignores the game when the plugin is switched off', function () {
        expect(commentCharFrom('', pluginsJs({ 'Comment Out Char': '#' }, false), true))
            .to.equal(SHIPPED_COMMENT_CHAR);
    });

    it('falls back to the shipped character when there is nothing to read', function () {
        expect(commentCharFrom('', '', true)).to.equal(SHIPPED_COMMENT_CHAR);
        expect(commentCharFrom('', 'var $plugins = [ {{{ broken', true)).to.equal(SHIPPED_COMMENT_CHAR);
    });

    /* 設定が言っていれば、ゲームを読む必要すらない(入っていなくても効く)。 */
    it('needs no game at all when the setting says one', function () {
        expect(commentCharFrom('#', '', false)).to.equal('#');
    });
});
