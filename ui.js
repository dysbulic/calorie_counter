$( function() {
    var API_KEY = 'AIzaSyDqk53HcVbo2dP8ULc1qANB9Iejr7iXZOg'

    function freebase_query( query, handler ) {
        // From: https://developers.google.com/freebase/v1/mql-overview#mql-readwrite-documentation
        var fb_url = 'https://www.googleapis.com/freebase/v1/mqlread'
        fb_url += "?query=" + encodeURIComponent( JSON.stringify( query ) )
            
        $.getJSON( fb_url, handler )
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
                    if( ! UnitConverter.hasUnit( id ) ) {
                        ids.push( id )
                    }
                } )
            }
        } )
        var $wholeOpt = $('<option/>').val( '' ).text( 'whole' )
        $units.find( '[label="volume"]' ).prepend( $wholeOpt )
        if( options && options.type == 'volume' ) {
            $units.prepend( $wholeOpt )
        }
        
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
    
    $('#recipe')
        .suggest( {
            key: API_KEY,
            filter: '(all type:/m/05v2c_w)'
        } )
        .bind( 'fb-select', function( evt, data ) {
            var $input = $(this)

            $input.addClass( 'loading' )

            var query = [{
                id: data.id,
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
                }]
            }]
            
            freebase_query( query,
                            function( response ) {
                                $input.removeClass( 'loading' )

                                $.each( rows, function( index, row ) {
                                    if( row.empty ) {
                                        row.remove()
                                    }
                                } )

                                $.each( response.result[0]['/food/recipe/ingredients'], function( index, ingredient ) {
                                    var row = addRow()
                                    
                                    if( ingredient.ingredient == null ) {
                                        row.$suggest.val( 'Unspecified' )
                                        row.kJs = null
                                    } else {
                                        row.$suggest.val( ingredient.ingredient.name )
                                        row.kJs = ingredient.ingredient['/food/food/energy']
                                        row.iconId = ingredient.ingredient['/common/topic/image'] && ingredient.ingredient['/common/topic/image'].id
                                    }

                                    row.$notes.text( ingredient.notes || '' )
                                    row.$quantity.val( ingredient.quantity )
                                    
                                    var unitId = ingredient.unit == null ? '' : ingredient.unit.id
                                    if( unitId == '/en/cup' ) { // Generic cups have no volumetric equivalent
                                        unitId += '_us' // Default to US
                                    }
                                    row.$units.val( unitId )
                                    row.$units.change()
                                } )

                                addRow()
                            } )
        } )

    var rows = []

    function Row() {
        this.$elem = $('<div/>').addClass( 'row-fluid' )
        this.$suggest = $('<input/>').attr( { type: 'text' } )
        this.$calories = $('<div/>').addClass( 'calories span1' )
        this.$quantity = $('<input/>').attr( { type: 'text' } )
        this.$units = get_$units()
        this.$notes = $('<div/>').addClass( 'notes span3' )
        
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
            
            var $densityRow = ( function() {
                var $weight = $('<input/>').attr( { type: 'text' } ).keypress( submitOnEnter ).numeric()
                var $weightUnits = get_$units( { type: 'weight' } )
                $weightUnits.val( '/en/gram' )
                
                var $volume = $('<input/>').attr( { type: 'text' } ).keypress( submitOnEnter ).numeric()
                var $volumeUnits = get_$units( { type: 'volume' } )

                return $('<div/>')
                    .append( $weight )
                    .append( $weightUnits )
                    .append( $('<span/>').text( 'per' ) )
                    .append( $volume )
                    .append( $volumeUnits )
            } )()
            
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
                            .append( $densityRow )
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

            $modal.__defineGetter__( 'kcalsPerGram', function( kjs ) {
                return $calories.val() / $weight.val()
            } )

            $modal.__defineSetter__( 'kJs', function( kjs ) {
                $calories.val( Math.round( ( new UnitConverter( kjs, 'kJ' ) ).as( 'kcal' ).val() ) )
                $weight.val( '100' )
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
                                        if( row.$units.find(":selected").hasClass( 'volume' ) ) {
                                            var ccs = ( new UnitConverter( $(this).val(), row.$units.val() ) ).as( 'cc' ).val()
                                            var density = 1
                                            grams = ccs * density
                                        } else {
                                            grams = ( new UnitConverter( $(this).val(), row.$units.val() ) ).as( 'g' ).val()
                                        }
                                        var toCalories = kcals * grams
                                        row.$calories.text( Math.round( toCalories ) )
                                        row.$calories.change()
                                    } catch( e ) {
                                        console.error( e.message )
                                        row.$calories.text( '' )
                                        row.$calories.change()
                                    }
                                }
                            } )
                    )
                    .append( this.$units ) )
            .append( this.$notes )
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
        var location = document.location.href
        var REDIRECT = location.replace( /[^\/]*$/, '' ) + 'oauthcallback.html'

        var authURL = 'https://accounts.google.com/o/oauth2/auth'
        authURL += '?response_type=token'
        authURL += '&client_id=331203715716.apps.googleusercontent.com'
        authURL += '&redirect_uri=' + REDIRECT
        authURL += '&scope=https://www.googleapis.com/auth/freebase'
        authURL += '&approval_prompt=auto'

        var acToken, tokenType, expiresIn

        var win = window.open( authURL, 'windowname1', 'width=800, height=600' )

        var pollTimer = window.setInterval( function() {
            try {
                var url = win.document.URL
                if( url.indexOf( REDIRECT ) != -1 ) {
                    window.clearInterval( pollTimer )
                    acToken = gup( url, 'access_token' )
                    tokenType = gup( url, 'token_type' )
                    expiresIn = gup( url, 'expires_in' )
                    win.close()

                    validateToken( acToken )
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

        var VALIDURL = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token='

        function validateToken(token) {
            $.ajax( {
                url: VALIDURL + token,
                data: null,
                success: function( response, responseText ) {  
                    console.log( 'verified', arguments )
                    if( responseText == 'success' ) {
                        testWrite()
                    }
                },  
                dataType: 'jsonp'
            } )
        }

        function testWrite() {
            var query = {
                create: 'unless_exists',
                id: null,
                name: 'Nowhere At All',
                type: '/location/location'
            }

            var freebaseURL = 'https://www.googleapis.com/freebase/v1sandbox/mqlwrite'
            freebaseURL += "?oauth_token=" + acToken
            freebaseURL += "&query=" + encodeURIComponent( JSON.stringify( query ) )

            $.ajax( {
                url: freebaseURL,
                success: function( responseText ) {  
                    console.log( 'written', arguments )
                },  
                dataType: 'jsonp'
            } )
        }
    } )
} )
