export type Koordinata = { latitude: number; longitude: number };

export function koordinataTeVlefshme(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function lidhjaGoogleMaps({ latitude, longitude }: Koordinata) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}
