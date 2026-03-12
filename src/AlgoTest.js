// AlgoTest.js --- Algorithm tests
// Author: katahiromz
// License: MIT
"use strict";
class AlgoTest extends AlgoBase {
    // Constructor
    constructor(canvas, textarea, end_fn = null) {
        super(canvas, textarea, end_fn);
        this.reset();
    }
    // Test for readRowNumber
    doTest0(start = 1) {
        let iy = 0;
        let digit = '1';
        for (let idot = 0; idot < 3; ++idot) {
            for (let ix = start; ix < start + 3; ++ix) {
                this.addCommand(['drawDigit', ix, iy, digit]);
                this.mapDigit(ix, iy, digit);
            }
            this.addCommand(['drawDot', start + idot, iy]);
            this.clearMapDot(iy);
            this.setMapDot(start + idot, iy);
            let x = this.readRowNumber(iy);
            //console.log(x);
            switch (idot) {
                case 0:
                    console.assert(x == ".111");
                    this.addCommand(['output', `${x}`]);
                    break;
                case 1:
                    console.assert(x == "1.11");
                    this.addCommand(['output', `${x}`]);
                    break;
                case 2:
                    console.assert(x == "11.1");
                    this.addCommand(['output', `${x}`]);
                    break;
            }
        }
    }
    // Test for readRowNumber, fixLeadZeros, and fixTrailingZeros
    doTest1() {
        let ix = 0, iy = 0;
        let digit = '0';
        this.addCommand(['drawDigit', ix, iy, digit]);
        this.mapDigit(ix, iy, digit);
        ++ix;
        this.addCommand(['drawDigit', ix, iy, digit]);
        this.mapDigit(ix, iy, digit);
        ++ix;
        digit = '1';
        this.addCommand(['drawDigit', ix, iy, digit]);
        this.mapDigit(ix, iy, digit);
        ++ix;
        digit = '2';
        this.addCommand(['drawDigit', ix, iy, digit]);
        this.mapDigit(ix, iy, digit);
        ++ix;
        digit = '0';
        this.addCommand(['drawDigit', ix, iy, digit]);
        this.mapDigit(ix, iy, digit);
        ++ix;
        this.addCommand(['drawDot', ix - 1, iy]);
        this.setMapDot(ix - 1, iy);
        let x = this.readRowNumber(iy);
        console.assert(x === '0012.0');
        this.addCommand(['output', `${x}`]);
        this.fixLeadZeros(iy, false);
        let y = this.readRowNumber(iy);
        console.assert(y === '12.0');
        this.addCommand(['output', `${y}`]);
        this.fixTrailingZeros(iy, false);
        let z = this.readRowNumber(iy);
        console.assert(z === '12');
        this.addCommand(['output', `${z}`]);
    }
    // Test for readRowNumber
    doTest2() {
        let iy = 0;
        let digit = '1';
        for (let ix = 0; ix < 3; ++ix) {
            this.addCommand(['drawDigit', ix, iy, digit]);
            this.mapDigit(ix, iy, digit);
        }
        this.clearMapDot(iy);
        this.setMapDot(0, iy);
        this.addCommand(['drawDot', 0, iy]);
        let x = this.readRowNumber(iy);
        console.assert(x, ".111");
        this.addCommand(['output', `${x}`]);
        this.addMissingZero(iy);
        let y = this.readRowNumber(iy);
        console.assert(x, "0.111");
        this.addCommand(['output', `${y}`]);
    }
    // Test for autoDigitAdd
    doTest3() {
        let a_integer = this.a_info.integer;
        let b_integer = this.b_info.integer;
        let a_frac = this.a_info.fraction;
        let b_frac = this.b_info.fraction;
        let a_digits = a_integer + a_frac;
        let b_digits = b_integer + b_frac;
        let a_rev = a_digits.split('').reverse().join('');
        let b_rev = b_digits.split('').reverse().join('');
        // Set number A
        let index = 0;
        for (let i = a_rev.length - 1; i >= 0; --i, ++index) {
            let ix = -i, iy = 0;
            let digit = a_rev[i];
            this.addCommand(['drawDigit', ix, iy, digit]);
            if (a_frac && -i == -a_frac.length)
                this.addCommand(['drawDot', ix + 1, iy]);
            this.mapDigit(ix, iy, digit);
        }
        // Set number B
        for (let i = b_rev.length - 1; i >= 0; --i) {
            let ix = -i, iy = 1;
            let digit = b_rev[i];
            this.addCommand(['drawDigit', ix, iy, digit]);
            this.mapDigit(ix, iy, digit);
            if (b_frac && -i == -b_frac.length)
                this.addCommand(['drawDot', ix + 1, iy]);
        }
        this.addCommand(['output', `Starting with addition.`]);
        this.autoDigitAdd(0, 1);
    }
    doTest4() {
        for (let iy = 0; iy < 12; ++iy) {
            this.autoPutDigitsEx('99', 0, iy);
        }
        this.autoDigitAdd(0, 11);
        let numStr = this.readRowNumber(12);
        console.assert(numStr === '1188');
    }
    // Build the command list
    buildCommands() {
        this.clearMapping();
        this.doTest4();
    }
    testEntry(a, b, answer) {
        a = a.toString();
        b = b.toString();
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
        this.reset();
        this.doTest0(-1);
        this.reset();
        this.doTest0(0);
        this.reset();
        this.doTest0(2);
        this.reset();
        this.doTest1();
        this.reset();
        this.doTest2();
        this.reset();
        this.doTest4();
        this.reset();
    }
}