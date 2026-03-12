// AlgoSub.js --- Subtraction algorithm
// Author: katahiromz
// License: MIT
"use strict";
class AlgoSub extends AlgoBase {
    // Constructor
    constructor(canvas, textarea, end_fn = null) {
        super(canvas, textarea, end_fn);
        this.reset();
    }
    // Perform the calculation
    doCalc(a, b, origin_iy = 0) {
        this.clearMapping();
        this.addCommand(['output', `Now calculating ${a} － ${b}.`]);
        this.addCommand(['output', `First, write ${a} at the top.`]);
        // Place the minuend (A)
        this.autoPutDigits(a, origin_iy);
        this.addCommand(['step']);
        if (this.a_info.fraction || this.b_info.fraction) {
            this.addCommand(['output', `Write ${b} below it, aligning the decimal point and place values.`]);
        }
        else {
            this.addCommand(['output', `Write ${b} below it, aligning the ones place.`]);
        }
        // Place the subtrahend (B)
        this.autoPutDigits(b, origin_iy + 1);
        this.addCommand(['step']);
        // Draw the '-' sign
        this.addCommand(['output', `Write a minus sign (－) to the left of the second number.`]);
        {
            let ix0 = Math.min(this.min_x(origin_iy), this.min_x(origin_iy + 1)) - 1;
            this.addCommand(['drawDigit', ix0, origin_iy + 1, '-']);
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
        // Perform the subtraction
        this.addCommand(['output', `Subtract starting from the rightmost place value.`]);
        this.autoDigitSub(origin_iy, origin_iy + 1);
        // Decimal point in the answer
        {
            let fracMax = Math.max(getFracLen(a), getFracLen(b));
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
            const text = `${a} - ${b} = ${answer}`;
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
        console.assert(this.testEntryEx('10', '0.1', '9.9'));
        console.assert(this.testEntryEx('5.15', '2.15', '3'));
        console.assert(this.testEntryEx('0', '0', '0'));
        console.assert(this.testEntryEx('1', '0', '1'));
        console.assert(this.testEntryEx('10', '0', '10'));
        console.assert(this.testEntryEx('10', '1', '9'));
        console.assert(this.testEntryEx('9', '1', '8'));
        console.assert(this.testEntryEx('9999', '1', '9998'));
        console.assert(this.testEntryEx('9999', '99', '9900'));
        console.assert(this.testEntryEx('9999.1', '99', '9900.1'));
        console.assert(this.testEntryEx('9999', '99.1', '9899.9'));
        console.assert(this.testEntryEx('9999.1', '99.9', '9899.2')); // Double borrow
        console.assert(this.testEntryEx('10000', '0.0001', '9999.9999'));
        console.assert(this.testEntryEx('0.1', '0.0001', '0.0999'));
        console.assert(this.testEntryEx('111', '99.1', '11.9'));
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('56', '21', '35'));
        console.assert(this.testEntryEx('48', '32', '16'));
        console.assert(this.testEntryEx('49', '16', '33'));
        console.assert(this.testEntryEx('81', '7', '74'));
        console.assert(this.testEntryEx('85', '14', '71'));
        console.assert(this.testEntryEx('55', '8', '47'));
        console.assert(this.testEntryEx('35', '22', '13'));
        console.assert(this.testEntryEx('67', '24', '43'));
        console.assert(this.testEntryEx('67', '26', '41'));
        console.assert(this.testEntryEx('35', '17', '18'));
        console.assert(this.testEntryEx('71', '19', '52'));
        console.assert(this.testEntryEx('68', '23', '45'));
        console.assert(this.testEntryEx('35', '18', '17'));
        console.assert(this.testEntryEx('58', '36', '22'));
        console.assert(this.testEntryEx('72', '6', '66'));
        console.assert(this.testEntryEx('64', '29', '35'));
        console.assert(this.testEntryEx('83', '12', '71'));
        console.assert(this.testEntryEx('39', '28', '11'));
        console.assert(this.testEntryEx('64', '17', '47'));
        console.assert(this.testEntryEx('37', '25', '12'));
        // [Test cases cited from Chibimasu] End
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('116', '52', '64'));
        console.assert(this.testEntryEx('163', '71', '92'));
        console.assert(this.testEntryEx('109', '23', '86'));
        console.assert(this.testEntryEx('154', '72', '82'));
        console.assert(this.testEntryEx('128', '47', '81'));
        console.assert(this.testEntryEx('153', '81', '72'));
        console.assert(this.testEntryEx('172', '81', '91'));
        console.assert(this.testEntryEx('105', '62', '43'));
        console.assert(this.testEntryEx('168', '94', '74'));
        console.assert(this.testEntryEx('159', '76', '83'));
        console.assert(this.testEntryEx('182', '91', '91'));
        console.assert(this.testEntryEx('127', '56', '71'));
        console.assert(this.testEntryEx('149', '74', '75'));
        console.assert(this.testEntryEx('184', '93', '91'));
        console.assert(this.testEntryEx('128', '64', '64'));
        console.assert(this.testEntryEx('138', '77', '61'));
        console.assert(this.testEntryEx('185', '93', '92'));
        console.assert(this.testEntryEx('147', '66', '81'));
        console.assert(this.testEntryEx('156', '65', '91'));
        console.assert(this.testEntryEx('139', '54', '85'));
        // [Test cases cited from Chibimasu] End
        this.reset();
    }
}