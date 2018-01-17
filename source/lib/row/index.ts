import { Row } from './row';

/**
 * Module repesenting a Row Accessor
 * @alias Worksheet.row
 * @namespace
 * @func Worksheet.row
 * @desc Access a row in order to manipulate values
 * @param {Number} row Row of top left cell
 * @returns {Row}
 */
export function rowAccessor(ws, row) {
  if (typeof row !== 'number') {
    throw new TypeError('Row sent to row accessor was not a number.');
  }

  if (!(ws.rows[row] instanceof Row)) {
    ws.rows[row] = new Row(row, ws);
  }

  return ws.rows[row];
}
