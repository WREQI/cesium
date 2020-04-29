import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import GltfFeature from "./GltfFeature.js";
import GltfFeatureTableArrayProperty from "./GltfFeatureTableArrayProperty.js";
import GltfFeatureTableBinaryProperty from "./GltfFeatureTableBinaryProperty.js";
import GltfFeatureTableDescriptorProperty from "./GltfFeatureTableDescriptorProperty.js";
import GltfFeatureTablePropertyType from "./GltfFeatureTablePropertyType.js";

/**
 * A feature table within the the glTF feature metadata extension.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON object.
 * @param {Object} options.featureTable The feature table JSON object from the glTF.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureTable
 * @constructor
 *
 * @private
 */
function GltfFeatureTable(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var featureTable = options.featureTable;
  var cache = options.cache;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.featureTable", featureTable);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var properties = {};
  var featureProperties = featureTable.featureProperties;
  for (var name in featureProperties) {
    if (featureProperties.hasOwnProperty(name)) {
      var property = featureProperties[name];
      if (defined(property.descriptor)) {
        properties[name] = new GltfFeatureTableDescriptorProperty({
          gltf: gltf,
          name: name,
          property: property,
          cache: cache,
        });
      } else if (defined(property.accessor)) {
        properties[name] = new GltfFeatureTableBinaryProperty({
          gltf: gltf,
          name: name,
          property: property,
          cache: cache,
        });
      } else {
        properties[name] = new GltfFeatureTableArrayProperty({
          gltf: gltf,
          name: name,
          property: property,
          cache: cache,
        });
      }
    }
  }

  this._features = undefined;
  this._properties = properties;
  this._featureCount = featureTable.featureCount;
  this._name = featureTable.name;
  this._extras = clone(featureTable.extras, true); // Clone so that this object doesn't hold on to a reference to the gltf JSON
}

Object.defineProperties(GltfFeatureTable.prototype, {
  /**
   * The feature table properties.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {Object.<String, GltfFeatureTableProperty>}
   * @readonly
   * @private
   */
  properties: {
    get: function () {
      return this._properties;
    },
  },

  /**
   * The number of features in the feature table.
   * <code>featureCount</code> is undefined if the feature table is a descriptor table.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {Number|undefined}
   * @readonly
   * @private
   */
  featureCount: {
    get: function () {
      return this._featureCount;
    },
  },

  /**
   * The name of the feature table.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {String}
   * @readonly
   * @private
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * Extras in the feature table JSON object from the glTF.
   *
   * @memberof GltfFeatureTable.prototype
   * @type {*}
   * @readonly
   * @private
   */
  extras: {
    get: function () {
      return this._extras;
    },
  },
});

function checkFeatureId(featureId, featureCount) {
  if (!defined(featureCount) || featureId < 0 || featureId > featureCount) {
    var maximumFeatureId = featureCount - 1;
    throw new DeveloperError(
      "featureId must be between zero and featureCount - 1 (" +
        maximumFeatureId +
        ")."
    );
  }
}

function createFeatures(featureTable) {
  var featureCount = featureTable.featureCount;
  if (!defined(featureTable._features)) {
    var features = new Array(featureCount);
    for (var i = 0; i < featureCount; ++i) {
      features[i] = new GltfFeature(featureTable, i);
    }
    featureTable._features = features;
  }
}

/**
 * Returns the {@link GltfFeature} object for the feature with the
 * given <code>featureId</code>. This object is used to get and modify the
 * feature's properties.
 * <p>
 * Features in a tile are ordered by <code>featureId</code>, an index used to retrieve their metadata from the feature table.
 * </p>
 *
 * @param {Number} featureId The featureId for the feature.
 * @returns {GltfFeature} The corresponding {@link GltfFeature} object.
 *
 * @throws {DeveloperError} if <code>featureId<code> is not between zero and {@link GltfFeatureTable#featureCount} - 1.
 */
GltfFeatureTable.prototype.getFeature = function (featureId) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("featureId", featureId);
  checkFeatureId(featureId, this._featureCount);
  //>>includeEnd('debug')

  createFeatures(this);
  return this._features[featureId];
};

/**
 * Get the property value of a feature.
 * <p>
 * If the property is normalized, integer data values will be normalized to [0, 1]
 * for unsigned types or [-1, 1] for signed types before being returned.
 * </p>
 *
 * @param {Number} featureId The feature ID.
 * @param {String} name The property name.
 * @param {Cartesian2|Cartesian3|Cartesian4|Matrix2|Matrix3|Matrix4} [result] The object into which to store
 * the result for vector and matrix properties. The <code>result</code> argument is ignored for all other properties.
 * @returns {*} The value. The type of the returned value corresponds with the property's <code>type</code>.
 * For vector and matrix properties the returned object is the modified result parameter or a new instance if one was not provided
 * and may be a {@link Cartesian2}, {@link Cartesian3}, {@link Cartesian4}, {@link Matrix2}, {@link Matrix3}, or {@link Matrix4}.
 * For scalar properties a number is returned.
 * For array properties a value of the array's type is returned, which may be a string, number, boolean, or any other valid JSON type.
 *
 * @throws {DeveloperError} if <code>featureId<code> is not between zero and {@link GltfFeatureTable#featureCount} - 1.
 * @throws {DeveloperError} if the feature table does not have a property with the specified name.
 * @throws {DeveloperError} if <code>result</code>'s type doesn't match the property's type.
 *
 * @private
 */
