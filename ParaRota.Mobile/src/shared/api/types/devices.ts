export type DevicePlatform = 'web' | 'ios' | 'android';

export interface RegisterDeviceTokenRequest {
  token: string;
  platform: DevicePlatform;
}
