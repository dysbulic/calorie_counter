$( function() {
    var API_KEY = 'AIzaSyDqk53HcVbo2dP8ULc1qANB9Iejr7iXZOg'
    var CLIENT_ID = '331203715716.apps.googleusercontent.com'
    var SERVICE_URL = 'https://www.googleapis.com/freebase/v1'
    SERVICE_URL = 'https://www.googleapis.com/freebase/v1sandbox'

    function freebase_query( query, handler ) {
        // From: https://developers.google.com/freebase/v1/mql-overview#mql-readwrite-documentation
        var freebaseURL = SERVICE_URL + '/mqlread'
        freebaseURL += "?query=" + encodeURIComponent( JSON.stringify( query ) )
            
        $.getJSON( freebaseURL, handler )
    }

    function freebase_write( oauthToken, query, handler ) {
        // Maximum url length is ~2000 characters and JSONP can't use POST

        $('#errors').text( JSON.stringify( query ) )

        var toSend = []
        while( query.length > 0 ) {
            var test = toSend.slice( 0 )
            test.push( query[0] )

            if( test.length == 1 || encodeURIComponent( JSON.stringify( test ) ).length < 1900 ) {
                toSend = test
                query.shift()
                console.log( query, toSend, encodeURIComponent( JSON.stringify( test ) ).length )
                if( query.length > 0 ) {
                    continue
                }
            }

            var freebaseURL = SERVICE_URL + '/mqlwrite'
            freebaseURL += "?oauth_token=" + oauthToken
            freebaseURL += "&query=" + encodeURIComponent( JSON.stringify( toSend ) )
                        
            $.ajax( {
                url: freebaseURL,
                success: handler,
                dataType: 'jsonp'
            } )
            
            toSend = []
        }
    }

    var unitsCategories
    function get_$units( options ) {
        var $units = $('<select/>')
        if( unitsCategories == undefined ) {
            $.ajax( {
                dataType: 'json',
                url: 'units.json',
                async: false,
                success: function( categories ) {
                    unitsCategories = categories
                }
            } )
        }

        var ids = []

        $.each( unitsCategories, function( type, units ) {
            var $parent

            if( ! options || ! options.type ) {
                var $type = $('<optgroup/>').attr( { label: type } )
                $units.append( $type )
                $parent = $type
            } else if( type == options.type ) {
                $parent = $units
            }
            
            if( $parent ) {
                $.each( units, function( name, id ) {
                    $parent.append(
                        $('<option/>').addClass( type ).val( id ).text( name )
                    )
                    if( id != '' && ! UnitConverter.hasUnit( id ) ) {
                        ids.push( id )
                    }
                } )
            }
        } )
        
        if( ids.length > 0 ) {
            var query = [{
                'id|=': ids,
                id: null,
                '/measurement_unit/mass_unit/weightmass_in_kilograms': null,
                '/measurement_unit/volume_unit/volume_in_cubic_meters': null
            }]
            freebase_query(
                query,
                function( response ) {
                    $.each( response.result, function( index, result ) {
                        var multiplier = result['/measurement_unit/mass_unit/weightmass_in_kilograms']
                        if( multiplier != null ) {
                            UnitConverter.addUnit( 'g', result.id, multiplier * 1000 )
                        }
                        multiplier = result['/measurement_unit/volume_unit/volume_in_cubic_meters']
                        if( multiplier != null ) {
                            UnitConverter.addUnit( 'cc', result.id, multiplier * 1000000 )
                        }
                    } )
                }
            )
        }

        return $units
    }
    
    var $dishModal = ( function() {
        var $input = $('<input/>').attr( { type: 'text' } ).addClass( 'dish' ).keypress( submitOnEnter )

        var $okButton = (
            $('<a/>').addClass( 'btn btn-primary' ).text( 'Save' )
                .click( function() {
                    $modal.modal( 'hide' )
                    saveRecipe()
                } )
        )

        function submitOnEnter( evt ) {
            if( evt.which == 13 ) {
                $okButton.click()
            }
        }

        var $modal = (
            $('<div/>')
                .addClass( 'modal fade' )
                .css( { display: 'none' } )
                .append(
                    $('<div/>').addClass( 'modal-header' )
                        .append( 
                            $('<button/>')
                                .addClass( 'close' )
                                .attr( { 'data-dismiss': 'modal' } )
                                .text( '×' )
                        )
                        .append( 
                            $('<h3/>').text( 'Dish' )
                        )
                    )
                    .append(
                        $('<div/>')
                            .attr( { id: 'dish-modal' } )
                            .addClass( 'modal-body' )
                            .append( $input )
                            .append(
                                $('<div/>').addClass( 'buttons' )
                                    .append(
                                        $('<a/>').addClass( 'btn' ).text( 'Cancel' )
                                            .click( function() {
                                                $modal.modal( 'hide' )
                                            } )
                                    )
                                    .append( $okButton )
                            )
                    )
        )
        
        $('body').append( $modal )

        $input.suggest( {
            key: API_KEY,
            service_url: SERVICE_URL,
            filter: '(all type:/food/dish)',
            parent: '#dish-modal'
        } )

        $input.bind( 'fb-select', function( evt, data ) {
            $modal.dishId = data.id
        } )

        $modal.__defineGetter__( 'dishName', function() {
            return $input.val()
        } )

        $modal.__defineSetter__( 'dishName', function( name ) {
            $input.val( name )
        } )

        return $modal
    } )()

    $('#recipe')
        .suggest( {
            key: API_KEY,
            service_url: SERVICE_URL,
            filter: '(all type:/m/05v2c_w)'
        } )
        .bind( 'fb-select', function( evt, data ) {
            var $input = $(this)

            $input.addClass( 'loading' )

            $('#recipe').data( 'recipeId', data.id )

            var query = [{
                id: data.id,
                '/food/recipe/dish': {
                    id: null,
                    name: null
                },
                '/food/recipe/ingredients': [{
                    id: null,
                    ingredient: {
                        id: null,
                        name: null,
                        '/food/food/energy': null,
                        '/common/topic/image': {
                            id: null,
                            optional: true,
                            limit: 1
                        },
                        optional: true
                    },
                    unit: {
                        id: null,
                        name: null,
                        optional: true
                    },
                    quantity: null,
                    notes: null
                }],
                '/common/topic/description': null
            }]
            
            freebase_query( query,
                            function( response ) {
                                $input.removeClass( 'loading' )

                                console.log( response )

                                var result = response.result[0]
                                if( result ) {
                                    $dishModal.dishId = result['/food/recipe/dish'].id
                                    $dishModal.dishName = result['/food/recipe/dish'].name

                                    $.each( rows, function( index, row ) {
                                        if( row.empty ) {
                                            row.remove()
                                        }
                                    } )

                                    $('#description textarea')
                                        .val( result['/common/topic/description'] )
                                        .change()
                                        
                                    $.each( result['/food/recipe/ingredients'], function( index, ingredient ) {
                                        var row = addRow()
                                        
                                        if( ingredient.ingredient == null ) {
                                            row.$suggest.val( 'Unspecified' )
                                            row.kJs = null
                                        } else {
                                            row.ingredientId = ingredient.ingredient.id
                                            row.$suggest.val( ingredient.ingredient.name )
                                            row.kJs = ingredient.ingredient['/food/food/energy']
                                            row.iconId = ingredient.ingredient['/common/topic/image'] && ingredient.ingredient['/common/topic/image'].id
                                        }
                                        
                                        row.rowId = ingredient.id
                                        
                                        row.$notes.val( ingredient.notes || '' )
                                        row.$quantity.val( ingredient.quantity )

                                        var unitId = ingredient.unit == null ? '' : ingredient.unit.id
                                        if( unitId == '/en/cup' ) { // Generic cups have no volumetric equivalent
                                            unitId += '_us' // Default to US
                                        }
                                        row.$units.val( unitId )
                                        row.$units.change()
                                    } )
                                        
                                    addRow()
                                }
                            } )
        } )

    var rows = []

    function Row() {
        this.$elem = $('<div/>').addClass( 'row-fluid' )
        this.$suggest = $('<input/>').attr( { type: 'text' } )
        this.$calories = $('<div/>').addClass( 'calories span1' )
        this.$quantity = $('<input/>').attr( { type: 'text' } )
        this.$units = get_$units()
        this.$notes = $('<textarea/>')
        
        var $icon = $('<div/>').addClass( 'icon span1' )
        
        var row = this
        
        this.$units.change( function() {
            row.$quantity.keyup()
        } )

        var $modal = ( function() {
            var $okButton = (
                $('<a/>').addClass( 'btn btn-primary' ).text( 'OK' )
                    .click( function() {
                        var grams = ( new UnitConverter( $weight.val(), $units.val() ) ).as( 'g' ).val()
                        var kjs = ( new UnitConverter( $calories.val(), 'kcal' ) ).as( 'kJ' ).val()
                        
                        row.kJs = 100 * ( kjs / grams )
                        
                        $modal.modal( 'hide' )
                    } )
            )
            
            function submitOnEnter( evt ) {
                if( evt.which == 13 ) {
                    $okButton.click()
                }
            }
            
            var $calories = $('<input/>').attr( { type: 'text' } ).keypress( submitOnEnter ).numeric()
            var $weight = $('<input/>').attr( { type: 'text' } ).keypress( submitOnEnter ).numeric()
            
            var $caloriesRow = ( function() {
                var $units = get_$units( { type: 'weight' } )
                $units.val( '/en/gram' )
                
                return $('<div/>')
                    .append( $calories )
                    .append( $('<span/>').addClass( 'cals_in' ).text( 'calories in' ) )
                    .append( $weight )
                    .append( $units )
            } )()
            
            function Density() {
                var $weight = $('<input/>').attr( { type: 'text' } ).keypress( submitOnEnter ).numeric()
                var $weightUnits = get_$units( { type: 'weight' } )
                $weightUnits.val( '/en/gram' )
                
                var $volume = $('<input/>').attr( { type: 'text' } ).keypress( submitOnEnter ).numeric()
                var $volumeUnits = get_$units( { type: 'volume' } )

                this.__defineGetter__( 'gramsPercc', function() {
                    return 1 // ToDo
                } )

                this.$elem = (
                    $('<div/>')
                        .append( $weight )
                        .append( $weightUnits )
                        .append( $('<span/>').text( 'per' ) )
                        .append( $volume )
                        .append( $volumeUnits )
                )

                return this
            }

            var density = new Density()
            
            var $modal = (
                $('<div/>')
                    .addClass( 'modal fade' )
                    .css( { display: 'none' } )
                    .append(
                        $('<div/>').addClass( 'modal-header' )
                            .append( 
                                $('<button/>')
                                    .addClass( 'close' )
                                    .attr( { 'data-dismiss': 'modal' } )
                                    .text( '×' )
                            )
                            .append( 
                                $('<h3/>').text( 'Calorie Information: ' + row.$suggest.val() )
                            )
                    )
                    .append(
                        $('<div/>')
                            .addClass( 'modal-body' )
                            .append( $caloriesRow )
                            .append( $('<hr/>') )
                            .append(
                                $('<h3/>').text( 'Density' )
                            )
                            .append( density.$elem )
                            .append(
                                $('<div/>').addClass( 'buttons' )
                                    .append(
                                        $('<a/>').addClass( 'btn' ).text( 'Cancel' )
                                            .click( function() {
                                                $modal.modal( 'hide' )
                                            } )
                                    )
                                    .append( $okButton )
                            )
                    )
            )

            $modal.__defineGetter__( 'kcalsPerGram', function() {
                return $calories.val() / $weight.val()
            } )

            $modal.__defineSetter__( 'kJs', function( kjs ) {
                if( kjs != undefined && kjs != null ) {
                    $calories.val( Math.round( ( new UnitConverter( kjs, 'kJ' ) ).as( 'kcal' ).val() ) )
                    $weight.val( '100' )
                } else {
                    $calories.val( '' )
                }
            } )

            // $modal.__defineGetter__( 'gramsPercc', density.__lookupGetter__( 'gramsPercc' ) )
            $modal.__defineGetter__( 'gramsPercc', function() {
                return density.gramsPercc
            } )

            $('body').append( $modal )

            return $modal
        } )()
        
        this.$elem
            .append( $icon )
            .append(
                $('<div/>')
                    .addClass( 'ingredient span3' )
                    .append(
                        this.$suggest
                            .suggest( {
                                key: API_KEY,
                                service_url: SERVICE_URL,
                                filter: '(all type:/food/ingredient)'
                            } )
                            .bind( 'fb-select', function( evt, data ) {
                                $icon.attr( { id: data.id } )
                                row.$calories.addClass( 'loading' )
                                
                                var query = {
                                    id: data.id,
                                    '/food/food/energy': null,
                                    '/common/topic/image': {
                                        id: null,
                                        limit: 1
                                    }
                                }
                                
                                freebase_query(
                                    query,
                                    function( response ) {
                                        row.$calories.removeClass( 'loading' )
                                        
                                        row.ingredientId = response.result.id

                                        row.iconId = response.result['/common/topic/image'] && response.result['/common/topic/image'].id
                                        
                                        row.kJs = response.result['/food/food/energy']
                                    } )
                            } ) )
            )
            .append(
                $('<div/>')
                    .addClass( 'quantity span3' )
                    .append(
                        this.$quantity
                            .numeric()
                            .keyup( function() {
                                var kcals = $modal.kcalsPerGram
                                if( kcals != undefined ) {
                                    try {
                                        var grams
                                        if( row.$units.find( ':selected' ).hasClass( 'volume' ) ) {
                                            var ccs = ( new UnitConverter( $(this).val(), row.$units.val() ) ).as( 'cc' ).val()
                                            grams = ccs * $modal.gramsPercc
                                        } else {
                                            grams = ( new UnitConverter( $(this).val(), row.$units.val() ) ).as( 'g' ).val()
                                        }
                                        var toCalories = kcals * grams
                                        if( ! isNaN( toCalories ) ) {
                                            row.$calories.text( Math.round( toCalories ) )
                                            row.$calories.change()
                                        }
                                    } catch( e ) {
                                        console.error( e.message )
                                        row.$calories.text( '' )
                                        row.$calories.change()
                                    }
                                }
                            } )
                    )
                    .append( this.$units ) )
            .append(
                $('<div/>').addClass( 'notes span3' ).append( this.$notes )
            )
            .append( this.$calories )
            .append(
                $('<div/>').addClass( 'controls span1' )
                    .append(
                        $('<div/>').addClass( 'btn-group' )
                            .append(
                                $('<a/>').addClass( 'btn' )
                                    .append(
                                        $('<i/>').addClass( 'icon-info-sign' )
                                    )
                                    .click( function() {
                                        $modal.modal()
                                    } )
                            )
                            .append(
                                $('<a/>').addClass( 'btn' )
                                    .append(
                                        $('<i/>').addClass( 'icon-trash' )
                                    )
                                    .click( function() {
                                        row.remove()
                                    } )
                            )   
                    )
            )

        this.__defineSetter__( 'kJs', function( kjs ) {
            $modal.kJs = kjs
        } )

        this.__defineSetter__( 'iconId', function( id ) {
            if( id ) {
                $icon.append(
                    $('<img/>').attr( { src: 'https://usercontent.googleapis.com/freebase/v1/image' + id } )
                )
            }
        } )

        this.__defineGetter__( 'empty', function() {
            return row.$suggest.val() == ''
        } )

        this.remove = function() {
            rows.splice( rows.indexOf( row ), 1 )
            row.$calories.change()
            row.$elem.remove()
        }

        return this
    }

    function addRow() {
        var row = new Row()

        $('.ingredients').append( row.$elem )

        var once = false
        row.$suggest.keyup( function() {
            if( ! once ) {
                once = true
                addRow()
            }
        } )

        row.$calories.change( function() {
            var calories = rows.map( function( row ) {
                var val = parseFloat( row.$calories.text() )
                return isNaN( val ) ? 0 : val
            } )
            var sum = calories.length == 0 ? 0 : calories.reduce( function( current, previous ) { return current + previous } )
            $('#total').text( sum )
        } )

        rows.push( row )

        return row
    }

    addRow()

    $('.save').click( function() {
        if( $('#recipe').val() == '' ) {
            $('#recipe').parents( '.control-group' ).addClass( 'error' )
            $('#recipe').focus()
            return
        } else {
            $('#recipe').parents( '.control-group' ).removeClass( 'error' )
        }
        
        $dishModal.modal()
    } )

    function saveRecipe() {
        // From: http://www.gethugames.in/proto/googleapi/
        var location = document.location.href
        var redirectURL = location.replace( /[^\/]*$/, '' ) + 'oauthcallback.html'

        var authURL = 'https://accounts.google.com/o/oauth2/auth'
        authURL += '?response_type=token'
        authURL += "&client_id=" + CLIENT_ID
        authURL += "&redirect_uri=" + redirectURL
        authURL += '&scope=https://www.googleapis.com/auth/freebase'
        authURL += '&approval_prompt=auto'

        var oauthToken, tokenType, expiresIn

        var win = window.open( authURL, 'windowname1', 'width=800, height=600' )

        var pollTimer = window.setInterval( function() {
            try {
                var url = win.document.URL
                if( url.indexOf( redirectURL ) != -1 ) {
                    window.clearInterval( pollTimer )
                    oauthToken = gup( url, 'access_token' )
                    tokenType = gup( url, 'token_type' )
                    expiresIn = gup( url, 'expires_in' )
                    win.close()

                    validateToken( oauthToken )
                }
            } catch( e ) {
            }
        }, 100 )

        function gup( url, name ) {
            name = name.replace( /[\[]/, '\\\[' ).replace( /[\]]/, '\\\]' )
            var regexS = "[\\#&]" + name + "=([^&#]*)"
            var regex = new RegExp( regexS )
            var results = regex.exec( url )
            if( results == null ) {
                return ''
            } else {
                return results[1]
            }
        }

        var verificationURL = "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token="

        function validateToken( token ) {
            $.ajax( {
                url: verificationURL + token,
                data: null,
                success: function( response, responseText ) {  
                    if( responseText == 'success' ) {
                        saveRecipe()
                    }
                },  
                dataType: 'jsonp'
            } )
        }

        function saveRecipe() {
            var query = []

            if( ! $dishModal.dishId || ! $('#recipe').data( 'recipeId') ) {
                query.push( {
                    create: 'unless_exists',
                    id: null,
                    name: $dishModal.dishName,
                    type: '/food/recipe/dish'
                } )
                query.push( {
                    create: 'unless_exists',
                    id: null,
                    name: $('#recipe').val(),
                    type: '/food/recipe'
                } )
            }

            if( query.length == 0 ) {
                updateRecipe( $dishModal.dishId, $('#recipe').data( 'recipeId') )
            } else {
                freebase_write( oauthToken, query, function( response, responseText ) {  
                    console.log( 'written', arguments )
                    if( responseText == 'success' ) {
                        updateRecipe( response.result[0].id, response.result[1].id )
                    }
                } )
            }
        }

        function updateRecipe( dishId, recipeId ) {
            var query = [
                {
                    id: recipeId,
                    '/food/recipe/dish': {
                        connect: 'replace',
                        id: dishId
                    }
                }
            ]

            query.push( {
                id: recipeId,
                '/common/topic/description': {
                    connect: 'replace',
                    value: $('#description textarea').val(),
                    lang: '/lang/en'
                }
            } )

            $.each( rows, function( idx, row ) {
                if( ! row.empty ) {
                    if( row.rowId ) {
                        query.push( {
                            id: recipeId,
                            '/food/recipe/ingredients': [{
                                id: row.rowId,
                                quantity: {
                                    connect: 'update',
                                    value: parseFloat( row.$quantity.val() )
                                },
                                unit: {
                                    connect: 'update',
                                    id: row.$units.val()
                                },
                                notes: {
                                    connect: 'update',
                                    value: row.$notes.val(),
                                    lang: '/lang/en'
                                }
                            }]
                        } )
                    } else {
                        query.push( {
                            id: recipeId,
                            '/food/recipe/ingredients': {
                                create: 'unless_exists',
                                id: null,
                                quantity: parseFloat( row.$quantity.val() ),
                                unit: {
                                    id: row.$units.val()
                                },
                                ingredient: {
                                    id: row.ingredientId
                                }
                            }
                        } )
                    }
                }
            } )

            freebase_write( oauthToken, query, function( response, responseText ) {  
                console.log( 'written', arguments )
            } )
        }
    }

    // From: http://stackoverflow.com/questions/7477/autosizing-textarea-using-prototype
    function autoSize() {
        var text = $('#description textarea').val().replace( /\n/g, '<br/>' )
        console.log( 'autosizing', text )
        $('#resizeCopy').html( text )
    }
    
    $('#description textarea')
        .change( autoSize )
        .keydown( autoSize )
        .keyup( autoSize )
    autoSize()
} )
