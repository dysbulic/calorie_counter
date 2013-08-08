$( function() {

    var $calories = $('<input/>').attr( { type: 'text' } )
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
        $('<tr/>')
            .addClass( 'ingredient' )
            .append(
                $('<td/>').append(
                    $('<input/>').attr( { type: 'text' } )
                        .suggest( {
                            key: 'AIzaSyDqk53HcVbo2dP8ULc1qANB9Iejr7iXZOg',
                            filter: '(all type:/food/ingredient)'
                        } )
                        .bind( 'fb-select', function( evt, data ) {
                            var envelope = {
                                query : {
                                    id: data.id,
                                    '/food/food/energy': null
                                }
                            }

                            console.log( envelope )
                            $.getJSON( 'http://api.freebase.com/api/service/mqlread?callback=?',
                                       { query: JSON.stringify( envelope ) },
                                       function( response ) {
                                           console.log( response )
                                           if( response.code == '/api/status/ok' && response.result ) {
                                               console.log( response.result )
                                           }
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
            .append(
                $('<td/>').append(
                    $calories
                ) ) )
} )
