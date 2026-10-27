interface TizenApplicationInfo {
  id: string;
  name: string;
  iconPath: string;
  show: boolean;
}

interface TizenVideoSourceItem {
  type: string;
  number: number;
  signal: string;
}

interface TizenSystemInfo {
  getPropertyValue(
    property: string,
    success: (value: unknown) => void,
    error?: (e: unknown) => void,
  ): void;
  addPropertyValueChangeListener(property: string, cb: (value: unknown) => void): number;
}

declare const tizen: {
  application: {
    getAppsInfo(
      success: (apps: TizenApplicationInfo[]) => void,
      error?: (e: unknown) => void,
    ): void;
    launch(id: string, success?: () => void, error?: (e: unknown) => void): void;
    getCurrentApplication(): { hide(): void };
  };
  systeminfo: TizenSystemInfo;
};
