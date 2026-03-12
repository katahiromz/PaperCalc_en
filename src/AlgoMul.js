// AlgoMul.js --- Multiplication algorithm
// Author: katahiromz
// License: MIT
"use strict";
class AlgoMul extends AlgoBase {
    // Constructor
    constructor(canvas, textarea, end_fn = null) {
        super(canvas, textarea, end_fn);
        this.reset();
    }
    // Perform the calculation
    doCalc(a, b, origin_iy = 0) {
        this.clearMapping();
        this.addCommand(['output', `Now calculating ${a} × ${b}.`]);
        let a_str = a.toString();
        let b_str = b.toString();
        let a_digits = a_str.replaceAll('.', '');
        let b_digits = b_str.replaceAll('.', '');
        // Place the multiplicand (A) at iy = origin_iy
        this.addCommand(['output', `First, write ${a} at the top.`]);
        this.autoPutDigitsEx(a_str, 0, origin_iy);
        this.addCommand(['step']);
        // Place the multiplier (B) at iy = origin_iy + 1
        this.addCommand(['output', `Write ${b} below it, aligning the rightmost digits.`]);
        this.autoPutDigitsEx(b_str, 0, origin_iy + 1);
        this.addCommand(['step']);
        // Draw the '×' sign
        this.addCommand(['output', `Write a multiplication sign (×) to the left of the second number.`]);
        {
            let ix = -Math.max(a_digits.length, b_digits.length) - 1;
            this.addCommand(['drawDigit', ix, origin_iy + 1, '×']);
        }
        this.addCommand(['step']);
        // Draw the dividing line
        this.addCommand(['output', `Draw a line with a ruler under the second number.`]);
        {
            let ix0 = Math.min(this.min_x(origin_iy), this.min_x(origin_iy + 1)) - 1;
            this.addCommand(['drawLine', ix0, origin_iy + 2, 0, origin_iy + 2]);
        }
        this.addCommand(['step']);
        let x_digits = this.readRowNumber(origin_iy, true); // Multiplicand (top row)
        let y_rev = this.readRowNumber(origin_iy + 1, true).split('').reverse().join(''); // Multiplier (bottom row), reversed
        for (let level = 0; level < y_rev.length; ++level) {
            let digitY = y_rev[level];
            let iy_sub_product = origin_iy + 2 + level;
            // Key point:
            // Each partial product row is shifted left by `level` places from the ones column.
            // With the base right edge at -1: level 0 starts at -1, level 1 at -2, etc.
            let target_origin_ix = -1 - level;
            this.addCommand(['output', `Multiply by ${digitY}.`]);
            // Call the redefined autoDigitMul
            this.autoDigitMul(x_digits, digitY, target_origin_ix, iy_sub_product);
        }
        let result_iy_start = origin_iy + 2;
        let result_iy_end = origin_iy + 1 + y_rev.length;
        let answer_iy = result_iy_end + 1;
        if (y_rev.length > 1) {
            let min_ix = this.min_x(result_iy_end) - 1;
            this.addCommand(['output', `Draw a line with a ruler below the partial products.`]);
            this.addCommand(['drawLine', min_ix, answer_iy, 0, answer_iy]);
            this.addCommand(['output', `Add up all the partial products.`]);
            // Sum all rows up to just above the second line
            this.autoDigitAdd(result_iy_start, result_iy_end);
        }
        else {
            // Only one digit in the multiplier — no addition step needed
            answer_iy = result_iy_start;
        }
        // Handle the decimal point
        let a_frac_len = getFracLen(a_str);
        let b_frac_len = getFracLen(b_str);
        let frac_len_sum = a_frac_len + b_frac_len;
        if (frac_len_sum > 0) {
            this.addCommand(['output', `Place the decimal point by counting the total decimal places in both numbers.`]);
            let ix = -frac_len_sum;
            this.addCommand(['drawDot', ix, answer_iy]);
            this.setMapDot(ix, answer_iy);
            this.addCommand(['step']);
        }
        // Get the answer
        let answer = this.fixAndReadRowNumber(answer_iy);
        {
            const text = `${a} × ${b} = ${answer}`;
            this.addCommand(['drawCenterText', answer_iy + 2, text]);
        }
        this.answer = answer;
        this.addCommand(['output', `Answer: ${this.answer}`]);
        return answer;
    }
    // Build the command list
    buildCommands() {
        this.doCalc(this.a, this.b);
    }
    testEntry(a, b, answer) {
        this.reset();
        this.set(a, b);
        // Run through all commands
        while (this.nextCommand()) {
            ;
        }
        return this.answer === answer;
    }
    testEntryEx(a, b, answer) {
        if (!this.testEntry(a, b, answer)) {
            console.error(`Test Failed: ${a} * ${b} = ${answer}, but got ${this.answer}`);
            return false;
        }
        return true;
    }
    unitTest() {
        console.log("AlgoMul unit testing...");
        console.assert(this.testEntryEx('304', '2', '608'));
        console.assert(this.testEntryEx('0', '0', '0'));
        console.assert(this.testEntryEx('2', '3', '6'));
        console.assert(this.testEntryEx('111', '111', '12321'));
        console.assert(this.testEntryEx('11.1', '1.11', '12.321'));
        console.assert(this.testEntryEx('0.2', '0.2', '0.04'));
        console.assert(this.testEntryEx('80.7', '100', '8070'));
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('35', '4', '140'));
        console.assert(this.testEntryEx('54', '3', '162'));
        console.assert(this.testEntryEx('27', '6', '162'));
        console.assert(this.testEntryEx('42', '6', '252'));
        console.assert(this.testEntryEx('74', '2', '148'));
        console.assert(this.testEntryEx('67', '4', '268'));
        console.assert(this.testEntryEx('35', '5', '175'));
        console.assert(this.testEntryEx('38', '7', '266'));
        console.assert(this.testEntryEx('42', '6', '252'));
        console.assert(this.testEntryEx('26', '9', '234'));
        console.assert(this.testEntryEx('82', '9', '738'));
        console.assert(this.testEntryEx('34', '8', '272'));
        console.assert(this.testEntryEx('28', '8', '224'));
        console.assert(this.testEntryEx('46', '9', '414'));
        console.assert(this.testEntryEx('53', '7', '371'));
        console.assert(this.testEntryEx('42', '4', '168'));
        console.assert(this.testEntryEx('52', '4', '208'));
        console.assert(this.testEntryEx('15', '8', '120'));
        console.assert(this.testEntryEx('34', '6', '204'));
        console.assert(this.testEntryEx('78', '8', '624'));
        // [Test cases cited from Chibimasu] End
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('23', '26', '598'));
        console.assert(this.testEntryEx('16', '42', '672'));
        console.assert(this.testEntryEx('24', '82', '1968'));
        console.assert(this.testEntryEx('36', '45', '1620'));
        console.assert(this.testEntryEx('13', '37', '481'));
        console.assert(this.testEntryEx('29', '49', '1421'));
        console.assert(this.testEntryEx('58', '96', '5568'));
        console.assert(this.testEntryEx('28', '69', '1932'));
        console.assert(this.testEntryEx('83', '74', '6142'));
        console.assert(this.testEntryEx('49', '94', '4606'));
        console.assert(this.testEntryEx('67', '39', '2613'));
        console.assert(this.testEntryEx('27', '35', '945'));
        console.assert(this.testEntryEx('46', '76', '3496'));
        console.assert(this.testEntryEx('45', '53', '2385'));
        console.assert(this.testEntryEx('79', '48', '3792'));
        console.assert(this.testEntryEx('61', '54', '3294'));
        console.assert(this.testEntryEx('53', '76', '4028'));
        console.assert(this.testEntryEx('62', '49', '3038'));
        console.assert(this.testEntryEx('75', '26', '1950'));
        console.assert(this.testEntryEx('28', '16', '448'));
        // [Test cases cited from Chibimasu] End
        this.reset();
    }
}