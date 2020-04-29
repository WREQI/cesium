import destroyObject from "../Core/destroyObject.js";
import RequestType from "../Core/RequestType.js";
import Pass from "../Renderer/Pass.js";
import parseGlb from "../ThirdParty/GltfPipeline/parseGlb.js";
import when from "../ThirdParty/when.js";
import Axis from "./Axis.js";
import Model from "./Model.js";

/**
 * Represents the contents of a glTF or glb tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification|3D Tiles} tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias Gltf3DTileContent
 * @constructor
 *
 * @private
 */
function Gltf3DTileContent(options) {
  this._tileset = options.tileset;
  this._tile = options.tile;
  this._resource = options.resource;
  this._model = undefined;
  this._featureMetadata = undefined;
  this._readyPromise = when.defer();

  this.featurePropertiesDirty = false;

  initialize(this, options.gltf);
}

Object.defineProperties(Gltf3DTileContent.prototype, {
  trianglesLength: {
    get: function () {
      return 0;
    },
  },

  geometryByteLength: {
    get: function () {
      return 0;
    },
  },

  texturesByteLength: {
    get: function () {
      return 0;
    },
  },

  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  tileset: {
    get: function () {
      return this._tileset;
    },
  },

  tile: {
    get: function () {
      return this._tile;
    },
  },

  url: {
    get: function () {
      return this._resource.getUrlComponent(true);
    },
  },
});

function getVertexShaderCallback(content) {
  return function (vs, programId) {
    var featureTable = content._batchTable;
    var handleTranslucent = !defined(content._tileset.classificationType);

    var gltf = content._model.gltf;
    if (defined(gltf)) {
      content._featureIdAttributeName = getFeatureIdAttributeName(gltf);
      content._diffuseAttributeOrUniformName[
        programId
      ] = ModelUtility.getDiffuseAttributeOrUniform(gltf, programId);
    }

    var callback = batchTable.getVertexShaderCallback(
      handleTranslucent,
      content._featureIdAttributeName,
      content._diffuseAttributeOrUniformName[programId]
    );
    return defined(callback) ? callback(vs) : vs;
  };
}

function initialize(content, gltf) {
  if (gltf instanceof Uint8Array) {
    // Binary glTF
    gltf = parseGlb(gltf);
  }

  var tileset = content._tileset;
  var tile = content._tile;
  var resource = content._resource;

  var pickObject = {
    content: content,
    primitive: tileset,
  };

  content._model = new Model({
    gltf: gltf,
    cull: false, // The model is already culled by 3D Tiles
    releaseGltfJson: true, // Models are unique and will not benefit from caching so save memory
    opaquePass: Pass.CESIUM_3D_TILE, // Draw opaque portions of the model during the 3D Tiles pass
    basePath: resource,
    requestType: RequestType.TILES3D,
    modelMatrix: tile.computedTransform,
    upAxis: Axis.Y,
    forwardAxis: Axis.X,
    shadows: tileset.shadows,
    debugWireframe: tileset.debugWireframe,
    incrementallyLoadTextures: false,
    vertexShaderLoaded: getVertexShaderCallback(content),
    fragmentShaderLoaded: getFragmentShaderCallback(content),
    uniformMapLoaded: batchTable.getUniformMapCallback(),
    pickIdLoaded: getPickIdCallback(content),
    addFeatureIdToGeneratedShaders: batchLength > 0, // If the batch table has values in it, generated shaders will need a batchId attribute
    pickObject: pickObject,
    imageBasedLightingFactor: tileset.imageBasedLightingFactor,
    lightColor: tileset.lightColor,
    luminanceAtZenith: tileset.luminanceAtZenith,
    sphericalHarmonicCoefficients: tileset.sphericalHarmonicCoefficients,
    specularEnvironmentMaps: tileset.specularEnvironmentMaps,
  });
}

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Gltf3DTileContent</code>
 * always returns <code>false</code> since a tile of this type does not have any features.
 */
Gltf3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

/**
 * Part of the {@link Cesium3DTileContent} interface.  <code>Gltf3DTileContent</code>
 * always returns <code>undefined</code> since a tile of this type does not have any features.
 */
Gltf3DTileContent.prototype.getFeature = function (batchId) {
  return undefined;
};

Gltf3DTileContent.prototype.applyDebugSettings = function (enabled, color) {};

Gltf3DTileContent.prototype.applyStyle = function (style) {};

Gltf3DTileContent.prototype.update = function (tileset, frameState) {};

Gltf3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Gltf3DTileContent.prototype.destroy = function () {
  return destroyObject(this);
};

export default Gltf3DTileContent;
