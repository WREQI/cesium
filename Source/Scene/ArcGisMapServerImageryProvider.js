/*global define*/
define([
        '../Core/defaultValue',
        '../Core/jsonp',
        '../Core/writeTextToCanvas',
        '../Core/DeveloperError',
        '../Core/Cartesian2',
        './DiscardMissingTileImagePolicy',
        './ImageryProvider',
        './WebMercatorTilingScheme',
        './GeographicTilingScheme',
        '../ThirdParty/when'
    ], function(
        defaultValue,
        jsonp,
        writeTextToCanvas,
        DeveloperError,
        Cartesian2,
        DiscardMissingTileImagePolicy,
        ImageryProvider,
        WebMercatorTilingScheme,
        GeographicTilingScheme,
        when) {
    "use strict";

    /**
     * Provides tiled imagery hosted by an ArcGIS MapServer.  By default, the server's pre-cached tiles are
     * used, if available.
     *
     * @alias ArcGisMapServerImageryProvider
     * @constructor
     *
     * @param {String} description.url The URL of the ArcGIS MapServer service.
     * @param {TileDiscardPolicy} [description.tileDiscardPolicy] The policy that determines if a tile
     *        is invalid and should be discarded.  If this value is not specified, a default
     *        {@link DiscardMissingTileImagePolicy} is used for tiled map servers, and a
     *        {@link NeverTileDiscardPolicy} is used for non-tiled map servers.  In the former case,
     *        we request tile 0,0 at the maximum tile level and check pixels (0,0), (200,20), (20,200),
     *        (80,110), and (160, 130).  If all of these pixels are transparent, the discard check is
     *        disabled and no tiles are discarded.  If any of them have a non-transparent color, any
     *        tile that has the same values in these pixel locations is discarded.  The end result of
     *        these defaults should be correct tile discarding for a standard ArcGIS Server.  To ensure
     *        that no tiles are discarded, construct and pass a {@link NeverTileDiscardPolicy} for this
     *        parameter.
     * @param {Proxy} [description.proxy] A proxy to use for requests. This object is
     *        expected to have a getURL function which returns the proxied URL, if needed.
     * @param {Boolean} [description.usePreCachedTilesIfAvailable=true] If true, the server's pre-cached
     *        tiles are used if they are available.  If false, any pre-cached tiles are ignored and the
     *        'export' service is used.
     *
     * @exception {DeveloperError} <code>description.url</code> is required.
     *
     * @see SingleTileImageryProvider
     * @see BingMapsImageryProvider
     * @see OpenStreetMapImageryProvider
     * @see WebMapServiceImageryProvider
     *
     * @see <a href='http://resources.esri.com/help/9.3/arcgisserver/apis/rest/'>ArcGIS Server REST API</a>
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     *
     * @example
     * var esri = new ArcGisMapServerImageryProvider({
     *     url: 'http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
     * });
     */
    var ArcGisMapServerImageryProvider = function ArcGisMapServerImageryProvider(description) {
        description = defaultValue(description, {});

        if (typeof description.url === 'undefined') {
            throw new DeveloperError('description.url is required.');
        }

        this._url = description.url;
        this._tileDiscardPolicy = description.tileDiscardPolicy;
        this._proxy = description.proxy;

        this._tileWidth = undefined;
        this._tileHeight = undefined;
        this._maximumLevel = undefined;
        this._tilingScheme = undefined;
        this._logo = undefined;
		this._useTiles = defaultValue(description.usePreCachedTilesIfAvailable, true);

        this._ready = false;

        // Grab the details of this MapServer.
        var metadata = jsonp(this._url, {
            parameters : {
                f : 'json'
            },
            proxy : this._proxy
        });

        var that = this;
        when(metadata, function(data) {
            var tileInfo = data.tileInfo;
            if (!that._useTiles || typeof tileInfo === 'undefined') {
                // TODO: read the extent and maybe tiling scheme from the service.
                that._tileWidth = 256;
                that._tileHeight = 256;
                that._tilingScheme = new GeographicTilingScheme();
                that._useTiles = false;
            } else {
                that._tileWidth = tileInfo.rows;
                that._tileHeight = tileInfo.cols;

                // TODO: support non-default tiling schemes, because ArcGIS does: http://webhelp.esri.com/arcgisserver/9.3/java/index.htm#what_is_map_caching.htm

                if (tileInfo.spatialReference.wkid === 102100) {
                    that._tilingScheme = new WebMercatorTilingScheme();
                } else if (data.tileInfo.spatialReference.wkid === 4326) {
                    that._tilingScheme = new GeographicTilingScheme();
                }
                that._maximumLevel = data.tileInfo.lods.length - 1;

                // Install the default tile discard policy if none has been supplied.
                if (typeof that._tileDiscardPolicy === 'undefined') {
                    that._tileDiscardPolicy = new DiscardMissingTileImagePolicy({
                        missingImageUrl : buildImageUrl(that, 0, 0, that._maximumLevel),
                        pixelsToCheck : [new Cartesian2(0, 0), new Cartesian2(200, 20), new Cartesian2(20, 200), new Cartesian2(80, 110), new Cartesian2(160, 130)],
                        disableCheckIfAllPixelsAreTransparent : true
                    });
                }

                that._useTiles = true;
            }

            // Create the copyright message.
            if (typeof data.copyrightText !== 'undefined' && data.copyrightText.length > 0) {
                that._logo = writeTextToCanvas(data.copyrightText, {
                    font : '12px sans-serif'
                });
            }

            that._ready = true;
        }, function(e) {
            /*global console*/
            console.error('failed to load metadata: ' + e);
        });
    };

    function buildImageUrl(imageryProvider, x, y, level) {
        var url;
        if (imageryProvider._useTiles) {
            url = imageryProvider._url + '/tile/' + level + '/' + y + '/' + x;
        } else {
            var nativeExtent = imageryProvider._tilingScheme.tileXYToNativeExtent(x, y, level);
            var bbox = nativeExtent.west + '%2C' + nativeExtent.south + '%2C' + nativeExtent.east + '%2C' + nativeExtent.north;

            url = imageryProvider._url + '/export?';
            url += 'bbox=' + bbox;
            url += '&bboxSR=4326&size=256%2C256&imageSR=4326&format=png&transparent=true&f=image';
        }

        var proxy = imageryProvider._proxy;
        if (typeof proxy !== 'undefined') {
            url = proxy.getURL(url);
        }

        return url;
    }

    /**
     * Gets a value indicating whether this imagery provider is using pre-cached tiles from the
     * ArcGIS MapServer.  If the imagery provider is not yet ready ({@link ArcGisMapServerImageryProvider#isReady}), this function
     * will return the value of `description.usePreCachedTilesIfAvailable`, even if the MapServer does
     * not have pre-cached tiles.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @returns {Boolean} true if this imagery provider is using pre-cached tiles from the ArcGIS MapServer;
     *          otherwise, false.
     */
    ArcGisMapServerImageryProvider.prototype.isUsingPrecachedTiles = function() {
        return this._useTiles;
    };

    /**
     * Gets the URL of the ArcGIS MapServer.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @returns {String} The URL.
     */
    ArcGisMapServerImageryProvider.prototype.getUrl = function() {
        return this._url;
    };

    /**
     * Gets the width of each tile, in pixels. This function should
     * not be called before {@link ArcGisMapServerImageryProvider#isReady} returns true.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @returns {Number} The width.
     */
    ArcGisMapServerImageryProvider.prototype.getTileWidth = function() {
        return this._tileWidth;
    };

    /**
     * Gets the height of each tile, in pixels.  This function should
     * not be called before {@link ArcGisMapServerImageryProvider#isReady} returns true.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @returns {Number} The height.
     */
    ArcGisMapServerImageryProvider.prototype.getTileHeight = function() {
        return this._tileHeight;
    };

    /**
     * Gets the maximum level-of-detail that can be requested.  This function should
     * not be called before {@link ArcGisMapServerImageryProvider#isReady} returns true.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @returns {Number} The maximum level, or undefined if there is no maximum level.
     */
    ArcGisMapServerImageryProvider.prototype.getMaximumLevel = function() {
        return this._maximumLevel;
    };

    /**
     * Gets the tiling scheme used by this provider.  This function should
     * not be called before {@link ArcGisMapServerImageryProvider#isReady} returns true.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @returns {TilingScheme} The tiling scheme.
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    ArcGisMapServerImageryProvider.prototype.getTilingScheme = function() {
        return this._tilingScheme;
    };

    /**
     * Gets the extent, in radians, of the imagery provided by this instance.  This function should
     * not be called before {@link ArcGisMapServerImageryProvider#isReady} returns true.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @returns {Extent} The extent.
     */
    ArcGisMapServerImageryProvider.prototype.getExtent = function() {
        return this._tilingScheme.getExtent();
    };

    /**
     * Gets the tile discard policy.  If not undefined, the discard policy is responsible
     * for filtering out "missing" tiles via its shouldDiscardImage function.  If this function
     * returns undefined, no tiles are filtered.  This function should
     * not be called before {@link ArcGisMapServerImageryProvider#isReady} returns true.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @returns {TileDiscardPolicy} The discard policy.
     *
     * @see DiscardMissingTileImagePolicy
     * @see NeverTileDiscardPolicy
     */
    ArcGisMapServerImageryProvider.prototype.getTileDiscardPolicy = function() {
        return this._tileDiscardPolicy;
    };

    /**
     * Gets a value indicating whether or not the provider is ready for use.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @returns {Boolean} True if the provider is ready to use; otherwise, false.
     */
    ArcGisMapServerImageryProvider.prototype.isReady = function() {
        return this._ready;
    };

    /**
     * Requests the image for a given tile.  This function should
     * not be called before {@link ArcGisMapServerImageryProvider#isReady} returns true.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @param {Number} x The tile X coordinate.
     * @param {Number} y The tile Y coordinate.
     * @param {Number} level The tile level.
     *
     * @returns {Promise} A promise for the image that will resolve when the image is available, or
     *          undefined if there are too many active requests to the server, and the request
     *          should be retried later.  The resolved image may be either an
     *          Image or a Canvas DOM object.
     */
    ArcGisMapServerImageryProvider.prototype.requestImage = function(x, y, level) {
        var url = buildImageUrl(this, x, y, level);
        return ImageryProvider.loadImage(url);
    };

    /**
     * Gets the logo to display when this imagery provider is active.  Typically this is used to credit
     * the source of the imagery.  This function should not be called before {@link ArcGisMapServerImageryProvider#isReady} returns true.
     *
     * @memberof ArcGisMapServerImageryProvider
     *
     * @returns {Image|Canvas} A canvas or image containing the log to display, or undefined if there is no logo.
     */
    ArcGisMapServerImageryProvider.prototype.getLogo = function() {
        return this._logo;
    };

    return ArcGisMapServerImageryProvider;
});