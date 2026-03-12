// AlgoBase.js --- Base class for written arithmetic algorithms
// Author: katahiromz
// License: MIT
"use strict";
// Line width
const LINE_WIDTH = 3;
class AlgoBase {
    constructor(canvas, textarea, end_fn = null) {
        this.canvas = canvas; // Canvas element
        this.textarea = textarea; // Text area for displaying step descriptions
        this.running = false; // Whether the animation is currently running
        this.anime = null; // Animation frame
        this.timerId = null; // Timer ID
        this.ready = false; // Whether initialization is complete
        this.digitWidth = digitInfo['0'].img.width;
        this.digitHeight = digitInfo['0'].img.height;
        this.columnWidth = this.digitWidth * 1.1;
        this.textCharWidth = this.digitWidth * 0.8;
        this.rowHeight = this.digitHeight;
        this.dotWidth = this.digitWidth * 0.2;
        this.a = null;
        this.b = null;
        this.c = null;
        this.end_fn = end_fn;
        this.stepInterval = 200; // Step interval in milliseconds
        this.reset();
    }
    // Reset state
    reset() {
        this.answer = null;
        this.autoPlay = false;
        this.skipInitial = true;
        this.commands = [];
        this.iCommand = 0;
        this.clearMapping();
        this.paper = new Paper(1, 1, 'white');
    }
    // Update the playback speed
    setDelay(ms) {
        this.stepInterval = ms;
        // If the speed changes while running, restart the timer with the new interval
        if (this.running && this.autoPlay && this.timerId) {
            clearInterval(this.timerId);
            this.timerId = setInterval(this.nextCommand.bind(this), this.stepInterval);
        }
    }
    // Map a digit to a grid cell
    mapDigit(ix, iy, digit = null) {
        if (!this.mapping.has(iy)) {
            this.mapping.set(iy, new Map());
        }
        const rowMap = this.mapping.get(iy);
        if (digit) {
            if (isDigit(digit)) {
                rowMap.set(ix, digit);
            }
            return;
        }
        let ch = rowMap.get(ix);
        if (ch === undefined || !isDigit(ch))
            return '0';
        return ch;
    }
    getMapDigit(ix, iy) {
        if (!this.mapping.has(iy))
            return undefined;
        return this.mapping.get(iy).get(ix);
    }
    setMapDigit(ix, iy, ch) {
        if (!this.mapping.has(iy)) {
            this.mapping.set(iy, new Map());
        }
        const rowMap = this.mapping.get(iy);
        // If ch is null, undefined, or empty string, remove the key at that coordinate
        if (ch === undefined || ch === null || ch === '') {
            rowMap.delete(ix);
            // If the row (iy) becomes empty, remove it entirely to keep things clean
            if (rowMap.size === 0) {
                this.mapping.delete(iy);
            }
        }
        else {
            rowMap.set(ix, ch);
        }
    }
    getMapDot(iy) {
        return this.dotMapping.get(iy);
    }
    setMapDot(ix, iy) {
        this.dotMapping.set(iy, ix);
    }
    clearMapDot(iy) {
        this.dotMapping.delete(iy);
    }
    clearMapping() {
        this.mapping = new Map(); // iy -> Map(ix -> digit)
        this.dotMapping = new Map(); // iy -> ix
    }
    // Clear the paper
    clearPaper() {
        this.paper = new Paper(1, 1, 'white'); // Virtual paper canvas
    }
    // Set input values
    set(a, b, c = '0') {
        console.assert(typeof a === 'string');
        console.assert(typeof b === 'string');
        console.assert(typeof c === 'string');
        this.a = normalizeUnsignedNumber(a);
        this.b = normalizeUnsignedNumber(b);
        this.c = c;
        this.a_info = getNumberInfo(a);
        this.b_info = getNumberInfo(b);
        this.c_info = getNumberInfo(c);
        this.buildCommands();
    }
    // Output a message to the text area
    output(str) {
        if (Paper.g_sizingOnly)
            return;
        const logItem = document.createElement('div');
        logItem.className = 'log-item active';
        logItem.innerText = str;
        const lastActive = this.textarea.querySelector('.active');
        if (lastActive) {
            lastActive.classList.remove('active');
        }
        this.textarea.insertBefore(logItem, this.textarea.firstChild);
        console.log(str);
    }
    // Start playback
    start() {
        this.running = true;
        this.calcSizing();
        this.anime = requestAnimationFrame(this.draw.bind(this));
    }
    // Stop playback
    stop() {
        this.running = false;
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
    // Validate a command
    checkCommand(command) {
        switch (command[0]) {
        case 'drawDigit':
            return (command[3].length == 1 && validateImageChar(command[3]));
            break;
        case 'drawCenterText':
            return (validateImageChar(command[2]));
            break;
        }
        return true;
    }
    // Add a command to the queue
    addCommand(command) {
        if (!this.commands)
            this.commands = [];
        if (!this.checkCommand(command)) {
            console.log(command);
            console.assert(false);
        }
        this.commands.push(command);
    }
    // Build the command list (overridden by subclasses)
    buildCommands() { }
    // Calculate layout sizing
    calcSizing() {
        Paper.g_sizingOnly = true;
        for (let command of this.commands) {
            this.executeCommand(command);
        }
        Paper.g_sizingOnly = false;
    }
    // Execute a single command
    executeCommand(cmd) {
        if (!this.checkCommand(cmd)) {
            console.log(cmd);
            console.assert(false);
        }
        switch (cmd[0]) {
            case 'output':
                this.output(cmd[1]);
                break;
            case 'drawDigit':
                this.drawDigit(...cmd.slice(1));
                break;
            case 'drawCenterText':
                this.drawCenterText(...cmd.slice(1));
                break;
            case 'drawDivCurve':
                this.drawDivCurve(...cmd.slice(1));
                break;
            case 'backslashDigit':
                this.backslashDigit(...cmd.slice(1));
                break;
            case 'drawCarry':
                this.drawCarry(...cmd.slice(1));
                break;
            case 'drawSmallChars':
                this.drawSmallChars(...cmd.slice(1));
                break;
            case 'drawLine':
                this.drawLine(...cmd.slice(1));
                break;
            case 'drawStrike':
                this.drawStrike(...cmd.slice(1));
                break;
            case 'drawDot':
                this.drawDot(...cmd.slice(1));
                break;
            case 'slashDot':
                this.slashDot(...cmd.slice(1));
                break;
            case 'step':
                break;
            default:
                console.log("Unknown command:", cmd[0]);
                console.assert(false);
                return false;
        }
        return true;
    }
    // Advance to the next command
    nextCommand() {
        if (this.commands && this.iCommand < this.commands.length) {
            let ret, command;
            do {
                command = this.commands[this.iCommand];
                ret = this.executeCommand(command);
                this.iCommand++;
                if (!ret)
                    break;
            } while (command[0] == 'output' && this.iCommand < this.commands.length);
            if (this.iCommand == this.commands.length && this.end_fn)
                this.end_fn();
            return ret;
        }
        if (this.end_fn)
            this.end_fn();
        return false;
    }
    // Advance to the next step
    nextStep() {
        if (this.commands && this.iCommand < this.commands.length) {
            let ret = false;
            while (this.iCommand < this.commands.length) {
                let command = this.commands[this.iCommand];
                this.iCommand++;
                // When a 'step' command is found, stop execution for this turn
                if (command[0] === 'step') {
                    ret = true;
                    break;
                }
                ret = this.executeCommand(command);
            }
            if (this.iCommand === this.commands.length && this.end_fn) {
                this.end_fn();
            }
            return ret;
        }
        if (this.end_fn)
            this.end_fn();
        return false;
    }
    // Get the minimum X coordinate for a given row
    min_x(iy) {
        const rowMap = this.mapping.get(iy);
        if (!rowMap || rowMap.size === 0)
            return undefined;
        return Math.min(...rowMap.keys());
    }
    // Get the maximum X coordinate for a given row
    max_x(iy) {
        const rowMap = this.mapping.get(iy);
        if (!rowMap || rowMap.size === 0)
            return undefined;
        return Math.max(...rowMap.keys());
    }
    min_x_by_ix(ix, iy) {
        const rowMap = this.mapping.get(iy);
        if (!rowMap || rowMap.size === 0)
            return undefined;
        let min_x = ix;
        if (!rowMap.has(min_x))
            return undefined;
        while (rowMap.has(min_x - 1)) {
            --min_x;
        }
        return min_x;
    }
    max_x_by_ix(ix, iy) {
        const rowMap = this.mapping.get(iy);
        if (!rowMap || rowMap.size === 0)
            return undefined;
        let max_x = ix;
        if (!rowMap.has(max_x))
            return undefined;
        while (rowMap.has(max_x + 1)) {
            ++max_x;
        }
        return max_x;
    }
    get_columns(iy) {
        const rowMap = this.mapping.get(iy);
        if (!rowMap || rowMap.size === 0)
            return undefined;
        const min_x = this.min_x(iy), max_x = this.max_x(iy);
        let prev_ix = null;
        let columns = [];
        for (let ix = min_x; ix <= max_x; ++ix) {
            if (!rowMap.has(prev_ix) && rowMap.has(ix)) {
                columns.push(ix);
            }
            prev_ix = ix;
        }
        return columns;
    }
    min_x_by_colunm(iy, iColumn) {
        let columns = this.get_columns(iy);
        if (columns === undefined)
            return undefined;
        return this.min_x_by_ix(columns[iColumn]);
    }
    max_x_by_ix(iy, iColumn) {
        let columns = this.get_columns(iy);
        if (columns === undefined)
            return undefined;
        return this.max_x_by_ix(columns[iColumn]);
    }
    // Place digits of a number onto the grid
    autoPutDigits(numStr, iy) {
        console.assert(typeof numStr === 'string');
        const info = getNumberInfo(numStr);
        if (!info) {
            alert(`"${numStr}" is an invalid number string. Please report this to the author.`);
            console.assert(false);
            return false;
        }
        let iDot = numStr.indexOf('.');
        if (iDot != -1) {
            numStr = numStr.substr(0, iDot) + numStr.substr(iDot + 1);
        }
        let m = (iDot != -1) ? iDot : numStr.length;
        // Integer part
        for (let ix = -m, k = 0; ix < 0; ++ix, ++k) {
            this.addCommand(['drawDigit', ix, iy, numStr[k]]);
            this.mapDigit(ix, iy, numStr[k]);
        }
        // Draw the decimal point for number A if needed
        if (iDot != -1) {
            this.addCommand(['drawDot', 0, iy]);
            this.setMapDot(0, iy);
            // Fractional part
            for (let k = iDot; k < numStr.length; ++k) {
                let ix = k - iDot;
                this.addCommand(['drawDigit', ix, iy, numStr[k]]);
                this.mapDigit(ix, iy, numStr[k]);
            }
        }
    }
    // Place digits of a number onto the grid at a specified position
    autoPutDigitsEx(numStr, ix0, iy0) {
        console.assert(typeof numStr === 'string');
        const info = getNumberInfo(numStr);
        if (!info) {
            alert(`"${numStr}" is an invalid number string. Please report this to the author.`);
            console.assert(false);
            return false;
        }
        let iDot = numStr.indexOf('.');
        if (iDot != -1) {
            numStr = numStr.substr(0, iDot) + numStr.substr(iDot + 1);
        }
        let m = (iDot != -1) ? iDot : numStr.length;
        let kDot = numStr.length - m;
        // Integer part
        for (let k = 0; k < m; ++k) {
            let ix = ix0 - numStr.length + k;
            this.addCommand(['drawDigit', ix, iy0, numStr[k]]);
            this.mapDigit(ix, iy0, numStr[k]);
        }
        if (iDot != -1) {
            // Draw the decimal point
            this.addCommand(['drawDot', ix0 - kDot, iy0]);
            this.setMapDot(ix0 - kDot, iy0);
            // Fractional part
            for (let k = m; k < numStr.length; ++k) {
                let ix = ix0 - numStr.length + k;
                this.addCommand(['drawDigit', ix, iy0, numStr[k]]);
                this.mapDigit(ix, iy0, numStr[k]);
            }
        }
    }
    // Digit-by-digit addition (with carry support)
    autoDigitAdd(iy0, iy1) {
        let min_ix = undefined, max_ix = undefined;
        for (let [iy, rowMap] of this.mapping) {
            let m0 = this.min_x(iy);
            let m1 = this.max_x(iy);
            if (min_ix === undefined || m0 < min_ix)
                min_ix = m0;
            if (max_ix === undefined || m1 > max_ix)
                max_ix = m1;
        }
        let answer_iy = iy1 + 1;
        let carry = 0;
        for (let ix = max_ix; ix >= min_ix; --ix) {
            // Sum all digits in this column
            let nums = [];
            for (let iy = iy0; iy <= iy1; ++iy) {
                let digit0 = this.getMapDigit(ix, iy);
                if (digit0 !== undefined)
                    nums.push(digit0);
            }
            let msg = '';
            let index = 0;
            let sum = carry; // ★ Add carry to this column first (carried over from the previous column)
            for (let num of nums) {
                if (index === 0)
                    msg += num;
                else
                    msg += ` plus ${num}`;
                sum += parseInt(num, 10);
                ++index;
            }
            if (carry > 0) {
                // Also show the carry in the description
                if (nums.length > 0)
                    msg += ' plus ';
                msg += carry;
            }
            // Calculate the carry to pass to the next column
            let nextCarry = Math.floor(sum / 10);
            let digit = (sum % 10).toString();
            msg += ` equals ${sum}.`;
            if (nextCarry > 0)
                msg += ` Carry ${nextCarry}.`;
            this.addCommand(['output', msg]);
            // ★ The carry goes to the next column, but is drawn above the current column in the UI
            if (nextCarry > 0)
                this.addCommand(['drawCarry', ix, answer_iy, nextCarry.toString()]);
            this.addCommand(['drawDigit', ix, answer_iy, digit]);
            this.mapDigit(ix, answer_iy, digit);
            this.addCommand(['step']);
            carry = nextCarry;
        }
        if (carry > 0) {
            this.addCommand(['output', `Don't forget the carry.`]);
            // Handle carries of 2+ digits (e.g. 10) by writing them left-to-right
            const carryStr = carry.toString(); // e.g. "10"
            for (let k = 0; k < carryStr.length; ++k) {
                const digit = carryStr[carryStr.length - 1 - k];
                const ix = (min_ix - 1) - k;
                this.addCommand(['drawDigit', ix, answer_iy, digit]);
                this.mapDigit(ix, answer_iy, digit);
            }
            this.addCommand(['step']);
        }
    }
    // Digit-by-digit subtraction (with borrowing support)
    autoDigitSub(iy0, iy1) {
        console.assert(iy0 + 1 === iy1);
        let min_ix = undefined, max_ix = undefined;
        for (let [iy, rowMap] of this.mapping) {
            let m0 = this.min_x(iy);
            let m1 = this.max_x(iy);
            if (min_ix === undefined || m0 < min_ix)
                min_ix = m0;
            if (max_ix === undefined || m1 > max_ix)
                max_ix = m1;
        }
        let answer_iy = iy1 + 1;
        for (let ix = max_ix; ix >= min_ix; --ix) {
            let x = parseInt(this.mapDigit(ix, iy0));
            let y = parseInt(this.mapDigit(ix, iy1));
            let z = x - y;
            let borrow = (z < 0) ? 1 : 0; // Borrow from the next column
            if (z < 0)
                z += 10;
            if (borrow === 0) {
                if (this.getMapDigit(ix, iy1) === undefined) {
                    this.addCommand(['output', `${x} is ${z}.`]);
                }
                else {
                    this.addCommand(['output', `${x} minus ${y} is ${z}.`]);
                }
                let digit = (z % 10).toString();
                this.addCommand(['drawDigit', ix, answer_iy, digit]);
                this.mapDigit(ix, answer_iy, digit);
                this.addCommand(['step']);
            }
            else {
                this.addCommand(['output', `${x} is less than ${y}, so we need to borrow. ` +
                    `Borrow 1 from the next place value and add 10 to this column: ${x} + ${10} = ${x + 10}.`]);
                let i = 1;
                do {
                    let num1 = parseInt(this.mapDigit(ix - i, iy0));
                    let num2 = num1 - borrow;
                    borrow = (num2 < 0) ? 1 : 0;
                    if (num2 < 0)
                        num2 += 10;
                    this.addCommand(['backslashDigit', ix - i, iy0]);
                    this.addCommand(['drawSmallChars', ix - i, iy0 - 1, num2.toString(), iy0]);
                    this.setMapDigit(ix - i, iy0 - 1, '*');
                    this.mapDigit(ix - i, iy0, num2.toString());
                    ++i;
                } while (borrow > 0);
                this.addCommand(['backslashDigit', ix, iy0]);
                if (this.getMapDigit(ix, iy0 - 1) === undefined) {
                    this.addCommand(['drawSmallChars', ix, iy0 - 1, '1' + x.toString(), iy0]);
                    this.setMapDigit(ix, iy0 - 1, '*');
                }
                else {
                    this.addCommand(['drawStrike', ix, iy0 - 1, ix + 1, iy0 - 1, iy0]);
                    this.addCommand(['drawSmallChars', ix, iy0 - 2, '1' + x.toString(), iy0]);
                }
                this.addCommand(['step']);
                this.addCommand(['output', `${10 + x} minus ${y} is ${z}.`]);
                let digit = (z % 10).toString();
                this.addCommand(['drawDigit', ix, answer_iy, digit]);
                this.mapDigit(ix, answer_iy, digit);
                this.addCommand(['step']);
            }
        }
    }
    // Digit-by-digit multiplication (with carry support)
    autoDigitMul(multiplicandStr, multiplierDigit, origin_ix, origin_iy) {
        console.assert(typeof multiplierDigit === 'string' && multiplierDigit.length === 1);
        let carry = 0;
        // Process the multiplicand from right to left (ones place first)
        let revMultiplicand = multiplicandStr.split('').reverse().join('');
        for (let i = 0; i < revMultiplicand.length; ++i) {
            let digit1 = revMultiplicand[i];
            let m = parseInt(digit1), n = parseInt(multiplierDigit);
            let p = m * n + carry;
            // Calculate position: move left from origin_ix by i columns
            let ix = origin_ix - i;
            let iy = origin_iy;
            let old_carry = carry;
            carry = Math.floor(p / 10);
            if (carry > 0)
                this.addCommand(['drawCarry', ix, iy, carry.toString()]);
            if (old_carry > 0) {
                this.addCommand(['output', `${m} × ${n} + carry ${old_carry} = ${p}`]);
            }
            else {
                this.addCommand(['output', `${m} × ${n} = ${p}`]);
            }
            let unitDigit = (p % 10).toString();
            this.addCommand(['drawDigit', ix, iy, unitDigit]);
            this.mapDigit(ix, iy, unitDigit);
            this.addCommand(['step']);
        }
        // Handle any remaining carry
        if (carry > 0) {
            let ix = origin_ix - revMultiplicand.length;
            this.addCommand(['output', `Write the remaining carry of ${carry}.`]);
            this.addCommand(['drawDigit', ix, origin_iy, carry.toString()]);
            this.mapDigit(ix, origin_iy, carry.toString());
            this.addCommand(['step']);
        }
    }
    // Add a missing leading zero before the decimal point if needed
    addMissingZero(iy, test = false) {
        let iDot = this.getMapDot(iy);
        if (iDot === undefined)
            return false; // No decimal point, nothing to do
        let ix0 = this.min_x(iy), ix1 = this.max_x(iy), found = false;
        // If min_x is at or past the decimal point, there are no digits to its left — add a zero
        if (ix0 === undefined || ix0 >= iDot) {
            if (test)
                return true;
            let zeroIx = iDot - 1;
            this.addCommand(['drawDigit', zeroIx, iy, '0']);
            this.mapDigit(zeroIx, iy, '0');
            found = true;
            ix0 = this.min_x(iy);
        }
        // Fill any gaps between the decimal point and ix1 with zeros
        for (let ix = ix0; ix <= ix1; ++ix) {
            if (this.getMapDigit(ix, iy) === undefined) {
                if (test)
                    return true;
                this.addCommand(['drawDigit', ix, iy, '0']);
                this.mapDigit(ix, iy, '0');
                found = true;
            }
        }
        return found;
    }
    // Remove unnecessary leading zeros
    fixLeadZeros(iy, test = false) {
        let ix0 = this.min_x(iy), ix1 = this.max_x(iy);
        let iDot = this.getMapDot(iy);
        let onePlaceIx = (iDot !== undefined) ? iDot - 1 : ix1;
        let changed = false;
        for (let ix = ix0; ix <= ix1; ++ix) {
            let digit = this.getMapDigit(ix, iy);
            if (digit === undefined)
                continue;
            if (digit !== '0')
                break;
            if (ix < onePlaceIx) {
                if (test)
                    return true;
                this.addCommand(['backslashDigit', ix, iy]);
                this.setMapDigit(ix, iy, undefined); // Remove from internal data
                changed = true;
            }
            else {
                break;
            }
        }
        return changed;
    }
    // Remove unnecessary trailing zeros after the decimal point
    fixTrailingZeros(iy, test = false) {
        let ix0 = this.min_x(iy), ix1 = this.max_x(iy);
        let iDot = this.getMapDot(iy);
        if (iDot === undefined)
            return false;
        let changed = false;
        for (let ix = ix1; ix >= ix0; --ix) {
            let digit = this.getMapDigit(ix, iy);
            if (digit === undefined)
                continue;
            if (digit !== '0')
                break;
            if (ix >= iDot) {
                if (test)
                    return true;
                this.addCommand(['backslashDigit', ix, iy]);
                this.setMapDigit(ix, iy, undefined); // Remove from internal data
                changed = true;
            }
            else {
                break;
            }
        }
        if (!test && changed) {
            let hasFraction = false;
            let currentMaxX = this.max_x(iy);
            if (currentMaxX !== undefined) {
                for (let ix = iDot; ix <= currentMaxX; ix++) {
                    if (this.getMapDigit(ix, iy) !== undefined) {
                        hasFraction = true;
                        break;
                    }
                }
            }
            if (!hasFraction) {
                this.addCommand(['drawDot', iDot, iy]);
                this.clearMapDot(iy);
            }
        }
        return changed;
    }
    // Read the number stored in a row
    readRowNumber(iy, ignoreDot = false) {
        let ix0 = this.min_x(iy);
        let ix1 = this.max_x(iy);
        let iDot = this.getMapDot(iy);
        if (ix0 === undefined && iDot === undefined)
            return "";
        let start = (iDot !== undefined) ? Math.min(ix0 !== null && ix0 !== void 0 ? ix0 : iDot, iDot) : ix0;
        let end = (iDot !== undefined) ? Math.max(ix1 !== null && ix1 !== void 0 ? ix1 : iDot, iDot) : ix1;
        let numStr = '';
        for (let ix = start; ix <= end; ++ix) {
            if (!ignoreDot && iDot !== undefined && ix === iDot) {
                numStr += '.';
            }
            let digit = this.getMapDigit(ix, iy);
            if (digit !== undefined && isDigit(digit)) {
                numStr += digit;
            }
            else if (ix === iDot) {
                continue;
            }
            else {
                numStr += '0';
            }
        }
        return numStr;
    }
    // Clean up and read the number stored in a row
    fixAndReadRowNumber(iy, ignoreDot = false, dontFixTrailZeros = false) {
        // Add a zero if there are no digits to the left of the decimal point
        if (this.addMissingZero(iy, true)) {
            this.addCommand(['output', `Adding a zero before the decimal point.`]);
            this.addMissingZero(iy, false);
            this.addCommand(['step']);
        }
        // Remove unnecessary leading zeros
        if (this.fixLeadZeros(iy, true)) {
            this.addCommand(['output', `Removing unnecessary leading zeros (all except the ones place).`]);
            this.fixLeadZeros(iy, false);
            this.addCommand(['step']);
        }
        if (!dontFixTrailZeros && this.fixTrailingZeros(iy, true)) {
            this.addCommand(['output', `Removing unnecessary trailing zeros after the decimal point.`]);
            this.fixTrailingZeros(iy, false);
            this.addCommand(['step']);
        }
        return this.readRowNumber(iy, ignoreDot);
    }
    // Render the canvas
    draw() {
        if (!this.ready) {
            if (this.autoPlay)
                this.timerId = setInterval(this.nextCommand.bind(this), this.stepInterval);
            this.ready = true;
        }
        if (this.paper.canvas.width && this.paper.canvas.height) {
            const ctx = this.canvas.getContext('2d');
            this.canvas.width = this.paper.canvas.width;
            this.canvas.height = this.paper.canvas.height;
            ctx.fillStyle = "yellow";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.drawImage(this.paper.canvas, 0, 0);
        }
        this.anime = window.requestAnimationFrame(this.draw.bind(this));
    }
    // Convert grid coordinates to pixel coordinates
    convert(ix, iy) {
        let x = ix * this.columnWidth, y = iy * this.rowHeight;
        return { x, y };
    }
    convert2(ix, iy, origin_iy) {
        let x = ix * this.columnWidth;
        let y = origin_iy * this.rowHeight + (iy + 1) * this.rowHeight / 3;
        return { x, y };
    }
    convert3(ix, iy) {
        let x = ix * this.textCharWidth, y = iy * this.rowHeight;
        return { x, y };
    }
    // Draw a digit or symbol
    drawDigit(ix, iy, digit, is_red = false) {
        if (digit === ' ')
            return;
        let { x: x0, y: y0 } = this.convert(ix, iy);
        let prefix = (is_red ? 'red-' : '');
        let img = digitInfo[prefix + digit].img;
        this.paper.drawImage(img, x0, y0);
    }
    // Draw text centered horizontally
    drawCenterText(iy, text, is_red = false) {
        let prefix = (is_red ? 'red-' : '');
        let cx = this.paper.cx;
        let textWidth = this.getTextWidth(text);
        let x = this.paper.originX + (cx - textWidth) / 2;
        let { x0, y } = this.convert3(0, iy);
        for (let ich = 0; ich < text.length; ++ich) {
            let digit = text[ich];
            if (digit !== ' ') {
                let img = digitInfo[prefix + digit].img;
                this.paper.drawImage(img, x, y);
            }
            x += this.textCharWidth;
        }
    }
    // Return the pixel width of a text string
    getTextWidth(text) {
        return text.length * this.textCharWidth;
    }
    // Draw the division bracket curve
    drawDivCurve(ix, iy, is_red = false) {
        let { x: x0, y: y0 } = this.convert(ix, iy);
        let prefix = (is_red ? 'red-' : '');
        let img = digitInfo[prefix + ')'].img;
        this.paper.drawImage(img, x0, y0 - img.height * 0.15, img.width, img.height * 1.3);
    }
    // Strike through a digit or symbol with a backslash
    backslashDigit(ix, iy, is_red = false) {
        is_red = true;
        let digit = '\\';
        let { x: x0, y: y0 } = this.convert(ix, iy);
        let prefix = (is_red ? 'red-' : '');
        let img = digitInfo[prefix + digit].img;
        this.paper.drawImage(img, x0, y0);
    }
    // Draw a carry digit
    drawCarry(ix, iy, text, is_red = false) {
        let { x: x0, y: y0 } = this.convert(ix, iy);
        let prefix = (is_red ? 'red-' : '');
        for (let ch of text) {
            let width = digitInfo[prefix + ch].img.width;
            let height = digitInfo[prefix + ch].img.height;
            let dWidth = width / 3;
            let dHeight = height / 3;
            this.paper.drawImage(digitInfo[prefix + ch].img, x0 - dWidth * text.length / 2, y0, dWidth, dHeight);
            x0 += dWidth;
        }
    }
    // Draw small characters (used for borrowing annotations)
    drawSmallChars(ix, iy, text, origin_iy = 0, is_red = false) {
        console.log(ix, iy, origin_iy);
        let { x: x0, y: y0 } = this.convert2(ix, iy - origin_iy, origin_iy);
        let prefix = (is_red ? 'red-' : '');
        for (let ch of text) {
            let width = digitInfo[prefix + ch].img.width;
            let height = digitInfo[prefix + ch].img.height;
            let dWidth = width / 3;
            let dHeight = height / 3;
            this.paper.drawImage(digitInfo[prefix + ch].img, x0 + width / 2 - dWidth * text.length / 2, y0 - dHeight, dWidth, dHeight);
            x0 += dWidth;
        }
    }
    // Draw a line
    drawLine(ix0, iy0, ix1, iy1, is_red = false) {
        let { x: x0, y: y0 } = this.convert(ix0, iy0);
        let { x: x1, y: y1 } = this.convert(ix1, iy1);
        this.paper.lineWidth = LINE_WIDTH;
        this.paper.strokeStyle = is_red ? 'red' : 'black';
        this.paper.line(x0, y0, x1, y1);
    }
    // Draw a horizontal strikethrough line
    drawStrike(ix0, iy0, ix1, iy1, origin_iy = 0, is_red = false) {
        is_red = true;
        let { x: x0, y: y0 } = this.convert2(ix0, iy0 - origin_iy, origin_iy);
        let { x: x1, y: y1 } = this.convert2(ix1, iy1 - origin_iy, origin_iy);
        x0 += this.columnWidth * 0.2;
        x1 -= this.columnWidth * 0.2;
        y0 -= this.rowHeight * 0.2;
        y1 -= this.rowHeight * 0.2;
        this.paper.lineWidth = LINE_WIDTH;
        this.paper.strokeStyle = is_red ? 'red' : 'black';
        this.paper.line(x0, y0, x1, y1);
    }
    // Draw a decimal point
    drawDot(ix, iy, is_red = false) {
        let { x: x0, y: y0 } = this.convert(ix - 0.1, iy + 0.8);
        let cxy = LINE_WIDTH * 0.8;
        this.paper.fillStyle = is_red ? 'red' : 'black';
        this.paper.fillRect(x0 - cxy, y0 - cxy, 2*cxy, 2*cxy);
    }
    // Erase a decimal point (draw a slash through it)
    slashDot(ix, iy, is_red = false) {
        is_red = true;
        let { x: x0, y: y0 } = this.convert(ix - 0.1 - 0.1, iy + 0.8 - 0.1);
        let { x: x1, y: y1 } = this.convert(ix - 0.1 + 0.1, iy + 0.8 + 0.1);
        this.paper.strokeStyle = is_red ? 'red' : 'black';
        this.paper.line(x0, y0, x1, y1);
    }
    // Unit tests (overridden by subclasses)
    unitTest() { }
}