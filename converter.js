// From: http://stackoverflow.com/questions/865590/unit-of-measure-conversion-library#answer-3531444
( function () {
    var table = {}

    window.UnitConverter = function( value, unit ) {
        this.value = value
        if( unit ) {
            this.currentUnit = unit
        }
    }

    UnitConverter.prototype.as = function( targetUnit ) {
        this.targetUnit = targetUnit
        return this
    }

    UnitConverter.prototype.is = function (currentUnit) {
        this.currentUnit = currentUnit
        return this
    }

    UnitConverter.prototype.val = function () {
        // first, convert from the current value to the base unit
        var target = table[this.targetUnit]
        
        if( target == undefined ) {
            throw new Error("No entry for: " + this.targetUnit )
        }

        var current = table[this.currentUnit]

        if( current == undefined ) {
            throw new Error("No entry for: " + this.currentUnit )
        }

        var value = this.value * ( current.multiplier / target.multiplier )

        if( target.base != current.base ) {
            var step = table[target.base]
            if( step.base == current.base ) {
                value *= 1 / step.multiplier
            } else {
                throw new Error("Incompatible units; cannot convert from '" + this.currentUnit + "' to '" + this.targetUnit + "'" )
            }
        }

        return value
    }

    UnitConverter.prototype.toString = function () {
        return this.val() + ' ' + this.targetUnit
    }

    UnitConverter.prototype.debug = function () {
        return this.value + ' ' + this.currentUnit + ' is ' + this.val() + ' ' + this.targetUnit
    }

    UnitConverter.addUnit = function ( baseUnit, actualUnit, multiplier ) {
        table[actualUnit] = { base: baseUnit, actual: actualUnit, multiplier: multiplier }
        table[baseUnit] = { base: actualUnit, actual: baseUnit, multiplier: 1 / multiplier }
    }

    var prefixes = ['Y', 'Z', 'E', 'P', 'T', 'G', 'M', 'k', 'h', 'da', '', 'd', 'c', 'm', 'u', 'n', 'p', 'f', 'a', 'z', 'y']
    var factors = [24, 21, 18, 15, 12, 9, 6, 3, 2, 1, 0, -1, -2, -3, -6, -9, -12, -15, -18, -21, -24]
    // SI units only, that follow the mg/kg/dg/cg type of format
    var units = ['g', 'b', 'l', 'm', 'J', 'cal']

    for( var j = 0; j < units.length; j++ ) {
        var base = units[j]
        for( var i = 0; i < prefixes.length; i++ ) {
            UnitConverter.addUnit( base, prefixes[i] + base, Math.pow( 10, factors[i] ) )
        }
    }

    // we use the SI gram unit as the base; this allows
    // us to convert between SI and English units
    UnitConverter.addUnit( 'g', 'ounce', 28.3495231 )
    UnitConverter.addUnit( 'g', 'oz', 28.3495231 )
    UnitConverter.addUnit( 'g', 'pound', 453.59237 )
    UnitConverter.addUnit( 'g', 'lb', 453.59237 )
    UnitConverter.addUnit( 'J', 'cal', 4.1868 )
} )()
