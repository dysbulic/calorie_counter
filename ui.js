$( function() {
    function freebase_query( query, handler ) {
        // From: https://developers.google.com/freebase/v1/mql-overview#mql-readwrite-documentation
        var fb_url = 'https://www.googleapis.com/freebase/v1/mqlread'
        fb_url += "?query=" + encodeURIComponent( JSON.stringify( query ) )
            
        $.getJSON( fb_url, handler )
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

        var $units = $('<select/>')
        $.ajax( {
            dataType: 'json',
            url: 'units.json',
            async: false,
            success: function( units ) {
                options = ''
                $.each( units, function( typeName, type ) {
                    var $type = $('<optgroup/>').attr( { label: typeName } )
                    $units.append( $type )
                    $.each( type, function( name, abbreviation ) {
                        $type.append( $('<option/>').val( abbreviation ).text( name ) )
                    } )
                } )
            }
        } )

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
                                var kjs = $kj.text()
                                if( kjs != '?' ) {
                                    var toGrams = new UnitConverter( $(this).val(), $units.val() )
                                    var toCalories = new UnitConverter(
                                        toGrams.as( 'g' ).val() * ( kjs / 100 ), 'kJ' )
                                    row.$calories.text( Math.round( toCalories.as( 'kcal' ).val() ) )
                                    row.$calories.change()
                                }
                            } )
                    )
                    .append( $units ) )
            .append( $kj )
            .append( this.$calories )
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
   
