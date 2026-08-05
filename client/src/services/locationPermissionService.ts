import { Geolocation, type PermissionStatus } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export type LocationPermissionState = 'granted' | 'denied' | 'prompt' | 'permanently-denied' | 'disabled';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

class LocationPermissionService {
  private isNative: boolean;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Check current location permission status across Capacitor Android and Web browsers.
   */
  async checkPermissionStatus(): Promise<LocationPermissionState> {
    if (this.isNative) {
      try {
        const status: PermissionStatus = await Geolocation.checkPermissions();
        if (status.location === 'granted') {
          return 'granted';
        }
        if (status.location === 'denied') {
          return 'permanently-denied';
        }
        return 'prompt';
      } catch (err) {
        console.warn('[LocationPermissionService] Native checkPermissions error:', err);
      }
    }

    // Web fallback using Navigator permissions API
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'granted') return 'granted';
        if (status.state === 'denied') return 'denied';
        return 'prompt';
      } catch (e) {
        // Ignored fallback
      }
    }

    return 'prompt';
  }

  /**
   * Request Android runtime location permissions (FINE, COARSE, and optionally BACKGROUND).
   */
  async requestPermissions(): Promise<LocationPermissionState> {
    if (this.isNative) {
      try {
        const result = await Geolocation.requestPermissions();
        if (result.location === 'granted') {
          return 'granted';
        }
        if (result.location === 'denied') {
          return 'permanently-denied';
        }
        return 'denied';
      } catch (err) {
        console.error('[LocationPermissionService] Native requestPermissions failed:', err);
        return 'denied';
      }
    }

    // Web environment: Trigger permission prompt via getCurrentPosition
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve('disabled');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            resolve('denied');
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            resolve('disabled');
          } else {
            resolve('denied');
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  }

  /**
   * Safe method to fetch current position with full permission checks and error handling.
   */
  async getCurrentPosition(): Promise<LocationCoordinates> {
    const status = await this.checkPermissionStatus();
    if (status !== 'granted') {
      const newStatus = await this.requestPermissions();
      if (newStatus !== 'granted') {
        throw new Error(`Location permission not granted (${newStatus})`);
      }
    }

    if (this.isNative) {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 3000,
      });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
      };
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS location is unavailable on this device.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            reject(new Error('Location permission denied. Please allow access in browser/app settings.'));
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            reject(new Error('GPS service disabled. Please turn on device Location/GPS services.'));
          } else if (err.code === err.TIMEOUT) {
            reject(new Error('GPS position request timed out. Retrying...'));
          } else {
            reject(new Error('Unable to retrieve current location.'));
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 }
      );
    });
  }

  /**
   * Watch driver location continuously for active rides.
   */
  async watchPosition(
    onLocation: (coords: LocationCoordinates) => void,
    onError?: (error: Error) => void
  ): Promise<string> {
    if (this.isNative) {
      return await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 5000 },
        (position, err) => {
          if (err) {
            if (onError) onError(new Error(err.message));
            return;
          }
          if (position?.coords) {
            onLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: position.coords.heading,
              speed: position.coords.speed,
            });
          }
        }
      );
    }

    // Web fallback using navigator.geolocation.watchPosition
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        });
      },
      (err) => {
        if (onError) onError(new Error(err.message));
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );

    return watchId.toString();
  }

  /**
   * Clear location watch listener
   */
  async clearWatch(watchId: string): Promise<void> {
    if (this.isNative) {
      await Geolocation.clearWatch({ id: watchId });
    } else {
      navigator.geolocation.clearWatch(parseInt(watchId, 10));
    }
  }
}

export const locationPermissionService = new LocationPermissionService();
export default locationPermissionService;
