# leaflet.countries

A Leaflet plugin for world country maps with GeoJSON boundaries, ISO-keyed data binding, and interactive labels.

## Demo Pages

- **[demo/index.html](https://ericdalnas.github.io/leaflet.countries/demo/index.html)** — World map colored by continent using Natural Earth data.
- **[demo/manual-labels.html](https://ericdalnas.github.io/leaflet.countries/demo/manual-labels.html)** — Manual label placement demo for countries with complex geometries.

## Browser usage

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="./src/leaflet.countries.js"></script>
```

## Usage

```js
var layer = L.countriesLayer({
  geoJsonUrl: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
  featureKey: function (feature) {
    return String(feature.properties.ISO_A2 || '').toUpperCase();
  },
  label: function (feature) {
    return feature.properties.NAME || feature.properties.ADMIN || '';
  },
  data: {
    US: { color: '#0047ff', popupContent: '<b>United States</b>' },
    CA: { color: '#d40000', popupContent: '<b>Canada</b>' }
  }
}).addTo(map);
```

## Data Properties

Each country in the `data` object supports the following properties:

- `color` - Fill color of the country
- `borderColor` - Border color (default: `#555`)
- `fillOpacity` - Fill opacity (default: `1`)
- `label` - Custom label text
- `labelColor` - Label text color
- `labelLatLng` - **Manual label placement** - coordinates where the label should appear instead of at the feature center. Accepts either `[lat, lng]` array format or `{lat: lat, lng: lng}` object format.
- `popupContent` - HTML content for popup
- `popupAction` - When popup opens: `'click'` (default) or `'hover'`

## Manual Label Placement

For countries with complex geometries or scattered territories (like Spain with territories in Africa), you can manually specify where the label should appear using `labelLatLng`:

```js
var layer = L.countriesLayer({
  geoJsonUrl: '...',
  data: {
    ES: {
      color: '#ff9500',
      labelLatLng: [39.5, -3.7],  // Place label over mainland Spain
      popupContent: '<b>Spain</b>'
    },
    US: {
      color: '#0047ff',
      labelLatLng: { lat: 39.8283, lng: -98.5795 }  // Geographic center
    }
  }
}).addTo(map);
```

## Data Sources

The demos use **Natural Earth 1:110m Admin 0 Countries** GeoJSON, which is in the **public domain**.

> Made with Natural Earth. Free vector and raster map data @ [naturalearthdata.com](https://www.naturalearthdata.com/).

Relevant field names in the Natural Earth dataset:
- `ISO_A2` — 2-letter ISO 3166-1 alpha-2 country code
- `NAME` — common country name
- `ADMIN` — administrative name
- `CONTINENT` — continent name

Some records use `ISO_A2 = "-99"` — notably France and Norway, whose overseas territories complicate ISO assignment. Natural Earth provides `ISO_A2_EH` ("edit hack") which supplies the correct code for those sovereign countries. A second quirk is that dependencies and territories (French Guiana, Greenland, etc.) are separate features with `TYPE = "Dependency"` — allowing `ISO_A2_EH` to fall through for them would mislabel them as their sovereign (e.g. French Guiana appearing as France).

The recommended helper pattern checks `TYPE` before using the EH fallback:

```js
function neIso2(props) {
  var a2 = props.ISO_A2 || '';
  if (a2 === '-99') {
    var type = props.TYPE || '';
    if (type === 'Sovereign country' || type === 'Country') a2 = props.ISO_A2_EH || '';
  }
  return String(a2).toUpperCase();
}

function keepIsoCountryFeatures(geojson) {
  geojson.features = geojson.features.filter(function (feature) {
    return /^[A-Z]{2}$/.test(neIso2(feature.properties || {}));
  });
  return geojson;
}
```

`TYPE = "Country"` covers de facto independent countries like Kosovo and Taiwan that lack full UN recognition.
