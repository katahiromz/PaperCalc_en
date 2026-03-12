// AlgoAdd.js --- Addition algorithm
// Author: katahiromz
// License: MIT
"use strict";
class AlgoAdd extends AlgoBase {
    // Constructor
    constructor(canvas, textarea, end_fn = null) {
        super(canvas, textarea, end_fn);
        this.reset();
    }
    // Perform the calculation
    doCalc(a, b, origin_iy = 0) {
        this.clearMapping();
        this.addCommand(['output', `Now calculating ${a} ＋ ${b}.`]);
        this.addCommand(['output', `First, write ${a} at the top.`]);
        // Place the augend (A)
        this.autoPutDigits(a, origin_iy);
        this.addCommand(['step']);
        if (this.a_info.fraction || this.b_info.fraction) {
            this.addCommand(['output', `Write ${b} below it, aligning the decimal point and place values.`]);
        }
        else {
            this.addCommand(['output', `Write ${b} below it, aligning the ones place.`]);
        }
        // Place the addend (B)
        this.autoPutDigits(b, origin_iy + 1);
        this.addCommand(['step']);
        // Draw the '+' sign
        this.addCommand(['output', `Write a plus sign (＋) to the left of the second number.`]);
        {
            let ix0 = Math.min(this.min_x(origin_iy), this.min_x(origin_iy + 1)) - 1;
            this.addCommand(['drawDigit', ix0, origin_iy + 1, '+']);
        }
        this.addCommand(['step']);
        // Draw the dividing line
        this.addCommand(['output', `Draw a line with a ruler under the second number.`]);
        {
            let ix0 = Math.min(this.min_x(origin_iy), this.min_x(origin_iy + 1)) - 1;
            let ix1 = Math.max(this.max_x(origin_iy), this.max_x(origin_iy + 1)) + 1;
            this.addCommand(['drawLine', ix0, origin_iy + 2, ix1, origin_iy + 2]);
        }
        this.addCommand(['step']);
        // Perform the addition
        this.addCommand(['output', `Add starting from the rightmost place value.`]);
        this.autoDigitAdd(0, origin_iy + 1);
        // Decimal point in the answer
        let fracMax = Math.max(getFracLen(a), getFracLen(b));
        {
            if (fracMax > 0) {
                this.addCommand(['output', `Since there are decimals, add the decimal point.`]);
                this.addCommand(['drawDot', 0, origin_iy + 2]);
                this.setMapDot(0, origin_iy + 2);
                this.addCommand(['step']);
            }
        }
        // Get the answer
        let answer = this.fixAndReadRowNumber(origin_iy + 2);
        {
            const text = `${a} + ${b} = ${answer}`;
            this.addCommand(['drawCenterText', origin_iy + 4, text]);
        }
        this.answer = answer;
        this.addCommand(['output', `Answer: ${answer}`]);
        return answer;
    }
    // Build the command list
    buildCommands() {
        this.doCalc(this.a, this.b);
    }
    testEntry(a, b, answer) {
        console.assert(typeof a === 'string');
        console.assert(typeof b === 'string');
        this.reset();
        this.set(a, b);
        this.buildCommands();
        while (this.nextCommand()) {
            ;
        }
        return this.answer === answer;
    }
    testEntryEx(a, b, answer) {
        if (!this.testEntry(a, b, answer)) {
            console.log(a, b, answer, this.answer);
            return false;
        }
        return true;
    }
    // Unit tests
    unitTest() {
        console.assert(this.testEntryEx('3.15', '1.85', '5'));
        console.assert(this.testEntryEx('0', '0', '0'));
        console.assert(this.testEntryEx('0', '1', '1'));
        console.assert(this.testEntryEx('1', '0', '1'));
        console.assert(this.testEntryEx('10', '0', '10'));
        console.assert(this.testEntryEx('0', '10', '10'));
        console.assert(this.testEntryEx('10', '1', '11'));
        console.assert(this.testEntryEx('1', '10', '11'));
        console.assert(this.testEntryEx('9', '1', '10'));
        console.assert(this.testEntryEx('1', '9', '10'));
        console.assert(this.testEntryEx('1', '9999', '10000'));
        console.assert(this.testEntryEx('9999', '1', '10000'));
        console.assert(this.testEntryEx('9999', '99', '10098'));
        console.assert(this.testEntryEx('99', '9999', '10098'));
        console.assert(this.testEntryEx('99', '9999.1', '10098.1'));
        console.assert(this.testEntryEx('99.1', '9999', '10098.1'));
        console.assert(this.testEntryEx('99.9', '9999.1', '10099'));
        console.assert(this.testEntryEx('99.1', '9999.9', '10099'));
        console.assert(this.testEntryEx('0.0001', '9999.9999', '10000'));
        console.assert(this.testEntryEx('0.1', '0.2', '0.3')); // Note: watch for JavaScript floating-point rounding errors
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('56', '21', '77'));
        console.assert(this.testEntryEx('32', '48', '80'));
        console.assert(this.testEntryEx('49', '16', '65'));
        console.assert(this.testEntryEx('81', '15', '96'));
        console.assert(this.testEntryEx('85', '14', '99'));
        console.assert(this.testEntryEx('38', '55', '93'));
        console.assert(this.testEntryEx('22', '35', '57'));
        console.assert(this.testEntryEx('67', '24', '91'));
        console.assert(this.testEntryEx('67', '26', '93'));
        console.assert(this.testEntryEx('35', '27', '62'));
        console.assert(this.testEntryEx('19', '71', '90'));
        console.assert(this.testEntryEx('68', '23', '91'));
        console.assert(this.testEntryEx('35', '18', '53'));
        console.assert(this.testEntryEx('58', '36', '94'));
        console.assert(this.testEntryEx('72', '11', '83'));
        console.assert(this.testEntryEx('64', '29', '93'));
        console.assert(this.testEntryEx('83', '12', '95'));
        console.assert(this.testEntryEx('28', '39', '67'));
        console.assert(this.testEntryEx('64', '17', '81'));
        console.assert(this.testEntryEx('37', '30', '67'));
        // [Test cases cited from Chibimasu] End
        this.reset();
    }
}