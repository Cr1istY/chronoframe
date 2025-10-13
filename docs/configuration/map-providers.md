# Map Providers

ChronoFrame supports two types of map providers. You can choose the one that best fits your needs.

| Provider              | Supported | Extra Configuration | Features                              |
| ---------------------- | :-------: | ------------------- | ------------------------------------- |
| [MapLibre](#maplibre) | ✅         | None                | Free and open-source, supports custom styles |
| [Mapbox](#mapbox)     | ✅         | Mapbox Access Token | Free tier, better renderer performance |

## MapLibre

To use MapLibre as the map provider, simply configure it as follows—no additional setup is required:

```bash
NUXT_PUBLIC_MAP_PROVIDER=maplibre
```

### Custom Styles

```bash
# ChronoFrame comes with built-in light and dark styles that switch automatically.
# If you configure a custom style, it will override the default styles.
# Example: https://demotiles.maplibre.org/globe.json
NUXT_PUBLIC_MAP_MAPLIBRE_STYLE=
```

## Mapbox

To use Mapbox as the map provider, you will need a [Mapbox Access Token](https://console.mapbox.com/account/access-tokens/).

```bash
NUXT_PUBLIC_MAP_PROVIDER=mapbox
NUXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
```

### Custom Styles

```bash
# If you configure a custom style, it will override the default styles.
# Example: mapbox://styles/mapbox/streets-v11
NUXT_PUBLIC_MAP_MAPBOX_STYLE=
```
