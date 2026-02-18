import { api } from './api';
import type { ApiResponse } from './types';

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  formattedAddress: string;
  location: MapPoint;
}

export interface OcularFeePreview {
  route: {
    distanceKm: number;
    durationMinutes: number;
  };
  fee: {
    label: string;
    isWithinNCR: boolean;
    baseFee: number;
    baseCoveredKm: number;
    perKmRate: number;
    additionalDistanceKm: number;
    additionalFee: number;
    total: number;
  };
  config: {
    shopLatitude: number;
    shopLongitude: number;
  };
}

export async function fetchOcularFeePreview(location: MapPoint): Promise<OcularFeePreview> {
  const { data } = await api.post<ApiResponse<OcularFeePreview>>('/maps/compute-fee', location);
  return data.data;
}

export async function reverseGeocodeLocation(location: MapPoint): Promise<string> {
  const { data } = await api.post<ApiResponse<{ formattedAddress: string }>>(
    '/maps/reverse-geocode',
    location,
  );
  return data.data.formattedAddress;
}

export async function searchMapPlaces(input: string): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  if (!query) return [];
  const { data } = await api.get<ApiResponse<PlaceSuggestion[]>>('/maps/autocomplete', {
    params: { input: query },
  });
  return data.data;
}
