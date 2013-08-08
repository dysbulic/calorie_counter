// From: http://stackoverflow.com/questions/865590/unit-of-measure-conversion-library#answer-3531444

(function () {
    var table = {};

    window.unitConverter = function (value, unit) {
        this.value = value;
        if (unit) {
            this.currentUnit = unit;
        }
    };
    unitConverter.prototype.as = function (targetUnit) {
        this.targetUnit = targetUnit;
        return this;
    };
    unitConverter.prototype.is = function (currentUnit) {
        this.currentUnit = currentUnit;
        return this;
    };

    unitConverter.prototype.val = function () {
        // first, convert from the current value to the base unit
        var target = table[this.targetUnit];
        var current = table[this.currentUnit];
        if (target.base != current.base) {
            throw new Error('Incompatible units; cannot convert from "' + this.currentUnit + '" to "' + this.targetUnit + '"');
        }

        return this.value * (current.multiplier / target.multiplier);
    };
    unitConverter.prototype.toString = function () {
        return this.val() + ' ' + this.targetUnit;
    };
    unitConverter.prototype.debug = function () {
        return this.value + ' ' + this.currentUnit + ' is ' + this.val() + ' ' + this.targetUnit;
    };
    unitConverter.addUnit = function (baseUnit, actualUnit, multiplier) {
        table[actualUnit] = { base: baseUnit, actual: actualUnit, multiplier: multiplier };
    };

    var prefixes = ['Y', 'Z', 'E', 'P', 'T', 'G', 'M', 'k', 'h', 'da', '', 'd', 'c', 'm', 'u', 'n', 'p', 'f', 'a', 'z', 'y'];
    var factors = [24, 21, 18, 15, 12, 9, 6, 3, 2, 1, 0, -1, -2, -3, -6, -9, -12, -15, -18, -21, -24];
    // SI units only, that follow the mg/kg/dg/cg type of format
    var units = ['g', 'b', 'l', 'm'];

    for (var j = 0; j < units.length; j++) {
        var base = units[j];
        for (var i = 0; i < prefixes.length; i++) {
            unitConverter.addUnit(base, prefixes[i] + base, Math.pow(10, factors[i]));
        }
    }

    // we use the SI gram unit as the base; this allows
    // us to convert between SI and English units
    unitConverter.addUnit('g', 'ounce', 28.3495231);
    unitConverter.addUnit('g', 'oz', 28.3495231);
    unitConverter.addUnit('g', 'pound', 453.59237);
    unitConverter.addUnit('g', 'lb', 453.59237);


    window.$u = function (value, unit) {
        var u = new window.unitConverter(value, unit);
        return u;
    };
})();

console.log($u(1, 'g').as('kg').debug());  
console.log($u(1, 'kg').as('g').debug());
console.log($u(1, 'g').as('mg').debug());
console.log($u(1, 'mg').as('g').debug());
console.log($u(1, 'mg').as('kg').debug());

console.log($u(1, 'g').as('oz').debug());
console.log($u(1, 'g').as('lb').debug());

console.log($u(1, 'oz').as('lb').debug());

console.log($u(1, 'lb').as('g').debug());
