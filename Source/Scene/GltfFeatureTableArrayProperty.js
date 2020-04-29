import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import GltfFeatureTablePropertyType from "./GltfFeatureTablePropertyType.js";

/**
 * A feature table array property.
 * <p>
 * Implements the {@link GltfFeatureTableProperty} interface.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON object.
 * @param {String} options.name The name of the property.
 * @param {Object} options.property The feature property JSON object from the glTF.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureTableArrayProperty
 * @constructor
 *
 * @private
 */
function GltfFeatureTableArrayProperty(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var name = options.name;
  var property = options.property;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.string("options.name", name);
  Check.typeOf.object("options.property", property);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var array = property.array;
  var external = array.external;

  var that = this;
  if (defined(external)) {
    cache.getExternalValues(array.external).then(function (values) {
      that._values = values;
      that._fromCache = true;
    });
  }

  // Clone so that this object doesn't hold on to a reference to the gltf JSON
  var values = clone(array.values, true);
  var extras = clone(property.extras, true);

  this._values = values;
  this._fromCache = false;
  this._name = name;
  this._semantic = property.semantic;
  this._type = GltfFeatureTablePropertyType.getTypeFromArrayType(array.type);
  this._extras = extras;
}

Object.defineProperties(GltfFeatureTableArrayProperty.prototype, {
  /**
   * @inheritdoc GltfFeatureTableProperty#name
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * @inheritdoc GltfFeatureTableProperty#name
   */
  semantic: {
    get: function () {
      return this._semantic;
    },
  },

  /**
   * @inheritdoc GltfFeatureTableProperty#name
   */
  type: {
    get: function () {
      return this._type;
    },
  },

  /**
   * @inheritdoc GltfFeatureTableProperty#name
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },
});

/**
 * Get the property value of a feature.
 *
 * @param {Number} featureId The feature ID.
 * @returns {*} The value. A value of the array's type is returned, which may be a string, number, boolean, or any other valid JSON type.
 *
 * @private
 */
GltfFeatureTableArrayProperty.prototype.getValue = function (featureId) {
  var values = this._values;

  if (!defined(values)) {
    return undefined;
  }

  return clone(values[featureId], true);
};

/**
 * Set the property value of a feature.
 *
 * @param {Number} featureId The feature ID.
 * @param {*} value The value. The value must be of the array's type, which may be a string, number, boolean, or any other valid JSON type.
 *
 * @private
 */
GltfFeatureTableArrayProperty.prototype.setValue = function (featureId, value) {
  var values = this._values;
  var fromCache = this._fromCache;

  if (!defined(values)) {
    return;
  }

  if (fromCache) {
    // Clone on demand if modifying values that are in the cache
    values = clone(values, true);
    this._values = values;
    this._fromCache = false;
  }

  values[featureId] = clone(value, true);
};

export default GltfFeatureTableArrayProperty;
