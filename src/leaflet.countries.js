(function (L) {
  'use strict';

  if (!L) {
    throw new Error('leaflet.countries requires Leaflet to be loaded first.');
  }

  function toUpperSafe(val) {
    return (val === null || val === undefined) ? '' : String(val).toUpperCase();
  }

  function resolve(val, feature, countryData) {
    return typeof val === 'function' ? val(feature, countryData) : val;
  }

  L.CountriesLayer = L.FeatureGroup.extend({
    options: {
      geoJsonUrl: null,
      geoJson: null,
      data: null,
      featureKey: function (feature) {
        var props = feature && feature.properties ? feature.properties : {};
        return toUpperSafe(props.ISO_A2 || props.ISO2 || props.iso2 || props.code || feature.id || '');
      },
      color: '#4a90e2',
      borderColor: '#555',
      fillOpacity: 1,
      weight: 1,
      labelColor: '#222',
      label: function (feature) {
        var props = feature && feature.properties ? feature.properties : {};
        return props.name || props.ADMIN || '';
      },
      popupContent: null,
      popupAction: 'click',
      labelMarkerOptions: {
        icon: null // Custom icon for label markers
      }
    },

    initialize: function (options) {
      L.FeatureGroup.prototype.initialize.call(this);
      L.setOptions(this, options);
      this._data = {};
      this.countries = this._data;
      this._geojson = null;
      this._ready = false;
      this._labelMarkers = {};

      var self = this;
      this._loadAll().then(function () {
        self._ready = true;
        if (self._map) self._render();
      });
    },

    onAdd: function (map) {
      L.FeatureGroup.prototype.onAdd.call(this, map);
      if (this._ready) this._render();
    },

    _loadAll: function () {
      var self = this;
      return Promise.all([
        this._loadGeoJson(),
        this._loadData(this.options.data)
      ]).then(function () { return self; });
    },

    _loadGeoJson: function () {
      var self = this;
      if (this.options.geoJson && this.options.geoJson.type === 'FeatureCollection') {
        this._geojson = this.options.geoJson;
        return Promise.resolve();
      }
      if (!this.options.geoJsonUrl) {
        return Promise.reject(new Error('Provide geoJson or geoJsonUrl.'));
      }
      return fetch(this.options.geoJsonUrl)
        .then(function (r) {
          if (!r.ok) throw new Error('Failed to fetch GeoJSON: ' + r.status);
          return r.json();
        })
        .then(function (json) { self._geojson = json; });
    },

    _loadData: function (data) {
      var self = this;
      if (!data) {
        this._data = {};
        return Promise.resolve();
      }
      if (typeof data === 'string') {
        return fetch(data)
          .then(function (r) {
            if (!r.ok) throw new Error('Failed to fetch data: ' + r.status);
            return r.json();
          })
          .then(function (payload) { self._indexData(payload); });
      }
      this._indexData(data);
      return Promise.resolve();
    },

    _indexData: function (input) {
      var idx = {};
      var map = input && input.countries && typeof input.countries === 'object' ? input.countries : input;
      if (map && typeof map === 'object') {
        for (var k in map) {
          if (Object.prototype.hasOwnProperty.call(map, k) && map[k] && typeof map[k] === 'object') {
            idx[toUpperSafe(k)] = map[k];
          }
        }
      }
      this._data = idx;
      this.countries = this._data;
    },

    _keyForFeature: function (feature) {
      return toUpperSafe(resolve(this.options.featureKey, feature, null));
    },

    _dataForFeature: function (feature) {
      return this._data[this._keyForFeature(feature)] || {};
    },

    _render: function () {
      var self = this;
      if (!this._geojson || !this._map) return;
      this.clearLayers();
      
      // Clear label markers
      for (var key in this._labelMarkers) {
        if (Object.prototype.hasOwnProperty.call(this._labelMarkers, key)) {
          var marker = this._labelMarkers[key];
          if (marker) this.removeLayer(marker);
        }
      }
      this._labelMarkers = {};

      L.geoJSON(this._geojson, {
        style: function (feature) {
          var cd = self._dataForFeature(feature);
          return {
            color: cd.borderColor || resolve(self.options.borderColor, feature, cd) || '#555',
            weight: self.options.weight,
            fillColor: cd.color || resolve(self.options.color, feature, cd) || '#4a90e2',
            fillOpacity: (cd.fillOpacity !== undefined && cd.fillOpacity !== null) ? cd.fillOpacity : self.options.fillOpacity
          };
        },
        onEachFeature: function (feature, layer) {
          self._configureFeature(feature, layer);
          self.addLayer(layer);
        }
      });

      this.fire('rendered', { layerCount: this.getLayers().length });
    },

    _configureFeature: function (feature, layer) {
      var cd = this._dataForFeature(feature);
      var popup = (cd.popupContent !== undefined && cd.popupContent !== null)
        ? cd.popupContent
        : resolve(this.options.popupContent, feature, cd);
      if (popup && this.options.popupAction) {
        layer.bindPopup(popup, { maxWidth: 320 });
      }
      var label = (cd.label !== undefined && cd.label !== null)
        ? cd.label
        : resolve(this.options.label, feature, cd);
      if (label) {
        var labelColor = cd.labelColor || this.options.labelColor;
        
        // Check if a custom label position is specified
        if (cd.labelLatLng) {
          this._createLabelMarker(feature, cd, label, labelColor);
        } else {
          // Default: place label at center of feature
          layer.bindTooltip('<span style="color:' + labelColor + '">' + label + '</span>', {
            permanent: true,
            direction: 'center',
            className: 'us-states-label',
            interactive: false,
            opacity: 1
          });
        }
      }
    },

    _createLabelMarker: function (feature, countryData, labelText, labelColor) {
      if (!this._map) return;
      var key = this._keyForFeature(feature);
      if (this._labelMarkers[key]) return;
      var latLng = countryData.labelLatLng;
      var lat, lng;
      
      // Support both [lat, lng] and {lat, lng} formats
      if (Array.isArray(latLng)) {
        lat = latLng[0];
        lng = latLng[1];
      } else if (typeof latLng === 'object' && latLng.lat !== undefined && latLng.lng !== undefined) {
        lat = latLng.lat;
        lng = latLng.lng;
      } else {
        return; // Invalid format
      }
      
      // Create a marker with a transparent icon that displays the label
      var markerOptions = Object.assign({}, this.options.labelMarkerOptions);
      if (!markerOptions.icon) {
        markerOptions.icon = L.divIcon({
          html: '',
          iconSize: [0, 0],
          className: 'label-marker-invisible'
        });
      }
      
      var marker = L.marker([lat, lng], markerOptions);
      
      // Add tooltip with the label text
      marker.bindTooltip('<span style="color:' + labelColor + '">' + labelText + '</span>', {
        permanent: true,
        direction: 'center',
        className: 'us-states-label',
        interactive: false,
        opacity: 1
      });
      
      this._labelMarkers[key] = marker;
      this.addLayer(marker);
    },

    setData: function (data) {
      var self = this;
      this.options.data = data;
      this._loadData(data).then(function () {
        if (self._map && self._ready) self._render();
      });
    },

    getCountries: function () {
      return this._data;
    },

    setCountry: function (code, patch) {
      var k = toUpperSafe(code);
      if (!k) return;
      this._data[k] = Object.assign({}, this._data[k] || {}, patch || {});
      if (this._labelMarkers[k]) {
        this.removeLayer(this._labelMarkers[k]);
        delete this._labelMarkers[k];
      }
      if (this._map && this._ready) this._render();
    },

    refresh: function () {
      if (this._map && this._ready) this._render();
    }
  });

  L.countriesLayer = function (options) {
    return new L.CountriesLayer(options);
  };
}(window.L));
