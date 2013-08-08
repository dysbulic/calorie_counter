$( function() {
    var $calories = $('<input/>').attr( { type: 'text' } )
    $('#recipe tbody').append(
        $('<tr/>')
            .addClass( 'ingredient' )
            .append(
                $('<td/>').append(
                    $('<input/>').attr( { type: 'text' } )
                        .suggest( {
                            key: 'AIzaSyDqk53HcVbo2dP8ULc1qANB9Iejr7iXZOg',
                            filter: '(all type:/food/ingredient)'
                        } ) ) )
            .append(
                $('<td/>').append(
                    $('<input/>').attr( { type: 'text' } )
                        .keyup( function() {
                            $calories.val( $(this).val() )
                        } )
                ) )
            .append(
                $('<td/>').append(
                    $calories
                ) ) )
} )