GltfFeatureTable.prototype.getPropertyValue = function (
  featureId,
  name,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("featureId", featureId);
  Check.typeOf.string("name", name);
  checkFeatureId(featureId, this._featureCount);
  //>>includeEnd('debug');

  var property = this._properties[name];

  //>>includeStart('debug', pragmas.debug);
  if (!defined(property)) {
    throw new DeveloperError(
      'The feature table does not have a property with the name "' + name + '".'
    );
  }
  if (defined(result)) {
    var type = property.type;
    if (
      type === GltfFeatureTablePropertyType.VEC2 &&
      !(result instanceof Cartesian2)
    ) {
      throw new DeveloperError("result must be a Cartesian2");
    } else if (
      type === GltfFeatureTablePropertyType.VEC3 &&
      !(result instanceof Cartesian3)
    ) {
      throw new DeveloperError("result must be a Cartesian3");
    } else if (
      type === GltfFeatureTablePropertyType.VEC4 &&
      !(result instanceof Cartesian4)
    ) {
      throw new DeveloperError("result must be a Cartesian4");
    } else if (
      type === GltfFeatureTablePropertyType.MAT2 &&
      !(result instanceof Matrix2)
    ) {
      throw new DeveloperError("result must be a Matrix2");
    } else if (
      type === GltfFeatureTablePropertyType.MAT3 &&
      !(result instanceof Matrix3)
    ) {
      throw new DeveloperError("result must be a Matrix3");
    } else if (
      type === GltfFeatureTablePropertyType.MAT4 &&
      !(result instanceof Matrix4)
    ) {
      throw new DeveloperError("result must be a Matrix4");
    }
  }
  //>>includeEnd('debug');

  return property.getValue(featureId, result);
};

/**
 * Set the property value of a feature.
 * <p>
 * If the property is normalized, integer data values should be normalized to [0, 1]
 * for unsigned types or [-1, 1] for signed types before being passed to <code>setPropertyValue</code>.
 * </p>
 *
 * @param {Number} featureId The feature ID.
 * @param {String} name The property name.
 * @param {*} value The value. The type of the value corresponds with the property's <code>type</code>.
 * For vector and matrix properties the value may be a {@link Cartesian2}, {@link Cartesian3}, {@link Cartesian4}, {@link Matrix2}, {@link Matrix3}, or {@link Matrix4}.
 * For scalar properties the value is a number.
 * For array properties the value must be of the array's type, which may be a string, number, boolean, or any other valid JSON type.
 *
 * @throws {DeveloperError} if <code>featureId<code> is not between zero and featureCount - 1.
 * @throws {DeveloperError} if the feature table does not have a property with the specified name.
 * @throws {DeveloperError} if <code>value</code>'s type doesn't match the property's type.
 *
 * @private
 */
GltfFeatureTable.prototype.setPropertyValue = function (
  featureId,
  name,
  value
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("featureId", featureId);
  Check.typeOf.string("name", name);
  checkFeatureId(featureId, this._featureCount);
  //>>includeEnd('debug');

  var property = this._properties[name];

  //>>includeStart('debug', pragmas.debug);
  if (!defined(property)) {
    throw new DeveloperError(
      'The feature table does not have a property with the name "' + name + '".'
    );
  }
  var type = property.type;
  if (
    type === GltfFeatureTablePropertyType.VEC2 &&
    !(value instanceof Cartesian2)
  ) {
    throw new DeveloperError("value must be a Cartesian2");
  } else if (
    type === GltfFeatureTablePropertyType.VEC3 &&
    !(value instanceof Cartesian3)
  ) {
    throw new DeveloperError("value must be a Cartesian3");
  } else if (
    type === GltfFeatureTablePropertyType.VEC4 &&
    !(value instanceof Cartesian4)
  ) {
    throw new DeveloperError("value must be a Cartesian4");
  } else if (
    type === GltfFeatureTablePropertyType.MAT2 &&
    !(value instanceof Matrix2)
  ) {
    throw new DeveloperError("value must be a Matrix2");
  } else if (
    type === GltfFeatureTablePropertyType.MAT3 &&
    !(value instanceof Matrix3)
  ) {
    throw new DeveloperError("value must be a Matrix3");
  } else if (
    type === GltfFeatureTablePropertyType.MAT4 &&
    !(value instanceof Matrix4)
  ) {
    throw new DeveloperError("value must be a Matrix4");
  } else if (
    type === GltfFeatureTablePropertyType.STRING &&
    typeof value !== "string"
  ) {
    throw new DeveloperError("value must be a string");
  } else if (
    type === GltfFeatureTablePropertyType.NUMBER &&
    typeof value !== "number"
  ) {
    throw new DeveloperError("value must be a number");
  } else if (
    type === GltfFeatureTablePropertyType.BOOLEAN &&
    typeof value !== "boolean"
  ) {
    throw new DeveloperError("value must be a boolean");
  }
  //>>includeEnd('debug');

  return property.setValue(featureId, value);
};

export default GltfFeatureTable;
