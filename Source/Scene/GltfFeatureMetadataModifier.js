import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";

/**
 * Implementation of the glTF feature metadata extension: EXT_3dtiles_feature_metadata.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.model The model.
 * @param {Object} options.featureMetadata The feature metadata.
 * @param {ClassificationType} options.classificationType Determines whether terrain, 3D Tiles or both will be classified by this model. May be <code>undefined</code>.
 *
 * @alias GltfFeatureMetadataModifier
 * @constructor
 *
 * @private
 */
function GltfFeatureMetadataModifier(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var model = options.model;
  var featureMetadata = options.featureMetadata;
  var classificationType = options.classificationType;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.model", model);
  Check.typeOf.object("options.featureMetadata", featureMetadata);
  //>>includeEnd('debug');

  this._model = model;
  this._featureMetadata = featureMetadata;
  this._classificationType = classificationType;
}

function getFeatureIdAttributeName(gltf) {
  return ModelUtility.getAttributeOrUniformBySemantic(gltf, "_FEATURE_ID_0");
}

GltfFeatureMetadataModifier.prototype.modifyVertexShader = function (
  gltf,
  vertexShader,
  programId
) {
  var featureMetadata = this._featureMetadata;
  var classificationType = this._classificationType;
  var handleTranslucent = !defined(classificationType);

  var featureIdAttributeName = getFeatureIdAttributeName(gltf); // TODO: would gltf ever be undefined?
  var diffuseAttributeOrUniformName = ModelUtility.getDiffuseAttributeOrUniform(
    gltf,
    programId
  );

  var callback = batchTable.getVertexShaderCallback(
    handleTranslucent,
    content._featureIdAttributeName,
    content._diffuseAttributeOrUniformName[programId]
  );
  return defined(callback) ? callback(vs) : vs;
};

function getVertexShaderCallback(content) {
  return function (vs, programId) {};
}

function getFragmentShaderCallback(content) {
  return function (fs, programId) {
    var batchTable = content._batchTable;
    var handleTranslucent = !defined(content._tileset.classificationType);

    var gltf = content._model.gltf;
    if (defined(gltf)) {
      content._diffuseAttributeOrUniformName[
        programId
      ] = ModelUtility.getDiffuseAttributeOrUniform(gltf, programId);
    }
    var callback = batchTable.getFragmentShaderCallback(
      handleTranslucent,
      content._diffuseAttributeOrUniformName[programId]
    );
    return defined(callback) ? callback(fs) : fs;
  };
}

function getPickIdCallback(content) {
  return function () {
    return content._batchTable.getPickId();
  };
}

Cesium3DTileBatchTable.prototype.getUniformMapCallback = function () {
  if (this.featuresLength === 0) {
    return;
  }

  var that = this;
  return function (uniformMap) {
    var batchUniformMap = {
      tile_batchTexture: function () {
        // PERFORMANCE_IDEA: we could also use a custom shader that avoids the texture read.
        return defaultValue(that._batchTexture, that._defaultTexture);
      },
      tile_textureDimensions: function () {
        return that._textureDimensions;
      },
      tile_textureStep: function () {
        return that._textureStep;
      },
      tile_colorBlend: function () {
        return getColorBlend(that);
      },
      tile_pickTexture: function () {
        return that._pickTexture;
      },
    };

    return combine(uniformMap, batchUniformMap);
  };
};

export default GltfFeatureMetadataModifier;
