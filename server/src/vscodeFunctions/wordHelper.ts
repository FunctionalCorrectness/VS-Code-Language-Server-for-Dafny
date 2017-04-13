export const USUAL_WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';

/**
 * Create a word definition regular expression based on default word separators.
 * Optionally provide allowed separators that should be included in words.
 *
 * The default would look like this:
 * /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
 */
function createWordRegExp(allowInWords: string = ""): RegExp {
    let source = "(-?\d*\.\d\w*)|([^";
    for (const seperator of USUAL_WORD_SEPARATORS) {
        if (allowInWords.indexOf(seperator) >= 0) {
            continue;
        }
        source += "\\" + seperator;
    }
    source += "\s]+)";
    return new RegExp(source, "g");
}

// catches numbers (including floating numbers) in the first group, and alphanum in the second
export const DEFAULT_WORD_REGEXP = createWordRegExp();

export function ensureValidWordDefinition(wordDefinition?: RegExp): RegExp {
    let result: RegExp = DEFAULT_WORD_REGEXP;

    if (wordDefinition && (wordDefinition instanceof RegExp)) {
        if (!wordDefinition.global) {
            let flags = "g";
            if (wordDefinition.ignoreCase) {
                flags += "i";
            }
            if (wordDefinition.multiline) {
                flags += "m";
            }
            result = new RegExp(wordDefinition.source, flags);
        } else {
            result = wordDefinition;
        }
    }

    result.lastIndex = 0;

    return result;
}

function getWordAtPosFast(column: number, wordDefinition: RegExp, text: string, textOffset: number): WordAtPosition {
    // find whitespace enclosed text around column and match from there

    if (wordDefinition.test(" ")) {
        return getWordAtPosSlow(column, wordDefinition, text, textOffset);
    }

    const pos = column - 1 - textOffset;
    const start = text.lastIndexOf(" ", pos - 1) + 1;
    let end = text.indexOf(" ", pos);
    if (end === -1) {
        end = text.length;
    }

    wordDefinition.lastIndex = start;
    let match: RegExpMatchArray;
    while (match = wordDefinition.exec(text)) {
        if (match.index <= pos && wordDefinition.lastIndex >= pos) {
            return {
                endColumn: textOffset + 1 + wordDefinition.lastIndex,
                startColumn: textOffset + 1 + match.index,
                word: match[0]
            };
        }
    }

    return null;
}

function getWordAtPosSlow(column: number, wordDefinition: RegExp, text: string, textOffset: number): WordAtPosition {
    // matches all words starting at the beginning
    // of the input until it finds a match that encloses
    // the desired column. slow but correct

    const pos = column - 1 - textOffset;
    wordDefinition.lastIndex = 0;

    let match: RegExpMatchArray;
    while (match = wordDefinition.exec(text))  {

        if (match.index > pos) {
            // |nW -> matched only after the pos
            return null;

        } else if (wordDefinition.lastIndex >= pos) {
            // W|W -> match encloses pos
            return {
                endColumn: textOffset + 1 + wordDefinition.lastIndex,
                startColumn: textOffset + 1 + match.index,
                word: match[0]
            };
        }
    }

    return null;
}

export function getWordAtText(column: number, wordDefinition: RegExp, text: string, textOffset: number): WordAtPosition {
    const result = getWordAtPosFast(column, wordDefinition, text, textOffset);
    // both (getWordAtPosFast and getWordAtPosSlow) leave the wordDefinition-RegExp
    // in an undefined state and to not confuse other users of the wordDefinition
    // we reset the lastIndex
    wordDefinition.lastIndex = 0;
    return result;
}

export class WordAtPosition {
    public word: string;
    public startColumn: number;
    public endColumn: number;
}
