// 根目录/utils/match-highlighter.js
/**
 * 为 CodeMirror 编辑器附加自定义高亮功能;
 * 当光标停留在某个单词上时,自动高亮编辑器中所有与之相同的独立单词;
 *
 * @param {Object} editor - CodeMirror 编辑器实例
 * @returns {void}
 */
function attachCustomHighlight(editor) {
    let currentMarks = []; // 存储当前高亮标记

    function clearHighlights() {
        currentMarks.forEach(mark => mark.clear()), currentMarks = [];
    }

    // 定义分隔符:空白字符 + CSS语法标点（不包括 . # - _ 这些可能出现在标识符中的字符）
    function isSeparator(ch) {
        if (!ch) return false;
        if (/\s/.test(ch)) return true; // 空白字符
        return '!"%&\'()*+,/:;<=>?@[\\]^{|}~`$'.indexOf(ch) !== -1; // 常见CSS分隔符
    }

    // 从光标位置获取完整的单词
    function getWordAtCursor() {
        const cursor = editor.getCursor(), line = editor.getLine(cursor.line), ch = cursor.ch;

        // 如果光标在行尾或当前字符是分隔符,则返回空字符串(不高亮)
        if (ch >= line.length) return '';
        if (isSeparator(line[ch])) return '';

        let start = ch, end = ch;
        while (start > 0 && !isSeparator(line[start - 1])) start--; // 向左扩展直到遇到分隔符
        while (end < line.length && !isSeparator(line[end])) end++; // 向右扩展直到遇到分隔符

        return line.slice(start, end);
    }

    // 高亮指定单词
    function highlightWord(word) {
        clearHighlights();
        if (!word || word.trim().length === 0) return;

        const wordLen = word.length, lines = editor.lineCount();
        for (let i = 0; i < lines; i++) {
            const line = editor.getLine(i);
            let pos = 0;
            while (true) {
                const index = line.indexOf(word, pos);
                if (index === -1) break;
                const endPos = index + wordLen, beforeChar = index > 0 ? line[index - 1] : '',
                    afterChar = endPos < line.length ? line[endPos] : '',
                    beforeOk = !beforeChar || isSeparator(beforeChar), afterOk = !afterChar || isSeparator(afterChar);

                if (beforeOk && afterOk) {
                    const from = { line: i, ch: index }, to = { line: i, ch: endPos },
                        mark = editor.markText(from, to, { className: 'custom-highlight' });
                    currentMarks.push(mark);
                }

                pos = index + 1;
            }
        }
    }

    // 绑定光标活动事件
    editor.on('cursorActivity', () => {
        const word = getWordAtCursor();
        highlightWord(word);
    });
}