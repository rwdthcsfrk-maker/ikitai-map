type DirectionsInput = {
  lat?: number;
  lng?: number;
  address?: string | null;
  placeId?: string | null;
};

export const buildDirectionsUrl = ({ lat, lng, address, placeId }: DirectionsInput) => {
  if (typeof lat === "number" && typeof lng === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  if (placeId) {
    return `https://www.google.com/maps/dir/?api=1&destination_place_id=${encodeURIComponent(placeId)}`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return undefined;
};
