/*!
 * leaflet.countries — extends leaflet.regions
 * Requires leaflet.regions to be loaded first.
 */
(function (L) {
  'use strict';

  if (!L || !L.RegionsLayer) {
    throw new Error('leaflet.countries requires leaflet.regions to be loaded first.');
  }

  function toUpperSafe(val) {
    return (val === null || val === undefined) ? '' : String(val).toUpperCase();
  }

  function syncCountryAliases(layer) {
    layer.countries = layer._data;
  }

  L.CountriesLayer = L.RegionsLayer.extend({
    options: {
      featureKey: function (feature) {
        var props = feature && feature.properties ? feature.properties : {};
        var a2 = toUpperSafe(props.ISO_A2 || props.ISO2 || props.iso2 || props.code || feature.id || '');
        // Natural Earth uses "-99" for countries missing ISO_A2; fall back to ISO_A2_EH.
        if (a2 === '-99' || a2 === '') {
          a2 = toUpperSafe(props.ISO_A2_EH || '');
        }
        return a2;
      },
      labelColor: '#222',
      label: function (feature) {
        var props = feature && feature.properties ? feature.properties : {};
        return props.name || props.ADMIN || '';
      }
    },

    initialize: function (options) {
      L.RegionsLayer.prototype.initialize.call(this, options);
      syncCountryAliases(this);
    },

    // Support { countries: { US: {...} } } wrapper in addition to base { regions: {...} }
    _indexData: function (input) {
      if (input && typeof input === 'object' && !Array.isArray(input) &&
          input.countries && typeof input.countries === 'object') {
        L.RegionsLayer.prototype._indexData.call(this, input.countries);
      } else {
        L.RegionsLayer.prototype._indexData.call(this, input);
      }
      syncCountryAliases(this);
    },

    setData: function (data) {
      L.RegionsLayer.prototype.setData.call(this, data);
      syncCountryAliases(this);
    },

    getCountries: function () {
      return this.getRegions();
    },

    setCountry: function (code, patch) {
      this.setRegion(code, patch);
      syncCountryAliases(this);
    }
  });

  L.countriesLayer = function (options) {
    return new L.CountriesLayer(options);
  };
}(window.L));
