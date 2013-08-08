$( function() {

    var $calories = $('<input/>').attr( { type: 'text' } )
    var $kj = $('<td/>')
    var $ingredient = $('<tr/>').addClass( 'ingredient' )
    var $icon = $('<td/>').addClass( 'icon' )

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
                    $type.append( $('<option/>').val( name ).text( name ) )
                } )
            } )
        }
    } )

    $('#recipe tbody').prepend(
        $ingredient
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
                                           console.log( response.result )
                                           $kj.text( response.result['/food/food/energy'] )
                                       } )
                        } ) ) )
            .append(
                $('<td/>')
                    .addClass( 'quantity' )
                    .append(
                        $('<input/>').attr( { type: 'text' } )
                            .numeric()
                            .keyup( function() {
                                $calories.val( $(this).val() )
                            } )
                    )
                    .append( $units ) )
            .append( $kj )
            .append(
                $('<td/>').append(
                    $calories
                ) ) )
} )
