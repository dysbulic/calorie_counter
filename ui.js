$( function() {

    function Row() {
        this.$elem = $('<tr/>').addClass( 'ingredient' )
        var $calories = $('<input/>').attr( { type: 'text' } )
        var $kj = $('<td/>')
        var $icon = $('<td/>').addClass( 'icon' )
        var $quantity = $('<input/>').attr( { type: 'text' } )
        
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
                    $('<input/>').attr( { type: 'text' } )
                        .suggest( {
                            key: 'AIzaSyDqk53HcVbo2dP8ULc1qANB9Iejr7iXZOg',
                            filter: '(all type:/food/ingredient)'
                        } )
                        .bind( 'fb-select', function( evt, data ) {
                            $icon.attr( { id: data.name } )
                            
                            var query = {
                                id: data.id,
                                '/food/food/energy': null
                            }
                            
                            // From: https://developers.google.com/freebase/v1/mql-overview#mql-readwrite-documentation
                            var fb_url = 'https://www.googleapis.com/freebase/v1/mqlread'
                            fb_url += "?query=" + encodeURIComponent( JSON.stringify( query ) )
                            
                            $.getJSON( fb_url,
                                       function( response ) {
                                           $kj.text( response.result['/food/food/energy'] )
                                           $quantity.keyup()
                                       } )
                        } ) ) )
            .append(
                $('<td/>')
                    .addClass( 'quantity' )
                    .append(
                        $quantity
                            .numeric()
                            .keyup( function() {
                                var toGrams = new UnitConverter( $(this).val(), $units.val() )
                                var toCalories = new UnitConverter(
                                    toGrams.as( 'g' ).val() * ( $kj.text() / 100 ), 'kJ' )
                                $calories.val( toCalories.as( 'kcal' ).val() )
                            } )
                    )
                    .append( $units ) )
            .append( $kj )
            .append(
                $('<td/>').append(
                    $calories
                ) )
        return this
    }

    $('#recipe tbody').prepend( ( new Row() ).$elem )
    $('#recipe tbody').prepend( ( new Row() ).$elem )
} )
   
