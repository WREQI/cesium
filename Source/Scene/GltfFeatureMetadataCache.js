import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";

/**
 * Cache for feature table properties that are referenced from external files.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Resource|String} [options.basePath=""] The base path that paths in the glTF JSON are relative to.
 *
 * @alias GltfFeatureMetadataCache
 * @constructor
 *
 * @private
 */
function GltfFeatureMetadataCache(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var basePath = defaultValue(options.basePath, "");

  this._resource = Resource.createIfNeeded(basePath);
  this._jsonCache = {};
  this._bufferCache = {};
  this._promiseCache = {};
}

/**
 * Get property values from the cache. If the values are not already in the cache
 * request them from the provided uri and save them in the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.uri The uri to the external file.
 * @param {String} options.key The property key in the external file.
 *
 * @private
 */
GltfFeatureMetadataCache.prototype.getExternalValues = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var uri = options.uri;
  var key = options.key;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.uri", uri);
  Check.typeOf.string("options.key", key);
  //>>includeEnd('debug');

  var resource = this._resource;
  var jsonCache = this._jsonCache;
  var promiseCache = this._promiseCache;

  var externalResource = resource.getDerivedResource({
    url: uri,
  });
  var externalUri = externalResource.url;

  if (defined(jsonCache[externalUri])) {
    return jsonCache[externalUri][key];
  }

  if (!defined(promiseCache[externalUri])) {
    promiseCache[externalUri] = externalResource.fetchJson();
  }

  return promiseCache[externalUri]
    .then(function (json) {
      if (defined(promiseCache[externalUri])) {
        jsonCache[externalUri] = json;
        delete promiseCache[externalUri];
      }
      return json[key];
    })
    .otherwise(function () {
      if (defined(promiseCache[externalUri])) {
        jsonCache[externalUri] = {};
        delete promiseCache[externalUri];
      }
      return undefined;
    });
};

/**
 * Get a glTF buffer from the cache. If the buffer is not already in the cache
 * request it from the provided uri and save it in the cache.
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.uri The uri to the external file.
 *
 * @private
 */
GltfFeatureMetadataCache.prototype.getExternalBuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var uri = options.uri;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.uri", uri);
  //>>includeEnd('debug');

  var resource = this._resource;
  var bufferCache = this._bufferCache;
  var promiseCache = this._promiseCache;

  var externalResource = resource.getDerivedResource({
    url: uri,
  });
  var externalUri = externalResource.url;

  if (defined(bufferCache[externalUri])) {
    return bufferCache[externalUri];
  }

  if (!defined(promiseCache[externalUri])) {
    promiseCache[externalUri] = externalResource.fetchArrayBuffer();
  }

  return promiseCache[externalUri]
    .then(function (arrayBuffer) {
      if (defined(promiseCache[externalUri])) {
        bufferCache[externalUri] = new Uint8Array(arrayBuffer);
        delete promiseCache[externalUri];
      }
      return bufferCache[externalUri];
    })
    .otherwise(function () {
      if (defined(promiseCache[externalUri])) {
        bufferCache[externalUri] = new Uint8Array(0);
        delete promiseCache[externalUri];
      }
      return bufferCache[externalUri];
    });
};

export default GltfFeatureMetadataCache;
