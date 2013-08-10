$( function() {
    function freebase_query( query, handler ) {
        // From: https://developers.google.com/freebase/v1/mql-overview#mql-readwrite-documentation
        var fb_url = 'https://www.googleapis.com/freebase/v1/mqlread'
        fb_url += "?query=" + encodeURIComponent( JSON.stringify( query ) )
            
        $.getJSON( fb_url, handler )
    }

    var $units
    function get_$units() {
        if( $units == undefined ) {
            $units = $('<select/>')
            $.ajax( {
                dataType: 'json',
                url: 'units.json',
                async: false,
                success: function( categories ) {
                    options = ''
                    $.each( categories, function( type, units ) {
                        var $type = $('<optgroup/>').attr( { label: type } )
                        $units.append( $type )
                        
                        var ids = []
                        $.each( units, function( name, id ) {
                            $type.append(
                                $('<option/>').addClass( type ).val( id ).text( name ) )
                            ids.push( id )
                        } )
                            
                        var query = [{
                            'id|=': ids,
                            id: null
                        }]
                        if( type == "weight" ) {
                            query[0]['/measurement_unit/mass_unit/weightmass_in_kilograms'] = null
                            freebase_query(
                                query,
                                function( response ) {
                                    $.each( response.result, function( index, result ) {
                                        UnitConverter.addUnit( 'g', result.id, result['/measurement_unit/mass_unit/weightmass_in_kilograms'] * 1000 )
                                    } )
                                } )
                        } else if( type == "volume" ) {
                            query[0]['/measurement_unit/volume_unit/volume_in_cubic_meters'] = null
                            freebase_query(
                                query,
                                function( response ) {
                                    $.each( response.result, function( index, result ) {
                                        UnitConverter.addUnit( 'cc', result.id, result['/measurement_unit/volume_unit/volume_in_cubic_meters'] * 1000 )
                                    } )
                                } )
                        }
                    } )
                }
            } )
        }
        return $units.clone()
    }
    
    $('#recipe')
        .suggest( {
            key: 'AIzaSyDqk53HcVbo2dP8ULc1qANB9Iejr7iXZOg',
            filter: '(all type:/m/05v2c_w)'
        } )
        .bind( 'fb-select', function( evt, data ) {
            var query = [{
                id: data.id,
                '/food/recipe/ingredients': [{
                    id: null,
                    ingredient: null,
                    unit: null,
                    quantity: null
                }]
            }]
            
            freebase_query( query,
                            function( response ) {
                                console.log( response )
                            } )
        } )

    function Row() {
        this.$elem = $('<tr/>').addClass( 'ingredient' )
        this.$suggest = $('<input/>').attr( { type: 'text' } )
        this.$calories = $('<td/>')
        var $kj = $('<td/>')
        var $icon = $('<td/>').addClass( 'icon' )
        var $quantity = $('<input/>').attr( { type: 'text' } )
        
        var row = this

        var $units = get_$units()

        $units.change( function() {
            $quantity.keyup()
        } )
        
        this.$elem
            .append( $icon )
            .append(
                $('<td/>').append(
                    this.$suggest
                        .suggest( {
                            key: 'AIzaSyDqk53HcVbo2dP8ULc1qANB9Iejr7iXZOg',
                            filter: '(all type:/food/ingredient)'
                        } )
                        .bind( 'fb-select', function( evt, data ) {
                            $icon.attr( { id: data.name } )
                            $kj.addClass( 'loading' )
                            
                            var query = {
                                id: data.id,
                                '/food/food/energy': null
                            }
                            
                            freebase_query(
                                query,
                                function( response ) {
                                    $kj.removeClass( 'loading' )

                                    var kjs = response.result['/food/food/energy']
                                    if( kjs == null ) {
                                        $kj.text( '?' )
                                    } else {
                                        $kj.text( kjs )
                                        $quantity.keyup()
                                    }
                                } )
                        } ) ) )
            .append(
                $('<td/>')
                    .addClass( 'quantity' )
                    .append(
                        $quantity
                            .numeric()
                            .keyup( function() {
                                var kjs = row.kJs
                                if( kjs != undefined ) {
                                    var grams = ( new UnitConverter( $(this).val(), $units.val() ) ).as( 'g' ).val()
                                    var toCalories = new UnitConverter( grams * ( kjs / 100 ), 'kJ' )
                                    row.$calories.text( Math.round( toCalories.as( 'kcal' ).val() ) )
                                    row.$calories.change()
                                }
                            } )
                    )
                    .append( $units ) )
            .append( $kj )
            .append( this.$calories )

        this.__defineGetter__( 'kJs', function() {
            var kjs = $kj.text()
            if( kjs == '?' ) {
                return undefined
            }
            return kjs
        } )
        return this
    }

    var rows = []

    function addRow() {
        var row = new Row()

        $('.recipe tbody').append( row.$elem )

        var run = false
        row.$suggest.keyup( function() {
            if( ! run ) {
                run = true
                addRow()
            }
        } )

        row.$calories.change( function() {
            var calories = rows.map( function( row ) {
                var val = parseFloat( row.$calories.text() )
                if( ! isNaN( val ) ) {
                    return val
                } else {
                    return 0
                }
            } )
            var sum = calories.reduce( function( current, previous ) { return current + previous } )
            $('#total').text( sum )
        } )

        rows.push( row )
    }

    addRow()
} )
