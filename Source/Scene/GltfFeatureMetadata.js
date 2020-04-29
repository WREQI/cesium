import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import GltfFeatureTable from "./GltfFeatureTable.js";

/**
 * Internal representation of the glTF feature metadata extension: EXT_3dtiles_feature_metadata.
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.gltf The glTF JSON object.
 * @param {Object} options.featureMetadata The feature metadata JSON object.
 * @param {GltfFeatureMetadataCache} options.cache The feature metadata cache.
 *
 * @alias GltfFeatureMetadata
 * @constructor
 *
 * @private
 */
function GltfFeatureMetadata(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltf = options.gltf;
  var featureMetadata = options.featureMetadata;
  var cache = options.cache; // TODO : owned by tileset

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltf", gltf);
  Check.typeOf.object("options.featureMetadata", featureMetadata);
  Check.typeOf.object("options.cache", cache);
  //>>includeEnd('debug');

  var featureTables = featureMetadata.featureTables;
  featureTables = featureTables.forEach(function (featureTable) {
    return new GltfFeatureTable({
      gltf: gltf,
      featureTable: featureTable,
      cache: cache,
    });
  });

  this._featureTables = featureTables;
}

export default GltfFeatureMetadata;
