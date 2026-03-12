// AlgoDiv.js --- Division algorithm
// Author: katahiromz
// License: MIT
"use strict";
class AlgoDiv extends AlgoBase {
    // Constructor
    constructor(canvas, textarea, end_fn = null) {
        super(canvas, textarea, end_fn);
        this.reset();
    }
    // Perform the calculation
    doCalc(a, b, c, origin_iy = 0) {
        // Perform division using the long division method
        this.clearMapping();
        this.addCommand(['output', `Now calculating ${a} ÷ ${b}.`]);
        // Get number info
        let a_info = getNumberInfo(a), b_info = getNumberInfo(b);
        // Digit strings without decimal points
        let a_digits = a_info.digits, b_digits = b_info.digits;
        // Decimal point positions
        let a_fracLen = a_info.frac_len, b_fracLen = b_info.frac_len;
        // Decimal precision
        let accuracy = parseInt(c);
        // Adjusted decimal point position
        let fixedDotPos = b_fracLen - a_fracLen;
        // Rightmost column index
        let ix1 = accuracy + b_fracLen - a_fracLen;
        // Place the dividend (A)
        this.addCommand(['output', `Write the dividend ${a}.`]);
        this.autoPutDigitsEx(a, 0, origin_iy + 1);
        this.addCommand(['step']);
        // Draw the division bracket
        this.addCommand(['output', `Draw the division bracket as shown.`]);
        this.addCommand(['drawDivCurve', -a_digits.length - 1, origin_iy + 1]);
        this.addCommand(['drawLine', -a_digits.length - 0.7, origin_iy + 1, Math.max(ix1, 0), origin_iy + 1]);
        this.addCommand(['step']);
        // Place the divisor (B)
        this.addCommand(['output', `Write the divisor ${b} to the left.`]);
        this.autoPutDigitsEx(b, -a_digits.length - 1, origin_iy + 1);
        this.addCommand(['step']);
        // Handle the case where the divisor has a decimal point
        if (b_fracLen > 0) {
            this.addCommand(['output', `The divisor has a decimal point, so multiply both numbers by ${ 10**b_fracLen } to remove it.`]);
            // Cross out the divisor's decimal point
            this.addCommand(['slashDot', -(a_digits.length + b_fracLen + 1), origin_iy + 1]);
            // Cross out the dividend's decimal point.
            // If the dividend has no decimal point, draw one first to show where it would be, then cross it out.
            if (a_fracLen == 0)
                this.addCommand(['drawDot', -a_fracLen, origin_iy + 1]);
            if (a_fracLen >= 0)
                this.addCommand(['slashDot', -a_fracLen, origin_iy + 1]);
            // Handle cases based on the number of decimal places
            if (a_fracLen > b_fracLen) {
                // Shift the decimal point
                this.addCommand(['drawDot', -(a_fracLen - b_fracLen), origin_iy + 1]);
                this.setMapDot(-(a_fracLen - b_fracLen), origin_iy + 1);
            } else if (a_fracLen < b_fracLen) {
                // Pad with zeros
                for (let i = 0; i < (b_fracLen - a_fracLen); ++i) {
                    this.addCommand(['drawDigit', i, origin_iy + 1, '0', true]);
                    this.mapDigit(i, origin_iy + 1, '0');
                }
                this.clearMapDot(origin_iy + 1);
            }
            // Remove leading zeros from the divisor
            let ix = this.min_x(origin_iy + 1);
            while (this.mapDigit(ix, origin_iy + 1) === '0') {
                let digit = this.mapDigit(ix + 1, origin_iy + 1);
                if (digit === undefined)
                    break;
                this.setMapDigit(ix, origin_iy + 1, undefined);
                this.addCommand(['backslashDigit', ix, origin_iy + 1]);
                ++ix;
                b_digits = b_digits.replace(/^0/, ''); // Also update b_digits accordingly
            }
            this.addCommand(['step']);
        }
        // Process columns from left to right
        let iy = origin_iy + 2;
        let foundDot = false; // Flag: has the decimal point been placed in the quotient?
        let tateta = false;   // Flag: has a quotient digit been placed yet?
        for (let i = -a_digits.length; i < ix1; ++i) {
            // Check for decimal point
            if (!foundDot && i === fixedDotPos) {
                // Write a zero before the decimal point if no quotient digit has been placed yet
                if (!tateta) {
                    this.addCommand(['output', `There's a decimal point here, so write a zero and the decimal point.`]);
                    this.addCommand(['drawDigit', i - 1, origin_iy, '0']);
                    this.mapDigit(i - 1, origin_iy, '0');
                } else {
                    this.addCommand(['output', `There's a decimal point here, so write it in the same position.`]);
                }
                // Write the decimal point
                this.addCommand(['drawDot', fixedDotPos, origin_iy]);
                this.setMapDot(fixedDotPos, origin_iy);
                this.addCommand(['step']);
                foundDot = true;
            }

            if (tateta) {
                // Bring down the next digit
                let digit = this.mapDigit(i, origin_iy + 1);
                this.addCommand(['output', `Bring down ${digit} from the dividend.`]);
                this.addCommand(['drawDigit', i, iy, digit]);
                this.mapDigit(i, iy, digit);
                this.addCommand(['step']);

                // Read the current remainder row
                let digits = normalizeUnsignedNumber(this.readRowNumber(iy, true));
                if (comparePositiveNumbers(digits, b_digits) < 0) {
                    this.addCommand(['output', `${digits} is less than ${b_digits}, so write 0 in the quotient.`]);
                    this.addCommand(['drawDigit', i, origin_iy, '0']);
                    this.mapDigit(i, origin_iy, '0');
                    this.addCommand(['step']);
                    continue;
                }
                ++iy;

                // Find how many times the divisor fits
                let num1 = BigInt(digits), num2 = BigInt(b_digits);
                let count = BigInt(0);
                while (num1 >= num2) {
                    num1 -= num2;
                    ++count;
                }

                // Write the quotient digit
                this.addCommand(['output', `${b_digits} fits into ${digits} ${count} time(s), so write ${count} in the quotient.`]);
                this.addCommand(['drawDigit', i, origin_iy, count.toString()]);
                this.mapDigit(i, origin_iy, count.toString());
                this.addCommand(['step']);

                // Calculate the product
                this.addCommand(['output', `Calculate ${b_digits} × ${count}.`]);
                this.autoDigitMul(b_digits, count.toString(), i, iy);

                // Draw the subtraction line
                ++iy;
                this.addCommand(['output', `Draw the subtraction line.`]);
                this.addCommand(['drawLine', -a_digits.length, iy, Math.max(ix1, 0), iy]);
                this.addCommand(['step']);

                this.addCommand(['output', `${digits} - ${BigInt(b_digits) * count} = ${num1.toString()}`]);
                this.autoPutDigitsEx(num1.toString(), i + 1, iy);
                this.addCommand(['step']);
            } else {
                // No quotient digit has been placed yet — accumulate digits from the dividend
                let digits = '';
                for (let k = -a_digits.length; k <= i; ++k) {
                    digits += this.mapDigit(k, origin_iy + 1);
                }
                digits = normalizeUnsignedNumber(digits);

                if (comparePositiveNumbers(digits, b_digits) < 0) {
                    if (foundDot) {
                        this.addCommand(['output', `${digits} is less than ${b_digits} and we've passed the decimal point, so write 0 in the quotient.`]);
                        this.addCommand(['drawDigit', i, origin_iy, '0']);
                        this.mapDigit(i, origin_iy, '0');
                    } else {
                        this.addCommand(['output', `${digits} is less than ${b_digits}, so no quotient digit can be placed yet.`]);
                    }
                    this.addCommand(['step']);
                    continue;
                }

                // Find how many times the divisor fits
                let num1 = BigInt(digits), num2 = BigInt(b_digits);
                let count = BigInt(0);
                while (num1 >= num2) {
                    num1 -= num2;
                    ++count;
                }

                // Write the quotient digit
                this.addCommand(['output', `${b_digits} fits into ${digits} ${count} time(s), so write ${count} in the quotient.`]);
                this.addCommand(['drawDigit', i, origin_iy, count.toString()]);
                this.mapDigit(i, origin_iy, count.toString());
                this.addCommand(['step']);
                tateta = true;

                // Calculate the product
                this.addCommand(['output', `Calculate ${b_digits} × ${count}.`]);
                this.autoDigitMul(b_digits, count.toString(), i, iy);

                // Draw the subtraction line
                ++iy;
                this.addCommand(['output', `Draw the subtraction line.`]);
                this.addCommand(['drawLine', -a_digits.length, iy, Math.max(ix1, 0), iy]);
                this.addCommand(['step']);

                // Calculate the subtraction
                this.addCommand(['output', `${digits} - ${BigInt(b_digits) * count} = ${num1.toString()}`]);
                this.autoPutDigitsEx(num1.toString(), i + 1, iy);
                this.addCommand(['step']);
            }
        }

        // If no quotient digit was ever placed, write a zero
        if (!tateta) {
            this.addCommand(['output', `No quotient digit could be placed, so write 0.`]);
            this.addCommand(['drawDigit', fixedDotPos - 1, origin_iy, '0']);
            this.mapDigit(fixedDotPos - 1, origin_iy, '0');
            this.addCommand(['step']);
        }
        // Add a decimal point to the remainder row if needed
        else if (a_fracLen > 0 || b_fracLen > 0 || accuracy > 0) {
            if (b_fracLen > 0)
                this.addCommand(['output', `Place the decimal point in the remainder using the original decimal position.`]);
            else
                this.addCommand(['output', `Place the decimal point in the remainder.`]);
            this.addCommand(['drawDot', -a_fracLen, iy]);
            this.setMapDot(-a_fracLen, iy);
            this.addCommand(['step']);
        }

        // If calculation was cut short and there are unprocessed digits in the dividend,
        // append them all to the remainder row (ix1 is the start of the unprocessed range)
        if (tateta && ix1 < 0) {
            this.addCommand(['output', `Calculation ended early — bring down the remaining digits into the remainder.`]);
            let appended = false;
            for (let i = ix1; i < 0; ++i) {
                // Only fetch digits that actually exist in the map
                let digit = this.getMapDigit(i, origin_iy + 1);
                if (digit === undefined)
                    continue;
                // Only write digits not already in the remainder row
                if (this.getMapDigit(i, iy) === undefined) {
                    this.addCommand(['drawDigit', i, iy, digit]);
                    this.mapDigit(i, iy, digit);
                    appended = true;
                }
            }
            // If digits were appended, set the decimal point position in the remainder row
            if (appended && a_fracLen > 0 && this.getMapDot(iy) === undefined) {
                this.addCommand(['drawDot', -a_fracLen, iy]);
                this.setMapDot(-a_fracLen, iy);
            }
            this.addCommand(['step']);
        }

        // Determine the final answer
        let shou = this.fixAndReadRowNumber(origin_iy, false, true); // quotient
        let amari;
        if (comparePositiveNumbers(shou, '0') == 0) { // Quotient is zero
            amari = a; // remainder
        } else {
            amari = this.fixAndReadRowNumber(iy); // remainder
        }
        if (comparePositiveNumbers(amari, '0') == 0) { // No remainder
            this.addCommand(['output', `The quotient is ${shou} with no remainder.`]);
            this.addCommand(['output', `Answer: ${shou}`]);
            this.answer = shou;
        } else {
            this.addCommand(['output', `The quotient is ${shou} with a remainder of ${amari}.`]);
            this.addCommand(['output', `Answer: ${shou} … ${amari}`]);
            this.answer = `${shou} … ${amari}`;
        }

        // Display the answer
        this.addCommand(['drawCenterText', iy + 2, `${a} ÷ ${b} = ${this.answer}`]);
        return this.answer;
    }
    // Build the command list
    buildCommands() {
        this.doCalc(this.a, this.b, this.c || '0');
    }
    testEntry(a, b, answer, c) {
        console.assert(typeof a === 'string');
        console.assert(typeof b === 'string');
        console.assert(typeof c === 'string');
        this.reset();
        this.set(a, b, c);
        while (this.nextCommand()) {
            ;
        }
        return this.answer === answer;
    }
    testEntryEx(a, b, answer, c = '0') {
        if (!this.testEntry(a, b, answer, c)) {
            console.log(a, b, c, answer, this.answer);
            return false;
        }
        return true;
    }
    // Unit tests
    unitTest() {
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('13', '2', '6 … 1'));
        console.assert(this.testEntryEx('73', '8', '9 … 1'));
        console.assert(this.testEntryEx('62', '8', '7 … 6'));
        console.assert(this.testEntryEx('50', '7', '7 … 1'));
        console.assert(this.testEntryEx('33', '4', '8 … 1'));
        console.assert(this.testEntryEx('43', '6', '7 … 1'));
        console.assert(this.testEntryEx('29', '5', '5 … 4'));
        console.assert(this.testEntryEx('57', '6', '9 … 3'));
        console.assert(this.testEntryEx('32', '5', '6 … 2'));
        console.assert(this.testEntryEx('19', '5', '3 … 4'));
        console.assert(this.testEntryEx('78', '9', '8 … 6'));
        console.assert(this.testEntryEx('19', '2', '9 … 1'));
        // [Test cases cited from Chibimasu] End
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('63', '2', '31 … 1'));
        console.assert(this.testEntryEx('88', '4', '22'));
        console.assert(this.testEntryEx('95', '9', '10 … 5'));
        console.assert(this.testEntryEx('89', '4', '22 … 1'));
        console.assert(this.testEntryEx('38', '3', '12 … 2'));
        console.assert(this.testEntryEx('57', '5', '11 … 2'));
        console.assert(this.testEntryEx('89', '2', '44 … 1'));
        console.assert(this.testEntryEx('75', '7', '10 … 5'));
        console.assert(this.testEntryEx('43', '2', '21 … 1'));
        // [Test cases cited from Chibimasu] End
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('21', '2', '10 … 1'));
        console.assert(this.testEntryEx('83', '2', '41 … 1'));
        console.assert(this.testEntryEx('67', '3', '22 … 1'));
        console.assert(this.testEntryEx('62', '6', '10 … 2'));
        console.assert(this.testEntryEx('87', '4', '21 … 3'));
        console.assert(this.testEntryEx('61', '2', '30 … 1'));
        console.assert(this.testEntryEx('85', '4', '21 … 1'));
        console.assert(this.testEntryEx('64', '6', '10 … 4'));
        console.assert(this.testEntryEx('68', '3', '22 … 2'));
        // [Test cases cited from Chibimasu] End
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('168', '22', '7 … 14'));
        console.assert(this.testEntryEx('107', '32', '3 … 11'));
        console.assert(this.testEntryEx('286', '31', '9 … 7'));
        console.assert(this.testEntryEx('207', '44', '4 … 31'));
        console.assert(this.testEntryEx('183', '26', '7 … 1'));
        console.assert(this.testEntryEx('127', '23', '5 … 12'));
        console.assert(this.testEntryEx('567', '64', '8 … 55'));
        console.assert(this.testEntryEx('186', '34', '5 … 16'));
        console.assert(this.testEntryEx('386', '42', '9 … 8'));
        console.assert(this.testEntryEx('101', '18', '5 … 11'));
        console.assert(this.testEntryEx('163', '26', '6 … 7'));
        console.assert(this.testEntryEx('380', '85', '4 … 40'));
        // [Test cases cited from Chibimasu] End
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('2.4', '4.8', '0.5', '1'));
        console.assert(this.testEntryEx('5.16', '8.6', '0.6', '1'));
        console.assert(this.testEntryEx('3.4', '8.5', '0.4', '1'));
        console.assert(this.testEntryEx('1.29', '4.3', '0.3', '1'));
        console.assert(this.testEntryEx('6.2', '15.5', '0.4', '1'));
        console.assert(this.testEntryEx('8.33', '9.8', '0.85', '2'));
        console.assert(this.testEntryEx('8.6', '21.5', '0.4', '1'));
        console.assert(this.testEntryEx('2.87', '8.2', '0.35', '2'));
        console.assert(this.testEntryEx('0.26', '6.5', '0.04', '2'));
        console.assert(this.testEntryEx('2.52', '5.6', '0.45', '2'));
        console.assert(this.testEntryEx('0.21', '4.2', '0.05', '2'));
        console.assert(this.testEntryEx('2.07', '4.6', '0.45', '2'));
        console.assert(this.testEntryEx('0.26', '5.2', '0.05', '2'));
        console.assert(this.testEntryEx('0.14', '0.4', '0.35', '2'));
        console.assert(this.testEntryEx('0.23', '4.6', '0.05', '2'));
        console.assert(this.testEntryEx('0.28', '0.8', '0.35', '2'));
        // [Test cases cited from Chibimasu] End
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('3.2', '0.5', '6 … 0.2'));
        console.assert(this.testEntryEx('3.6', '1.5', '2 … 0.6'));
        console.assert(this.testEntryEx('3.9', '0.6', '6 … 0.3'));
        console.assert(this.testEntryEx('5.5', '2.5', '2 … 0.5'));
        console.assert(this.testEntryEx('5.4', '4.5', '1 … 0.9'));
        console.assert(this.testEntryEx('2.8', '0.8', '3 … 0.4'));
        console.assert(this.testEntryEx('6.3', '1.5', '4 … 0.3'));
        console.assert(this.testEntryEx('5.6', '1.6', '3 … 0.8'));
        console.assert(this.testEntryEx('39.6', '12.3', '3 … 2.7'));
        console.assert(this.testEntryEx('38.6', '31.5', '1 … 7.1'));
        console.assert(this.testEntryEx('73.4', '35.6', '2 … 2.2'));
        console.assert(this.testEntryEx('63.4', '15.2', '4 … 2.6'));
        console.assert(this.testEntryEx('63.5', '14.2', '4 … 6.7'));
        console.assert(this.testEntryEx('83.5', '41.2', '2 … 1.1'));
        console.assert(this.testEntryEx('64.7', '15.2', '4 … 3.9'));
        console.assert(this.testEntryEx('45.3', '12.3', '3 … 8.4'));
        // [Test cases cited from Chibimasu] End
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('3.9', '1.9', '2 … 0.1'));
        console.assert(this.testEntryEx('7.6', '2.3', '3 … 0.7'));
        console.assert(this.testEntryEx('2.9', '0.4', '7 … 0.1'));
        console.assert(this.testEntryEx('2.7', '1.1', '2 … 0.5'));
        console.assert(this.testEntryEx('7.6', '0.9', '8 … 0.4'));
        console.assert(this.testEntryEx('3.5', '1.4', '2 … 0.7'));
        console.assert(this.testEntryEx('5.8', '0.7', '8 … 0.2'));
        console.assert(this.testEntryEx('6.1', '5.3', '1 … 0.8'));
        console.assert(this.testEntryEx('62.8', '18.9', '3 … 6.1'));
        console.assert(this.testEntryEx('67.3', '19.4', '3 … 9.1'));
        console.assert(this.testEntryEx('38.6', '11.7', '3 … 3.5'));
        console.assert(this.testEntryEx('46.8', '18.6', '2 … 9.6'));
        console.assert(this.testEntryEx('62.4', '19.3', '3 … 4.5'));
        console.assert(this.testEntryEx('82.5', '11.6', '7 … 1.3'));
        console.assert(this.testEntryEx('46.7', '12.3', '3 … 9.8'));
        console.assert(this.testEntryEx('67.2', '16.5', '4 … 1.2'));
        // [Test cases cited from Chibimasu] End
        // [Test cases cited from Chibimasu] Start
        console.assert(this.testEntryEx('3.64', '1.4', '2.6', '1'));
        console.assert(this.testEntryEx('3.22', '2.3', '1.4', '1'));
        console.assert(this.testEntryEx('8.82', '4.2', '2.1', '1'));
        console.assert(this.testEntryEx('3.72', '3.1', '1.2', '1'));
        console.assert(this.testEntryEx('1.44', '0.6', '2.4', '1'));
        console.assert(this.testEntryEx('5.76', '1.8', '3.2', '1'));
        console.assert(this.testEntryEx('2.88', '0.8', '3.6', '1'));
        console.assert(this.testEntryEx('3.22', '2.3', '1.4', '1'));
        console.assert(this.testEntryEx('3.68', '1.6', '2.3', '1'));
        console.assert(this.testEntryEx('7.26', '3.3', '2.2', '1'));
        console.assert(this.testEntryEx('1.68', '0.7', '2.4', '1'));
        console.assert(this.testEntryEx('2.88', '0.9', '3.2', '1'));
        console.assert(this.testEntryEx('3.15', '1.5', '2.1', '1'));
        console.assert(this.testEntryEx('7.68', '2.4', '3.2', '1'));
        console.assert(this.testEntryEx('1.92', '0.8', '2.4', '1'));
        console.assert(this.testEntryEx('1.77', '0.3', '5.9', '1'));
        // [Test cases cited from Chibimasu] End
        console.assert(this.testEntryEx('0', '1', '0'));
        console.assert(this.testEntryEx('1', '1', '1'));
        console.assert(this.testEntryEx('999', '999', '1'));
        console.assert(this.testEntryEx('612', '3', '204'));
        console.assert(this.testEntryEx('100', '5', '20'));
        console.assert(this.testEntryEx('100', '20', '5'));
        console.assert(this.testEntryEx('100', '25', '4'));
        console.assert(this.testEntryEx('100', '4', '25'));
        console.assert(this.testEntryEx('10', '0.5', '20'));
        console.assert(this.testEntryEx('10', '2', '5'));
        console.assert(this.testEntryEx('10', '2.5', '4'));
        console.assert(this.testEntryEx('10', '0.4', '25'));
        console.assert(this.testEntryEx('10', '40', '0 … 10'));
        console.assert(this.testEntryEx('10', '40', '0.25', '2'));
        console.assert(this.testEntryEx('10', '40', '0.250', '3'));
        console.assert(this.testEntryEx('0.1', '0.4', '0.2 … 0.02', '1'));
        console.assert(this.testEntryEx('0.1', '2', '0.0500', '4'));
        console.assert(this.testEntryEx('999', '0.1', '9990', '0'));
        console.assert(this.testEntryEx('999', '0.1', '9990.00', '2'));
        console.assert(this.testEntryEx('99999999999999999999', '99999999999999999999', '1.0', '1'));
        console.assert(this.testEntryEx('99.9', '990', '0 … 99.9', '0'));
        console.assert(this.testEntryEx('12.355', '789', '0.0 … 12.355', '1'));
        console.assert(this.testEntryEx('7.955', '7.89', '1.00 … 0.065', '2'));
        console.assert(this.testEntryEx('0.3', '0.25', '1 … 0.05'));
        console.assert(this.testEntryEx('1.3', '0.25', '5 … 0.05'));
        console.assert(this.testEntryEx('0.01', '0.1', '0 … 0.01'));
        console.assert(this.testEntryEx('0.25', '0.3', '0 … 0.25'));
        console.assert(this.testEntryEx('10', '40', '0.2 … 2', '1'));
        console.assert(this.testEntryEx('12345', '67', '184.25 … 0.25', '2'));
        console.assert(this.testEntryEx('1', '0.3', '3.3 … 0.01', '1'));
        console.assert(this.testEntryEx('123.55', '789', '0.1 … 44.65', '1'));
        console.assert(this.testEntryEx('12.345', '1', '12.34 … 0.005', '2'));
        console.assert(this.testEntryEx('12.355', '78', '0.1 … 4.555', '1'));
        console.assert(this.testEntryEx('12.355', '7', '1.7 … 0.455', '1'));
        console.assert(this.testEntryEx('100', '20.1', '4 … 19.6'));
        this.reset();
    }
}