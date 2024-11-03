export enum DroneModelEnum {
  LightWeight = 'LightWeight',
  Middleweight = 'Middleweight',
  Cruiserweight = 'Cruiserweight',
  Heavyweight = 'Heavyweight',
}

export enum DroneStates {
  Idle = 'IDLE',
  Loading = 'LOADING',
  Loaded = 'LOADED',
  Delivering = 'DELIVERING',
  Delivered = 'DELIVERED',
  Returning = 'RETURNING',
}

export enum AlertTypes {
  LowBattery = 'LOW_BATTERY',
  CriticalBattery = 'CRITICAL_BATTERY',
  Normal = 'NORMAL',
}